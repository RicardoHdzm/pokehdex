/* ============================================================
   COMPARAR PERFILES PARA CUADRAR INTERCAMBIOS
   ------------------------------------------------------------
   El cruce lo hace Postgres con la funcion trade_matches del
   esquema: devuelve, en las dos direcciones, lo que uno tiene y
   al otro le falta. Aqui solo se agrupa y se pinta.
   ============================================================ */

let perfilesCache = null;
let amigosCache = null;      // los mutuos, que son con los que se compara
let cruceActual = null;      // { el_me_da: [], yo_le_doy: [] }
let crucesCache = null;      // Map<idPerfil, cruce>, uno por amigo
let compShiny = false;
let compGen = "todas";

/* Nombre e imagen de cualquier id, sea especie o forma regional */
let CATALOGO_IDS = null;     // Map<id, { nombre, base, generacion }>

async function construirCatalogo() {
  if (CATALOGO_IDS) return CATALOGO_IDS;

  const [especies, variantes] = await Promise.all([fetchSpecies(), fetchVariantes()]);
  const mapa = new Map();

  for (const seccion of TEAMS) {
    if (seccion.hall || seccion.soloEquipo || seccion.nacional) continue;
    for (const e of entradasDe(seccion, especies, variantes)) {
      mapa.set(e.id, { nombre: e.nombre, base: e.base || e.id, generacion: seccion.generation });
    }
  }

  CATALOGO_IDS = mapa;
  return mapa;
}

/* ---------- Datos ---------- */

/* Lo minimo para que la pagina funcione, y lo que se añadio despues */
const COLUMNAS_PERFIL = "id, handle, display_name";
const COLUMNAS_EXTRA = "friend_code, champions_id, favourite_ball";

async function cargarPerfiles() {
  if (perfilesCache) return perfilesCache;

  let { data, error } = await sb
    .from("profiles")
    .select(COLUMNAS_PERFIL + ", " + COLUMNAS_EXTRA)
    .order("handle");

  /* 42703 es "esa columna no existe": la base va por detras del codigo.
     Mejor enseñar los perfiles sin los extras que no enseñar ninguno. */
  if (error && error.code === "42703") {
    console.warn("Faltan columnas en profiles, se piden las basicas:", error.message);
    ({ data, error } = await sb.from("profiles").select(COLUMNAS_PERFIL).order("handle"));
  }

  if (error) { console.warn("perfiles:", error.message); return []; }
  perfilesCache = data.filter((p) => p.id !== sesion.user.id);
  return perfilesCache;
}

async function cruzarCon(otroId) {
  const { data, error } = await sb.rpc("trade_matches", {
    yo: sesion.user.id,
    otro: otroId
  });

  if (error) return { error: error.message };

  const cruce = { el_me_da: [], yo_le_doy: [] };
  data.forEach((f) => {
    (cruce[f.direccion] || []).push({ id: f.dex_id, shiny: f.shiny });
  });
  return cruce;
}

/* Cruza contra todos los perfiles de golpe. Es lo que alimenta el ranking,
   y de paso deja cada cruce guardado: al elegir a alguien del desplegable ya
   no hay que volver a preguntarle a la base. */
async function cruzarConTodos(perfiles) {
  /* Se rehace en cada apertura: entre una y otra puedes haber agregado gente */
  const cruces = await Promise.all(perfiles.map((p) => cruzarCon(p.id)));

  crucesCache = new Map();
  perfiles.forEach((p, i) => {
    if (!cruces[i].error) crucesCache.set(p.id, cruces[i]);
  });
  return crucesCache;
}

/* ---------- Pintado ---------- */

/* El ranking: quien te puede dar mas, de mayor a menor. El numero va en el
   modo que este elegido arriba, asi que al cambiar a Shiny se reordena. */
