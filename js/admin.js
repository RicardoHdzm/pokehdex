/* ============================================================
   Pagina de edicion: marcar capturados y generar el codigo
   Reutiliza las funciones de js/app.js (fetchSpecies, rangoDex,
   parseNumeros, nombreEspecie, dexNum, SPRITES).
   ============================================================ */

const ADMIN_KEY = "pkmnteam:admin";

const navAdmin = document.getElementById("adminNav");
const gridAdmin = document.getElementById("adminGrid");
const codeEl = document.getElementById("adminCode");
const hintEl = document.getElementById("adminHint");
const searchEl = document.getElementById("adminSearch");

/* Generaciones, sin el Salon de la Fama */
const GENS = TEAMS.filter((g) => !g.hall);

let genActual = GENS[0];
let especies = [];
let variantes = [];
let entradas = [];
let faltan = new Set();      // numeros que faltan en la generacion actual
let bloqueados = new Set();  // los del equipo: siempre capturados
let verTodas = false;

/* ---------- Estado guardado mientras se marca ---------- */

function leerBorrador() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) || {}; }
  catch { return {}; }
}

function guardarBorrador() {
  const todo = leerBorrador();
  todo[genActual.id] = comprimirRangos(faltan);
  try { localStorage.setItem(ADMIN_KEY, JSON.stringify(todo)); } catch { /* lleno */ }
}

/* Lo que hay en teams.js, salvo que haya un borrador mas reciente */
function faltantesIniciales(gen) {
  const borrador = leerBorrador()[gen.id];
  return parseNumeros(borrador !== undefined ? borrador : gen.missing);
}

/* ---------- Numeros a texto ---------- */

/* [51,52,53,60] -> "51-53, 60" */
function comprimirRangos(conjunto) {
  const nums = [...conjunto].sort((a, b) => a - b);
  const trozos = [];
  let i = 0;

  while (i < nums.length) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    trozos.push(i === j ? String(nums[i]) : nums[i] + "-" + nums[j]);
    i = j + 1;
  }
  return trozos.join(", ");
}

function lineaDe(gen, conjunto) {
  return '    missing: "' + comprimirRangos(conjunto) + '",';
}

/* ---------- Pintado ---------- */

function tileAdmin(entrada) {
  const tengo = !faltan.has(entrada.id);
  const fijo = bloqueados.has(entrada.id);
  const etiqueta = dexNum(entrada.base || entrada.id);
  const titulo = fijo
    ? etiqueta + " " + entrada.nombre + " - va en tu equipo, siempre cuenta como capturado"
    : etiqueta + " " + entrada.nombre + (tengo ? " - capturado" : " - te falta");

  return `
    <li class="dex-tile admin-tile${tengo ? " caught" : ""}${fijo ? " locked" : ""}${entrada.region ? " variante" : ""}"
        data-id="${entrada.id}" data-nombre="${entrada.nombre.toLowerCase()}"
        role="button" tabindex="0" aria-pressed="${tengo}" title="${titulo}">
      <img class="dex-sprite" loading="lazy" alt="" aria-hidden="true" src="${SPRITES}/${entrada.id}.png">
      <span class="dex-num">${etiqueta}</span>
      <span class="dex-name">${entrada.nombre}</span>
      ${fijo ? '<span class="tile-lock"><i class="fa-solid fa-lock"></i></span>' : ""}
    </li>`;
}

function actualizarMarcador() {
  const total = entradas.length;
  const tengo = entradas.filter((e) => !faltan.has(e.id)).length;
  const pct = total ? Math.round((tengo / total) * 100) : 0;

  document.getElementById("adminCount").textContent = tengo + " / " + total;
  document.getElementById("adminPct").textContent = pct + "%";
  document.getElementById("adminBar").style.width = pct + "%";
}

function actualizarCodigo() {
  if (verTodas) {
    const borrador = leerBorrador();
    codeEl.value = GENS.map((g) => {
      const conjunto = g.id === genActual.id
        ? faltan
        : parseNumeros(borrador[g.id] !== undefined ? borrador[g.id] : g.missing);
      return "// " + g.region + " (gen " + g.generation + ")\n" + lineaDe(g, conjunto);
    }).join("\n\n");
    hintEl.textContent = "Una linea por generacion. Sustituye la que ya hay en cada bloque de data/teams.js.";
  } else {
    codeEl.value = lineaDe(genActual, faltan);
    hintEl.textContent = "Pega esta linea sustituyendo la de " + genActual.region + " en data/teams.js.";
  }
}

