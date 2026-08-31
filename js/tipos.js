/* ============================================================
   FAVORITO POR GENERACION Y TIPO
   ------------------------------------------------------------
   Una rejilla de nueve generaciones por dieciocho tipos: en cada
   cruce eliges tu favorito. La decima queda fuera a proposito,
   que todavia no tiene Pokemon.

   Para saber quien es de que tipo hace falta algo que la pagina
   no tenia: los listados por tipo de PokeAPI. Son dieciocho
   peticiones, una sola vez, y se guardan en el navegador.
   ============================================================ */

/* La v2 incluye las formas; la clave cambia para que el cache viejo,
   que solo tenia especies, no se quede pegado */
const TIPOS_KEY = "pkmnteam:tipos2";
/* La decima va incluida aunque todavia no tenga Pokemon: sus casillas se
   ven reservadas y se encenderan solas en cuanto PokeAPI los publique. */
const GENERACIONES_REJILLA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const TIPOS_REJILLA = [
  "normal", "fire", "water", "grass", "electric", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy"
];

let TIPOS_MEM = null;                 // { fire: [4, 5, 6, ...], ... }
let FAVORITOS_TIPO = new Map();       // "gen:tipo" -> dexId

/* Los dieciocho listados. Se guarda solo el numero de cada especie:
   el JSON entero son 380 KB y asi se queda en unos pocos. */
async function fetchTipos() {
  if (TIPOS_MEM) return TIPOS_MEM;

  const guardado = leerLista(TIPOS_KEY);
  if (guardado && guardado.length === TIPOS_REJILLA.length) {
    TIPOS_MEM = Object.fromEntries(guardado);
    return TIPOS_MEM;
  }

  try {
    const respuestas = await Promise.all(
      TIPOS_REJILLA.map((t) => fetch("https://pokeapi.co/api/v2/type/" + t).then((r) => r.json()))
    );

    const pares = respuestas.map((d, i) => {
      const ids = d.pokemon
        .map((p) => Number(p.pokemon.url.split("/").filter(Boolean).pop()))
        .filter((id) => id > 0);
      return [TIPOS_REJILLA[i], [...new Set(ids)].sort((a, b) => a - b)];
    });

    guardarLista(TIPOS_KEY, pares);
    TIPOS_MEM = Object.fromEntries(pares);
    return TIPOS_MEM;
  } catch {
    return {};
  }
}

/* De que generacion es una forma que la Pokedex no sigue.

   Manda la forma sobre la especie: el Darmanitan de Galar es de octava
   aunque Darmanitan sea de quinta, y una Mega es de sexta aunque su
   Pokemon sea de primera. Solo cuando la forma no dice nada —Rotom Calor,
   Toxtricity Grave— se usa la generacion de la especie. */
function generacionDeFormaSuelta(id) {
  if (!VARIANTES_MEM || !ESPECIES_MEM) return null;

  const fila = VARIANTES_MEM.find(([v]) => v === id);
  if (!fila) return null;

  const porNombre = new Map(ESPECIES_MEM.map(([n, slug]) => [slug, n]));
  const trozos = partirSlug(fila[1], porNombre);
  if (!trozos) return null;

  /* Region, Mega o Gigamax: la forma tiene generacion propia */
  const marca = Object.keys(GEN_DE_FORMA).find((m) => trozos.forma.startsWith(m));
  if (marca) return GEN_DE_FORMA[marca];
  /* El gmax va detras del nombre de la forma: toxtricity-amped-gmax */
  if (/-gmax$/.test(trozos.forma)) return GEN_DE_FORMA.gmax;

  const base = porNombre.get(trozos.especie);
  if (!base) return null;

  const i = CORTES_DEX.findIndex((tope) => base <= tope);
  return i === -1 ? null : i + 1;
}

/* Los candidatos de una casilla: de ese tipo y de esa generacion.

   La generacion no sale del numero de Pokedex sino de donde pertenece cada
   cosa: Ursaluna es de octava y su Luna Carmesi de novena, y el Ninetales
   de Alola cuenta como Hielo de septima y no como Fuego de primera.

   Aqui entran mas formas que en la Pokedex. Alli solo se siguen las
   regionales, porque los juegos cuentan a Rotom o a Toxtricity como una
   sola entrada. Pero elegir favorito no es contar completado: que te guste
   mas el Toxtricity Grave que el Agudo es una preferencia legitima. */