function pintarRanking() {
  const seccion = document.getElementById("compRanking");
  const lista = document.getElementById("compRankingLista");
  if (!seccion || !crucesCache || !amigosCache) return;

  const filas = amigosCache
    .map((p) => {
      const cruce = crucesCache.get(p.id);
      if (!cruce) return null;
      return {
        id: p.id,
        nombre: p.display_name || p.handle || "",
        meDa: filtrar(cruce.el_me_da).length,
        leDoy: filtrar(cruce.yo_le_doy).length
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.meDa - a.meDa);

  if (!filas.length) { seccion.hidden = true; return; }

  /* Va cerrado, asi que el titulo tiene que decir si hay algo dentro */
  const conAlgo = filas.filter((f) => f.meDa > 0);
  const pista = document.getElementById("compRankingPista");
  if (pista) {
    pista.textContent = conAlgo.length
      ? conAlgo.length + (conAlgo.length === 1 ? " puede darte algo" : " pueden darte algo")
      : "nadie tiene nada que te falte";
  }

  const tope = filas[0].meDa || 1;

  lista.innerHTML = filas.map((f) => `
    <li>
      <button type="button" class="comp-ranking-fila" data-id="${f.id}">
        <span class="comp-ranking-nombre">${f.nombre}</span>
        <span class="comp-ranking-barra" aria-hidden="true">
          <span style="width:${Math.round((f.meDa / tope) * 100)}%"></span>
        </span>
        <span class="comp-ranking-cuenta">${f.meDa}</span>
        <span class="comp-ranking-vuelta">le das ${f.leDoy}</span>
      </button>
    </li>`).join("");

  seccion.hidden = false;
}

function fichaComparacion(item) {
  const info = CATALOGO_IDS.get(item.id);
  if (!info) return "";

  const src = SPRITES + (item.shiny ? "/shiny/" : "/") + item.id + ".png";
  return `
    <li class="comp-ficha" title="${dexNum(info.base)} ${info.nombre}">
      <img loading="lazy" alt="" aria-hidden="true" src="${src}">
      <span class="comp-nombre">${info.nombre}</span>
    </li>`;
}

function filtrar(lista) {
  return lista.filter((i) => {
    if (i.shiny !== compShiny) return false;
    if (compGen === "todas") return true;
    const info = CATALOGO_IDS.get(i.id);
    return info && String(info.generacion) === compGen;
  });
}

function pintarCruce() {
  if (!cruceActual) return;

  const meDa = filtrar(cruceActual.el_me_da);
  const leDoy = filtrar(cruceActual.yo_le_doy);

  document.getElementById("compMeDaTotal").textContent = meDa.length;
  document.getElementById("compLeDoyTotal").textContent = leDoy.length;

  const vacio = '<li class="comp-vacio">Nada por aqui.</li>';
  document.getElementById("compMeDa").innerHTML =
    meDa.length ? meDa.map(fichaComparacion).join("") : vacio;
  document.getElementById("compLeDoy").innerHTML =
    leDoy.length ? leDoy.map(fichaComparacion).join("") : vacio;
}

function pintarFiltroGeneraciones() {
  const sel = document.getElementById("compGen");
  sel.innerHTML = '<option value="todas">Todas las generaciones</option>' +
    TEAMS.filter((s) => !s.hall && !s.soloEquipo).map((g) =>
      '<option value="' + g.generation + '">' + roman(g.generation) + " · " + g.region + "</option>"
    ).join("");
}

/* ---------- Ver la Pokedex de otro ---------- */

/* Todo el sitio pinta lo que haya en perfilVisto, y esMiPerfil() apaga la
   edicion sola. Asi que "visitar" es cambiar de quien son los datos. */
async function verPokedexDe(id, nombre) {
  const aviso = document.getElementById("compMensaje");
  aviso.textContent = "Cargando su Pokedex...";

  const ficha = (perfilesCache || []).find((p) => p.id === id) || { id, display_name: nombre };
  perfilVisto = ficha;
  await cargarPerfilCompleto(id);

  cerrarComparar();
  pintarVisita(ficha);
  buildIndex();
  selectGeneration(genEnPantalla ? genEnPantalla.id : TEAMS[0].id, false);
}

async function volverAMiPerfil() {
  perfilVisto = perfil;
  await cargarPerfilCompleto(perfil.id);
  pintarVisita(null);
  buildIndex();
  selectGeneration(genEnPantalla ? genEnPantalla.id : TEAMS[0].id, false);
}

function pintarVisita(quien) {
  const barra = document.getElementById("visitaBarra");
  if (!barra) return;

  /* Marca el body para que el cursor no prometa un clic que no hace nada */
  document.body.classList.toggle("visitando", Boolean(quien));

  if (!quien) { barra.hidden = true; barra.innerHTML = ""; return; }

  const nombre = quien.display_name || quien.handle || "";

  /* Los codigos son el motivo de mirar el perfil de otro: si los tiene
     puestos, se enseñan aqui para poder copiarlos sin mas pasos */
  const codigos = [];
  if (quien.friend_code) {
    codigos.push('<span class="visita-codigo"><b>Switch</b> ' + quien.friend_code + "</span>");
  }
  if (quien.champions_id) {
    codigos.push('<span class="visita-codigo"><b>Champions</b> ' + quien.champions_id + "</span>");
  }

  barra.innerHTML = `
    <span><i class="fa-solid fa-eye"></i> Estas viendo la Pokedex de
          ${avatarHTML(quien)}<b>${nombre}</b></span>
    ${codigos.length ? '<span class="visita-codigos">' + codigos.join("") + "</span>" : ""}
    <button type="button" class="boton" id="visitaVolver">Volver a mi Perfil</button>`;
  barra.hidden = false;

  document.getElementById("visitaVolver").addEventListener("click", volverAMiPerfil);
}

/* ---------- Panel ---------- */

async function abrirComparar() {
  if (!sesion) return;

  const panel = document.getElementById("compPanel");
  const aviso = document.getElementById("compMensaje");
  panel.hidden = false;
  aviso.textContent = "Cargando...";

  await construirCatalogo();
  pintarFiltroGeneraciones();

  /* Solo se compara con amigos: hace falta que os tengais agregados los dos */
  const [perfiles, amistades] = await Promise.all([cargarPerfiles(), cargarAmistades()]);
  AMISTADES = amistades;
  amigosCache = perfiles.filter((p) => esMutuo(p.id));

  const sel = document.getElementById("compQuien");
  const res = document.getElementById("compResultado");

  if (!amigosCache.length) {
    aviso.textContent = perfiles.length
      ? "Todavia no tienes amigos. Agrega a alguien en Usuarios; cuando los dos se tengan agregados, apareceran aqui."
      : "Todavia no hay nadie mas con perfil.";
    sel.innerHTML = "";
    res.hidden = true;
    /* Se vacia ademas de esconderse: si no, al volver a abrir con amigos
       nuevos se verian un instante los del cruce anterior */
    document.getElementById("compRankingLista").innerHTML = "";
    document.getElementById("compRanking").hidden = true;
    amigosCache = null;
    crucesCache = null;
    return;
  }

  sel.innerHTML = '<option value="">Elige a alguien...</option>' +
    amigosCache.map((p) =>
      '<option value="' + p.id + '">' + (p.display_name || p.handle) + "</option>"
    ).join("");

  res.hidden = true;

  aviso.textContent = "Viendo quien tiene lo que te falta...";
  await cruzarConTodos(amigosCache);
  aviso.textContent = "";
  pintarRanking();
}

function cerrarComparar() {
  document.getElementById("compPanel").hidden = true;
}

async function elegirPerfil(e) {
  const id = e.target.value;
  const aviso = document.getElementById("compMensaje");
  const res = document.getElementById("compResultado");
  if (!id) { res.hidden = true; return; }

  aviso.textContent = "Cruzando las dos Pokedex...";
  const cruce = (crucesCache && crucesCache.get(id)) || await cruzarCon(id);

  if (cruce.error) {
    aviso.textContent = "No se pudo comparar: " + cruce.error;
    res.hidden = true;
    return;
  }

  cruceActual = cruce;
  aviso.textContent = "";
  res.hidden = false;
  pintarCruce();
}

function conectarComparar() {
  const panel = document.getElementById("compPanel");
  if (!panel) return;

  document.getElementById("compQuien").addEventListener("change", elegirPerfil);
  document.getElementById("compGen").addEventListener("change", (e) => {
    compGen = e.target.value;
    pintarCruce();
    pintarRanking();
  });

  /* Pinchar una fila del ranking es elegir a esa persona abajo */
  document.getElementById("compRankingLista").addEventListener("click", (e) => {
    const fila = e.target.closest(".comp-ranking-fila");
    if (!fila) return;
    const sel = document.getElementById("compQuien");
    sel.value = fila.dataset.id;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.getElementById("compCerrar").addEventListener("click", cerrarComparar);

  document.getElementById("compModos").addEventListener("click", (e) => {
    const b = e.target.closest(".dex-modo");
    if (!b) return;
    compShiny = b.dataset.modo === "shiny";
    document.querySelectorAll("#compModos .dex-modo").forEach((o) =>
      o.setAttribute("aria-selected", String((o.dataset.modo === "shiny") === compShiny)));
    pintarCruce();
    pintarRanking();
  });

  panel.addEventListener("click", (e) => { if (e.target === panel) cerrarComparar(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrarComparar();
  });
}

document.addEventListener("DOMContentLoaded", conectarComparar);