function pintarGeneracion() {
  entradas = entradasDe(genActual, especies, variantes);
  const propios = new Set(entradas.map((e) => e.id));

  bloqueados = new Set(genActual.team
    .map((m) => idDeEquipo(m, variantes, propios))
    .filter((id) => propios.has(id)));
  bloqueados.forEach((id) => faltan.delete(id));

  /* Numeros de otras generaciones no pintan aqui, se conservan tal cual */
  const formas = entradas.filter((e) => e.region).length;
  document.getElementById("adminTitle").textContent =
    "Pokedex de " + genActual.region + " (gen " + genActual.generation + ")" +
    (formas ? " + " + formas + " formas" : "");

  gridAdmin.innerHTML = entradas.map(tileAdmin).join("");
  aplicarFiltro();
  actualizarMarcador();
  actualizarCodigo();
}

function seleccionar(id) {
  genActual = GENS.find((g) => g.id === id) || GENS[0];
  faltan = faltantesIniciales(genActual);
  navAdmin.querySelectorAll(".index-item").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.id === genActual.id));
  });
  document.documentElement.style.setProperty("--accent", genActual.color || "#ff5a4d");
  history.replaceState(null, "", "#" + genActual.id);
  pintarGeneracion();
}

/* ---------- Interaccion ---------- */

function alternar(li) {
  const id = Number(li.dataset.id);
  if (bloqueados.has(id)) return;

  if (faltan.has(id)) {
    faltan.delete(id);
    li.classList.add("caught");
  } else {
    faltan.add(id);
    li.classList.remove("caught");
  }
  li.setAttribute("aria-pressed", String(!faltan.has(id)));

  guardarBorrador();
  actualizarMarcador();
  actualizarCodigo();
}

function aplicarFiltro() {
  const q = searchEl.value.trim().toLowerCase();
  gridAdmin.querySelectorAll(".admin-tile").forEach((li) => {
    const coincide = !q ||
      li.dataset.nombre.includes(q) ||
      String(li.dataset.id).includes(q.replace(/^#0*/, ""));
    li.hidden = !coincide;
  });
}

function construirNav() {
  navAdmin.innerHTML = GENS.map((g) => `
    <button class="index-item" role="tab" type="button" data-id="${g.id}" aria-selected="false">
      <span class="roman">${roman(g.generation)}</span>
      <span class="region">${g.region}</span>
    </button>`).join("");

  navAdmin.addEventListener("click", (e) => {
    const b = e.target.closest(".index-item");
    if (b) seleccionar(b.dataset.id);
  });
}

function conectarBotones() {
  gridAdmin.addEventListener("click", (e) => {
    const li = e.target.closest(".admin-tile");
    if (li) alternar(li);
  });

  gridAdmin.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const li = e.target.closest(".admin-tile");
    if (!li) return;
    e.preventDefault();
    alternar(li);
  });

  searchEl.addEventListener("input", aplicarFiltro);

  document.getElementById("btnTodos").addEventListener("click", () => {
    faltan = new Set();
    guardarBorrador();
    pintarGeneracion();
  });

  document.getElementById("btnNinguno").addEventListener("click", () => {
    faltan = new Set(entradas.map((e) => e.id));
    guardarBorrador();
    pintarGeneracion();
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    const todo = leerBorrador();
    delete todo[genActual.id];
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(todo)); } catch { /* lleno */ }
    faltan = parseNumeros(genActual.missing);
    pintarGeneracion();
  });

  document.getElementById("btnAmbito").addEventListener("click", (e) => {
    verTodas = !verTodas;
    e.currentTarget.textContent = verTodas ? "Ver solo esta" : "Ver las 9 generaciones";
    actualizarCodigo();
  });

  document.getElementById("btnCopiar").addEventListener("click", async (e) => {
    const boton = e.currentTarget;
    codeEl.select();
    try {
      await navigator.clipboard.writeText(codeEl.value);
      boton.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
    } catch {
      /* Sin permiso de portapapeles queda seleccionado para copiar a mano */
      boton.innerHTML = '<i class="fa-solid fa-i-cursor"></i> Copia con Ctrl+C';
    }
    setTimeout(() => { boton.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar'; }, 2200);
  });
}

async function initAdmin() {
  construirNav();
  conectarBotones();

  [especies, variantes] = await Promise.all([fetchSpecies(), fetchVariantes()]);
  if (!especies.length) {
    gridAdmin.outerHTML = '<p class="dex-error">No se pudo cargar la lista de especies. ' +
      'Hace falta conexion la primera vez.</p>';
    return;
  }

  const hash = location.hash.slice(1);
  seleccionar(GENS.some((g) => g.id === hash) ? hash : GENS[0].id);
}

document.addEventListener("DOMContentLoaded", initAdmin);