function candidatosDe(generacion, tipo) {
  if (!TIPOS_MEM || !TIPOS_MEM[tipo]) return [];

  return TIPOS_MEM[tipo].filter((id) => {
    const info = CATALOGO_IDS && CATALOGO_IDS.get(id);
    if (info) return info.generacion === generacion;

    /* Las que no sigue la Pokedex: se ubican por su especie */
    if (id <= 1025) return false;
    const fila = VARIANTES_MEM && VARIANTES_MEM.find(([v]) => v === id);
    if (!fila) return false;
    /* Fuera lo que no es una forma sino un estado: Megas, Primal, Gigamax,
       el disfraz roto de Mimikyu, el Morpeko hambriento, Ultra Necrozma,
       Eternamax, el Greninja del anime y las Origin que dependen de un
       objeto. Los totem son solo Pokemon mas grandes.

       Se quedan Zacian y Zamazenta coronados y las formas de Zygarde. */
    if (/-mega|-primal|-gmax|-totem|-busted$|-hangry$|-ultra$|-eternamax$|-ash$|-origin$/
        .test(fila[1])) return false;
    return generacionDeFormaSuelta(id) === generacion;
  });
}

/* ---------- Guardado ---------- */

async function cargarFavoritosTipo(userId) {
  FAVORITOS_TIPO = new Map();
  if (!sb || !userId) return FAVORITOS_TIPO;

  const { data, error } = await sb
    .from("favourite_types")
    .select("generation, type, dex_id")
    .eq("user_id", userId);

  if (error) { console.warn("favoritos por tipo:", error.message); return FAVORITOS_TIPO; }
  data.forEach((f) => FAVORITOS_TIPO.set(f.generation + ":" + f.type, f.dex_id));
  return FAVORITOS_TIPO;
}

