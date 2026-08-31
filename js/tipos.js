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

const TIPOS_KEY = "pkmnteam:tipos";
const GENERACIONES_REJILLA = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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
        /* Solo especies: las formas alternas tienen ids de 10000 en adelante
           y no son entradas propias de la Pokedex */
        .filter((id) => id > 0 && id <= 1025);
      return [TIPOS_REJILLA[i], [...new Set(ids)].sort((a, b) => a - b)];
    });

    guardarLista(TIPOS_KEY, pares);
    TIPOS_MEM = Object.fromEntries(pares);
    return TIPOS_MEM;
  } catch {
    return {};
  }
}

/* Los candidatos de una casilla: de ese tipo y de esa generacion */
function candidatosDe(generacion, tipo) {
  if (!TIPOS_MEM || !TIPOS_MEM[tipo]) return [];
  const { desde, hasta } = rangoDex(generacion);
  return TIPOS_MEM[tipo].filter((id) => id >= desde && id <= hasta);
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

/* Nombre de una especie por su numero, si la lista ya esta cargada */
function nombrePorDex(dex) {
  if (!dex || !ESPECIES_MEM) return "";
  const fila = ESPECIES_MEM.find(([id]) => id === dex);
  return fila ? nombreEspecie(fila[1]) : "";
}

function celdaDe(generacion, tipo) {
  const dex = FAVORITOS_TIPO.get(generacion + ":" + tipo);
  const mio = typeof esMiPerfil === "function" && esMiPerfil();

  const dentro = dex
    ? `<img src="${SPRITES}/${dex}.png" alt="" loading="lazy">`
    : `<span class="rejilla-vacia">${mio ? "+" : ""}</span>`;

  return `
    <td class="rejilla-celda${dex ? " puesta" : ""}${mio ? " editable" : ""}"
        data-gen="${generacion}" data-tipo="${tipo}"
        title="${dex ? dexNum(dex) + " " + nombrePorDex(dex) + " · " : ""}${TYPE_ES[tipo] || tipo} · ${ORDINAL[generacion] || generacion} generacion">
      ${dentro}
    </td>`;
}

function rejillaHTML() {
  const cabecera = TIPOS_REJILLA
    .map((t) => `<th class="rejilla-tipo t-${t}"><span>${TYPE_ES[t] || t}</span></th>`)
    .join("");

  const filas = GENERACIONES_REJILLA.map((g) => `
    <tr>
      <th class="rejilla-gen" scope="row">${roman(g)}</th>
      ${TIPOS_REJILLA.map((t) => celdaDe(g, t)).join("")}
    </tr>`).join("");

  const puestas = FAVORITOS_TIPO.size;
  const total = GENERACIONES_REJILLA.length * TIPOS_REJILLA.length;

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
        </table>
      </div>
    </section>`;
}

/* ---------- Elegir el de una casilla ---------- */

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

  const [especies] = await Promise.all([fetchSpecies(), fetchTipos()]);
  const nombres = new Map(especies);
  const puesto = FAVORITOS_TIPO.get(generacion + ":" + tipo);
  const candidatos = candidatosDe(generacion, tipo);

  if (!candidatos.length) {
    rejilla.innerHTML = '<p class="dex-vacio">No hay ninguno de este tipo en esta generacion.</p>';
    return;
  }

  rejilla.innerHTML = candidatos.map((id) => `
    <li class="tipo-opcion${id === puesto ? " puesta" : ""}" data-dex="${id}"
        title="${dexNum(id)} ${nombreEspecie(nombres.get(id) || "")}">
      <img src="${SPRITES}/${id}.png" alt="" loading="lazy">
      <span>${nombreEspecie(nombres.get(id) || "")}</span>
    </li>`).join("");
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

document.addEventListener("DOMContentLoaded", conectarRejilla);
