/* ============================================================
   COMPARAR PERFILES PARA CUADRAR INTERCAMBIOS
   ------------------------------------------------------------
   El cruce lo hace Postgres con la funcion trade_matches del
   esquema: devuelve, en las dos direcciones, lo que uno tiene y
   al otro le falta. Aqui solo se agrupa y se pinta.
   ============================================================ */

let perfilesCache = null;
let cruceActual = null;      // { el_me_da: [], yo_le_doy: [] }
let compShiny = false;
let compGen = "todas";

/* Nombre e imagen de cualquier id, sea especie o forma regional */
let CATALOGO_IDS = null;     // Map<id, { nombre, base, generacion }>

async function construirCatalogo() {
  if (CATALOGO_IDS) return CATALOGO_IDS;

  const [especies, variantes] = await Promise.all([fetchSpecies(), fetchVariantes()]);
  const mapa = new Map();

  for (const seccion of TEAMS) {
    if (seccion.hall || seccion.soloEquipo) continue;
    for (const e of entradasDe(seccion, especies, variantes)) {
      mapa.set(e.id, { nombre: e.nombre, base: e.base || e.id, generacion: seccion.generation });
    }
  }

  CATALOGO_IDS = mapa;
  return mapa;
}

/* ---------- Datos ---------- */

async function cargarPerfiles() {
  if (perfilesCache) return perfilesCache;

  const { data, error } = await sb
    .from("profiles")
    .select("id, handle, display_name")
    .order("handle");

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

/* ---------- Pintado ---------- */

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

/* ---------- Panel ---------- */

async function abrirComparar() {
  if (!sesion) return;

  const panel = document.getElementById("compPanel");
  const aviso = document.getElementById("compMensaje");
  panel.hidden = false;
  aviso.textContent = "Cargando...";

  await construirCatalogo();
  pintarFiltroGeneraciones();

  const perfiles = await cargarPerfiles();
  const sel = document.getElementById("compQuien");

  if (!perfiles.length) {
    aviso.textContent = "Todavia no hay nadie mas con perfil.";
    sel.innerHTML = "";
    document.getElementById("compResultado").hidden = true;
    return;
  }

  sel.innerHTML = '<option value="">Elige a alguien...</option>' +
    perfiles.map((p) =>
      '<option value="' + p.id + '">' + (p.display_name || p.handle) + "</option>"
    ).join("");

  aviso.textContent = "";
  document.getElementById("compResultado").hidden = true;
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
  const cruce = await cruzarCon(id);

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
  });
  document.getElementById("compCerrar").addEventListener("click", cerrarComparar);

  document.getElementById("compModos").addEventListener("click", (e) => {
    const b = e.target.closest(".dex-modo");
    if (!b) return;
    compShiny = b.dataset.modo === "shiny";
    document.querySelectorAll("#compModos .dex-modo").forEach((o) =>
      o.setAttribute("aria-selected", String((o.dataset.modo === "shiny") === compShiny)));
    pintarCruce();
  });

  panel.addEventListener("click", (e) => { if (e.target === panel) cerrarComparar(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrarComparar();
  });
}

document.addEventListener("DOMContentLoaded", conectarComparar);