async function guardarFavoritoTipo(generacion, tipo, dexId) {
  const clave = generacion + ":" + tipo;
  const antes = FAVORITOS_TIPO.get(clave);

  if (dexId) FAVORITOS_TIPO.set(clave, dexId);
  else FAVORITOS_TIPO.delete(clave);

  if (!sb || !sesion) return { ok: false, error: "sin sesion" };

  const fila = { user_id: sesion.user.id, generation: generacion, type: tipo };
  const { error } = dexId
    ? await sb.from("favourite_types").upsert({ ...fila, dex_id: dexId },
        { onConflict: "user_id,generation,type" })
    : await sb.from("favourite_types").delete().match(fila);

  if (error) {
    /* Se deshace para que la rejilla no enseñe algo que no se guardo */
    if (antes) FAVORITOS_TIPO.set(clave, antes); else FAVORITOS_TIPO.delete(clave);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/* ---------- Pintado ---------- */

/* Nombre por numero. El catalogo incluye las formas; la lista de especies
   solo las 1025 base, asi que se mira primero alli. */
function nombrePorDex(dex) {
  if (!dex) return "";
  if (CATALOGO_IDS && CATALOGO_IDS.has(dex)) return CATALOGO_IDS.get(dex).nombre;
  if (!ESPECIES_MEM) return "";

  const fila = ESPECIES_MEM.find(([id]) => id === dex);
  if (fila) return nombreEspecie(fila[1]);

  /* Una forma que la Pokedex no sigue: se arma como las demas */
  const forma = VARIANTES_MEM && VARIANTES_MEM.find(([v]) => v === dex);
  if (!forma) return "";
  const porNombre = new Map(ESPECIES_MEM.map(([n, slug]) => [slug, n]));
  const trozos = partirSlug(forma[1], porNombre);
  return trozos
    ? nombreEspecie(trozos.especie) + " (" + formLabel(trozos.forma) + ")"
    : nombreEspecie(forma[1]);
}

/* Hay cruces que no existen: en primera generacion no hay ningun Siniestro,
   porque el tipo llego en segunda. Esas casillas no se pueden rellenar, asi
   que tampoco deben contar en el marcador ni invitar a tocarlas. */
function casillaPosible(generacion, tipo) {
  return candidatosDe(generacion, tipo).length > 0;
}

function celdaDe(generacion, tipo) {
  const dex = FAVORITOS_TIPO.get(generacion + ":" + tipo);
  const mio = typeof esMiPerfil === "function" && esMiPerfil();
  const posible = casillaPosible(generacion, tipo);

  const dentro = dex
    ? `<img src="${SPRITES}/${dex}.png" alt="" loading="lazy">`
    : `<span class="rejilla-vacia">${!posible ? "·" : mio ? "+" : ""}</span>`;

  const motivo = !posible
    ? "No hay ningun " + (TYPE_ES[tipo] || tipo) + " de esta generacion"
    : (dex ? dexNum(baseDe(dex)) + " " + nombrePorDex(dex) + " · " : "") +
      (TYPE_ES[tipo] || tipo) + " · " + (ORDINAL[generacion] || generacion) + " generacion";

  return `
    <td class="rejilla-celda${dex ? " puesta" : ""}${posible && mio ? " editable" : ""}${posible ? "" : " imposible"}"
        data-gen="${generacion}" data-tipo="${tipo}" title="${motivo}">
      ${dentro}
    </td>`;
}

/* Los tipos van en filas y las generaciones en columnas. Al reves —que es
   como lo hace el picker original— son 18 columnas, la tabla se pasa de
   ancho hasta en escritorio y las casillas quedan en 54px. Asi son 9
   columnas, el doble de sitio para cada sprite y sin desplazar. */
function rejillaHTML() {
  const cabecera = GENERACIONES_REJILLA
    .map((g) => `<th class="rejilla-gen" scope="col">${roman(g)}</th>`)
    .join("");

  const filas = TIPOS_REJILLA.map((t) => `
    <tr>
      <th class="rejilla-tipo t-${t}" scope="row"><span>${TYPE_ES[t] || t}</span></th>
      ${GENERACIONES_REJILLA.map((g) => celdaDe(g, t)).join("")}
    </tr>`).join("");

  /* Los totales de cada generacion, ahora al pie de su columna. Sirven para
     lo mismo: convertir 162 casillas en nueve metas de 18. */
  let total = 0;
  const totales = GENERACIONES_REJILLA.map((g) => {
    const posibles = TIPOS_REJILLA.filter((t) => casillaPosible(g, t));
    total += posibles.length;
    const n = posibles.filter((t) => FAVORITOS_TIPO.has(g + ":" + t)).length;
    return `<td class="rejilla-cuenta${posibles.length && n === posibles.length ? " completa" : ""}">
      ${n}/${posibles.length}</td>`;
  }).join("");

  const puestas = FAVORITOS_TIPO.size;

  return `
    <section class="rejilla-seccion">
      <div class="section-head">
        <h3 class="section-label">Favorito por tipo</h3>
        <p class="dex-progress">
          <span class="dex-count">${puestas} / ${total}</span>
        </p>
      </div>
      <div class="rejilla-marco">
        <table class="rejilla">
          <thead><tr><th class="rejilla-esquina"></th>${cabecera}</tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr><th class="rejilla-esquina"></th>${totales}</tr></tfoot>
        </table>
      </div>
    </section>`;
}

/* ---------- Elegir el de una casilla ---------- */

/* Las formas comparten numero con su especie: el catalogo lo guarda en base */
function baseDe(dex) {
  const info = CATALOGO_IDS && CATALOGO_IDS.get(dex);
  if (info) return info.base;
  if (dex <= 1025 || !VARIANTES_MEM || !ESPECIES_MEM) return dex;

  const forma = VARIANTES_MEM.find(([v]) => v === dex);
  if (!forma) return dex;
  const porNombre = new Map(ESPECIES_MEM.map(([n, slug]) => [slug, n]));
  const trozos = partirSlug(forma[1], porNombre);
  return trozos ? porNombre.get(trozos.especie) || dex : dex;
}

let celdaEnCurso = null;

async function abrirSelectorTipo(celda) {
  const generacion = Number(celda.dataset.gen);
  const tipo = celda.dataset.tipo;
  celdaEnCurso = { generacion, tipo };

  const panel = document.getElementById("tipoPanel");
  document.getElementById("tipoTitulo").textContent =
    (TYPE_ES[tipo] || tipo) + " · " + (ORDINAL[generacion] || generacion) + " generacion";
  panel.hidden = false;

  const rejilla = document.getElementById("tipoOpciones");
  rejilla.innerHTML = '<p class="dex-vacio">Cargando...</p>';

  await Promise.all([fetchSpecies(), fetchVariantes(), fetchTipos(), construirCatalogo()]);
  const puesto = FAVORITOS_TIPO.get(generacion + ":" + tipo);
  const candidatos = candidatosDe(generacion, tipo);

  if (!candidatos.length) {
    rejilla.innerHTML = '<p class="dex-vacio">No hay ninguno de este tipo en esta generacion.</p>';
    return;
  }

  /* Los que llevaste en algun equipo van primero: si Arcanine estuvo en tu
     equipo de Kanto es el candidato obvio a favorito de Fuego. Despues los
     que tienes capturados, y al final el resto. */
  const enEquipos = new Set();
  TEAMS.forEach((sec) => sec.team.forEach((m) => { if (m && m.dex) enEquipos.add(m.dex); }));
  const capturados = (typeof CAPTURAS !== "undefined" && perfilVisto) ? CAPTURAS.normal : new Set();

  const peso = (id) => (enEquipos.has(id) ? 0 : capturados.has(id) ? 1 : 2);
  const ordenados = [...candidatos].sort((a, b) => peso(a) - peso(b) || a - b);

  rejilla.innerHTML = ordenados.map((id) => {
    const deEquipo = enEquipos.has(id);
    const tenido = capturados.has(id);
    const marca = deEquipo ? "De tu equipo" : tenido ? "Lo tienes" : "";

    return `
    <li class="tipo-opcion${id === puesto ? " puesta" : ""}${deEquipo ? " de-equipo" : tenido ? " tenido" : ""}"
        data-dex="${id}"
        title="${dexNum(baseDe(id))} ${nombrePorDex(id)}${marca ? " · " + marca : ""}">
      <img src="${SPRITES}/${id}.png" alt="" loading="lazy">
      <span>${nombrePorDex(id)}</span>
      ${marca ? '<b class="tipo-marca">' + marca + "</b>" : ""}
    </li>`;
  }).join("");
}

function cerrarSelectorTipo() {
  celdaEnCurso = null;
  document.getElementById("tipoPanel").hidden = true;
}

async function elegirDeLaRejilla(dex) {
  if (!celdaEnCurso) return;
  const { generacion, tipo } = celdaEnCurso;

  /* Volver a elegir el que ya estaba lo quita, que es como se vacia */
  const actual = FAVORITOS_TIPO.get(generacion + ":" + tipo);
  const nuevo = actual === dex ? null : dex;

  cerrarSelectorTipo();
  const res = await guardarFavoritoTipo(generacion, tipo, nuevo);
  if (!res.ok && res.error !== "sin sesion") {
    console.warn("no se pudo guardar el favorito:", res.error);
  }
  if (genEnPantalla) selectGeneration(genEnPantalla.id, false);
}

function conectarRejilla() {
  const panel = document.getElementById("tipoPanel");
  if (!panel) return;

  panelEl.addEventListener("click", (e) => {
    const celda = e.target.closest(".rejilla-celda.editable");
    if (celda) abrirSelectorTipo(celda);
  });

  document.getElementById("tipoOpciones").addEventListener("click", (e) => {
    const op = e.target.closest(".tipo-opcion");
    if (op) elegirDeLaRejilla(Number(op.dataset.dex));
  });

  document.getElementById("tipoCerrar").addEventListener("click", cerrarSelectorTipo);
  panel.addEventListener("click", (e) => { if (e.target === panel) cerrarSelectorTipo(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrarSelectorTipo();
  });
}

/* La rejilla se pinta de golpe con el resto de la pestaña, y para saber
   que casillas existen hacen falta los listados por tipo. Si todavia no
   estan, se piden y se repinta solo esa seccion. */
async function asegurarTiposYRepintar() {
  if (TIPOS_MEM && CATALOGO_IDS) return;

  await Promise.all([fetchSpecies(), fetchVariantes(), fetchTipos(), construirCatalogo()]);

  const seccion = panelEl.querySelector(".rejilla-seccion");
  if (seccion) seccion.outerHTML = rejillaHTML();
}

document.addEventListener("DOMContentLoaded", conectarRejilla);
