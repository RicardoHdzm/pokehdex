/* ============================================================
   Mis Equipos Pokemon — logica de la pagina
   Los datos viven en data/teams.js (constante TEAMS).
   ============================================================ */

const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const ITEMS = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";
const POKEAPI = "https://pokeapi.co/api/v2/pokemon";
const SPECIES_URL = "https://pokeapi.co/api/v2/pokemon-species?limit=100000";
const FORMAS_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000";
const FORMAS_KEY = "pkmnteam:pokemon";
const CACHE_KEY = "pkmnteam:types";
const FORM_CACHE_KEY = "pkmnteam:forms";
const SPECIES_KEY = "pkmnteam:species";

/* Las listas de PokeAPI caducan a la semana: asi entran solos los Pokemon
   nuevos cuando se publica una generacion, sin tener que limpiar el navegador. */
const CADUCIDAD = 7 * 24 * 60 * 60 * 1000;

/* leerLista tiene que parsear 17 y 25 KB de JSON, y estas dos listas se piden
   muchas veces: al cambiar de region, al abrir el editor y en cada tecla del
   buscador de especies. Una vez leidas se quedan aqui ya parseadas. */
let ESPECIES_MEM = null;
let VARIANTES_MEM = null;

function leerLista(clave) {
  try {
    const c = JSON.parse(localStorage.getItem(clave));
    if (!c || !Array.isArray(c.v) || Date.now() - c.t > CADUCIDAD) return null;
    return c.v;
  } catch { return null; }
}

function guardarLista(clave, lista) {
  try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), v: lista })); }
  catch { /* lleno */ }
}

/* Estilo de imagen: "pixel" (sprites de 8 bits) o "artwork" (ilustracion oficial) */
const SPRITE_STYLE = "pixel";

const ORDINAL = [
  "", "Primera", "Segunda", "Tercera", "Cuarta", "Quinta",
  "Sexta", "Septima", "Octava", "Novena", "Decima"
];

const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"
];

/* Nombres de los tipos, en ingles */
const TYPE_ES = {
  normal: "Normal", fire: "Fire", water: "Water", electric: "Electric",
  grass: "Grass", ice: "Ice", fighting: "Fighting", poison: "Poison",
  ground: "Ground", flying: "Flying", psychic: "Psychic", bug: "Bug",
  rock: "Rock", ghost: "Ghost", dragon: "Dragon", dark: "Dark",
  steel: "Steel", fairy: "Fairy"
};

/* Iconos de genero de Font Awesome 6 (se carga desde el CDN en index.html) */
const faIcon = (name) => '<i class="fa-solid fa-' + name + '" aria-hidden="true"></i>';

const GENDER = {
  m: { label: "Macho",      icon: faIcon("mars") },
  f: { label: "Hembra",     icon: faIcon("venus") },
  n: { label: "Sin genero", icon: faIcon("genderless") }
};

/* Formas regionales y otras variantes (clave = sufijo que usa PokeAPI) */
const FORM_ES = {
  alola: "Alola", galar: "Galar", hisui: "Hisui", paldea: "Paldea",
  mega: "Mega", "mega-x": "Mega X", "mega-y": "Mega Y", gmax: "Gigamax",
  bloodmoon: "Luna Carmesi", amped: "Aguda", "low-key": "Grave"
};

/* Nombres de las Poke Balls, en ingles (clave = archivo del sprite) */
const BALL_ES = {
  "poke-ball": "Poke Ball",       "great-ball": "Great Ball",
  "ultra-ball": "Ultra Ball",     "master-ball": "Master Ball",
  "premier-ball": "Premier Ball", "luxury-ball": "Luxury Ball",
  "dusk-ball": "Dusk Ball",       "quick-ball": "Quick Ball",
  "net-ball": "Net Ball",         "dive-ball": "Dive Ball",
  "nest-ball": "Nest Ball",       "repeat-ball": "Repeat Ball",
  "timer-ball": "Timer Ball",     "heal-ball": "Heal Ball",
  "safari-ball": "Safari Ball",   "level-ball": "Level Ball",
  "lure-ball": "Lure Ball",       "moon-ball": "Moon Ball",
  "friend-ball": "Friend Ball",   "love-ball": "Love Ball",
  "heavy-ball": "Heavy Ball",     "fast-ball": "Fast Ball",
  "dream-ball": "Dream Ball",     "beast-ball": "Beast Ball",
  "sport-ball": "Sport Ball",     "cherish-ball": "Cherish Ball",
  "park-ball": "Park Ball",

  /* Las de Leyendas Arceus. En PokeAPI llevan el prefijo "la", y cuatro
     repiten nombre con las modernas, de ahi la aclaracion entre parentesis. */
  "lapoke-ball": "Poke Ball (Hisui)",   "lagreat-ball": "Great Ball (Hisui)",
  "laultra-ball": "Ultra Ball (Hisui)", "laheavy-ball": "Heavy Ball (Hisui)",
  "lafeather-ball": "Feather Ball",     "lawing-ball": "Wing Ball",
  "lajet-ball": "Jet Ball",             "laleaden-ball": "Leaden Ball",
  "lagigaton-ball": "Gigaton Ball",     "laorigin-ball": "Origin Ball",
  "lastrange-ball": "Strange Ball"
};

const navEl = document.getElementById("gamePills");
const panelEl = document.getElementById("gamePanel");

/* ---------- Utilidades ---------- */

const dexNum = (n) => "#" + String(n).padStart(4, "0");
const plateNum = (n) => String(n).padStart(2, "0");
const roman = (n) => ROMAN[n] || String(n);

function artwork(mon) {
  const dir = mon.shiny ? "other/official-artwork/shiny" : "other/official-artwork";
  return SPRITES + "/" + dir + "/" + mon.dex + ".png";
}

function pixelSprite(mon) {
  return SPRITES + "/" + (mon.shiny ? "shiny/" : "") + mon.dex + ".png";
}

/* Imagen principal y su recambio si esa no existe */
const spriteSrc = (mon) => (SPRITE_STYLE === "pixel" ? pixelSprite(mon) : artwork(mon));
const spriteAlt = (mon) => (SPRITE_STYLE === "pixel" ? artwork(mon) : pixelSprite(mon));

/* "Raichu" + forma "alola" -> "raichu-alola", que es como lo llama PokeAPI */
function variantSlug(mon) {
  const base = mon.species
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base + "-" + mon.form;
}

const REGIONES = ["alola", "galar", "hisui", "paldea"];

/* "alola" -> "Alola"; "paldea-combat-breed" -> "Paldea" (la variante concreta
   si se usa para pedir el sprite, pero en pantalla basta con la region) */
function formLabel(form) {
  if (FORM_ES[form]) return FORM_ES[form];
  const region = REGIONES.find((r) => form.startsWith(r));
  if (region) return FORM_ES[region];
  return form.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* Las formas regionales se dicen "Raichu de Alola"; el resto, "Charizard (Mega X)" */
function formName(mon) {
  const label = formLabel(mon.form);
  const esRegional = REGIONES.some((r) => mon.form.startsWith(r));
  return esRegional ? mon.species + " de " + label : mon.species + " (" + label + ")";
}

/* Cache de tipos consultados a PokeAPI (para Pokemon sin "types" en teams.js) */
function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
  catch { return {}; }
}

function writeCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* modo privado */ }
}

async function fetchTypes(dex) {
  const cache = readCache();
  if (cache[dex]) return cache[dex];
  try {
    const res = await fetch(POKEAPI + "/" + dex);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const types = data.types.map((t) => t.type.name);
    cache[dex] = types;
    writeCache(cache);
    return types;
  } catch {
    return [];
  }
}

/* Datos de una forma concreta (Raichu de Alola, Zapdos de Galar...).
   PokeAPI da el sprite y los tipos propios de esa forma. */
async function fetchVariant(slug) {
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(FORM_CACHE_KEY)) || {}; } catch { /* nada */ }
  if (cache[slug]) return cache[slug];

  try {
    const res = await fetch(POKEAPI + "/" + slug);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const s = data.sprites;
    const info = {
      types: data.types.map((t) => t.type.name),
      pixel: s.front_default,
      pixelShiny: s.front_shiny,
      art: s.other["official-artwork"].front_default,
      artShiny: s.other["official-artwork"].front_shiny
    };
    cache[slug] = info;
    try { localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(cache)); } catch { /* nada */ }
    return info;
  } catch {
    return null;
  }
}

/* Elige la imagen de la forma segun el estilo y si es variocolor */
function variantImage(info, mon) {
  if (SPRITE_STYLE === "pixel") {
    return (mon.shiny ? info.pixelShiny : info.pixel) || info.pixel || info.art;
  }
  return (mon.shiny ? info.artShiny : info.art) || info.art || info.pixel;
}

/* ---------- Pokedex de la generacion ---------- */

/* Nombres que quedan mal con el arreglo automatico de guiones */
const NOMBRE_ESPECIAL = {
  "nidoran-f": "Nidoran F", "nidoran-m": "Nidoran M", "farfetchd": "Farfetch'd",
  "mr-mime": "Mr. Mime", "ho-oh": "Ho-Oh", "porygon-z": "Porygon-Z",
  "mime-jr": "Mime Jr.", "type-null": "Type: Null", "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o", "kommo-o": "Kommo-o", "sirfetchd": "Sirfetch'd",
  "mr-rime": "Mr. Rime", "great-tusk": "Great Tusk", "iron-treads": "Iron Treads",
  "wo-chien": "Wo-Chien", "chien-pao": "Chien-Pao", "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu", "roaring-moon": "Roaring Moon", "walking-wake": "Walking Wake",
  "iron-leaves": "Iron Leaves", "gouging-fire": "Gouging Fire",
  "raging-bolt": "Raging Bolt", "iron-boulder": "Iron Boulder", "iron-crown": "Iron Crown"
};

function nombreEspecie(slug) {
  if (NOMBRE_ESPECIAL[slug]) return NOMBRE_ESPECIAL[slug];
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* La lista completa de especies se pide una sola vez y se guarda en el navegador */
async function fetchSpecies() {
  if (ESPECIES_MEM) return ESPECIES_MEM;

  const guardado = leerLista(SPECIES_KEY);
  if (guardado && guardado.length > 900) return (ESPECIES_MEM = guardado);

  try {
    const res = await fetch(SPECIES_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const lista = data.results
      .map((r) => [Number(r.url.split("/").filter(Boolean).pop()), r.name])
      .filter(([id]) => id > 0)
      .sort((a, b) => a[0] - b[0]);
    guardarLista(SPECIES_KEY, lista);
    return (ESPECIES_MEM = lista);
  } catch {
    return [];
  }
}

/* ---------- Formas regionales ---------- */

/* Que regiones estreno cada generacion. Hisui es de la octava (Leyendas Arceus). */
const REGIONES_DE_GEN = { 7: ["alola"], 8: ["galar", "hisui"], 9: ["paldea"] };

/* Solo la variante regional "limpia": darmanitan-galar si, darmanitan-galar-zen no.
   Los Tauros de Paldea son la excepcion, van con su raza en el nombre. */
const ES_REGIONAL = /-(alola|galar|hisui|paldea)$|-paldea-(combat|blaze|aqua)-breed$/;

/* El listado completo de "pokemon" incluye todas las formas. Lo guardamos entero
   y no solo las regionales, para poder añadir formas sueltas (Luna Carmesi,
   Gigamax...) sin tener que volver a pedirlo. Una peticion, cacheada. */
async function fetchVariantes() {
  if (VARIANTES_MEM) return VARIANTES_MEM;

  const guardado = leerLista(FORMAS_KEY);
  if (guardado && guardado.length > 1000) return (VARIANTES_MEM = guardado);

  try {
    const res = await fetch(FORMAS_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const lista = data.results
      .map((r) => [Number(r.url.split("/").filter(Boolean).pop()), r.name])
      .sort((a, b) => a[0] - b[0]);
    guardarLista(FORMAS_KEY, lista);
    return (VARIANTES_MEM = lista);
  } catch {
    return [];
  }
}

/* Parte un slug en especie y forma probando prefijos: "ursaluna-bloodmoon" ->
   { especie: "ursaluna", forma: "bloodmoon" }. Asi funciona igual con nombres
   compuestos como "mr-mime-galar". */
function partirSlug(slug, porNombre) {
  const trozos = slug.split("-");
  for (let corte = trozos.length - 1; corte >= 1; corte--) {
    const especie = trozos.slice(0, corte).join("-");
    if (porNombre.has(especie)) {
      return { especie, forma: trozos.slice(corte).join("-") };
    }
  }
  return null;
}

/* Las tres razas de Tauros de Paldea */
const RAZA_ES = {
  "combat-breed": "Raza Combatiente",
  "blaze-breed": "Raza Ardiente",
  "aqua-breed": "Raza Acuatica"
};

/* "raichu-alola"              -> { especie: "raichu", region: "alola", raza: "" }
   "tauros-paldea-combat-breed" -> { especie: "tauros", region: "paldea", raza: "combat-breed" } */
function partirVariante(slug) {
  const region = REGIONES.find((r) => slug.includes("-" + r));
  if (!region) return null;
  const [especie, resto] = slug.split("-" + region);
  return { especie, region, raza: (resto || "").replace(/^-/, "") };
}

/* Acepta "1-9, 25, 30-33" o [1, 2, 3] y devuelve el conjunto de numeros.
   Separa por cualquier cosa que no sea digito o guion, asi una coma escrita
   como punto o un salto de linea no tiran los numeros a la basura. */
function parseNumeros(valor) {
  const set = new Set();
  const trozos = Array.isArray(valor)
    ? valor.map(String)
    : String(valor || "").split(/[^0-9-]+/);

  for (const trozo of trozos) {
    const t = trozo.trim();
    if (!t) continue;

    const rango = t.match(/^(\d+)-(\d+)$/);
    if (rango) {
      const [a, b] = [Number(rango[1]), Number(rango[2])];
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
    } else if (/^\d+$/.test(t)) {
      set.add(Number(t));
    } else {
      console.warn('No entiendo este trozo de "missing": ' + t);
    }
  }
  return set;
}

/* Las entradas de una generacion: primero sus especies por numero de Pokedex y
   despues las formas regionales que estreno esa generacion.
   Cada entrada lleva un "id" unico: el numero nacional para las especies y el
   id de PokeAPI (10000 en adelante) para las formas. Ese id es el que se apunta
   en "missing". */
function entradasDe(gen, especies, variantes) {
  /* La Nacional no tiene rango propio: son las entradas de todas las
     generaciones juntas, sin repetir y por numero de Pokedex. Cada forma
     regional va detras de su especie (Raichu, Raichu de Alola), que es
     como se ordena por "base"; el id solo desempata entre las formas de
     una misma especie, porque las formas los tienen de 10000 en adelante. */
  if (gen.nacional) {
    const vistas = new Set();
    const todas = [];
    for (const sec of TEAMS) {
      if (sec.hall || sec.soloEquipo || sec.nacional) continue;
      for (const e of entradasDe(sec, especies, variantes)) {
        if (vistas.has(e.id)) continue;
        vistas.add(e.id);
        todas.push(e);
      }
    }
    return todas.sort((a, b) =>
      ((a.base || a.id) - (b.base || b.id)) || (a.id - b.id));
  }

  const { desde, hasta } = rangoDex(gen.generation);
  const porNombre = new Map(especies.map(([id, slug]) => [slug, id]));

  const propias = especies
    .filter(([id]) => id >= desde && id <= hasta)
    .map(([id, slug]) => ({ id, slug, base: id, region: null, nombre: nombreEspecie(slug) }));

  /* Construye la entrada de una forma a partir de su slug */
  const entradaDeForma = (id, slug) => {
    const trozos = partirSlug(slug, porNombre);
    if (!trozos) return null;

    const esRegional = REGIONES.some((r) => trozos.forma.startsWith(r));
    const etiqueta = formLabel(trozos.forma);
    const raza = trozos.forma.match(/-((?:combat|blaze|aqua)-breed)$/);
    const nombre = nombreEspecie(trozos.especie) +
      (esRegional
        ? " de " + etiqueta + (raza ? " (" + RAZA_ES[raza[1]] + ")" : "")
        : " (" + etiqueta + ")");

    return { id, slug, base: porNombre.get(trozos.especie), region: trozos.forma, nombre };
  };

  const regiones = REGIONES_DE_GEN[gen.generation] || [];
  const sueltas = new Set(gen.forms || []);

  const formas = variantes
    .filter(([, slug]) => {
      if (sueltas.has(slug)) return true;
      if (!ES_REGIONAL.test(slug)) return false;
      const t = partirVariante(slug);
      return t && regiones.includes(t.region) && porNombre.has(t.especie);
    })
    .map(([id, slug]) => entradaDeForma(id, slug))
    .filter(Boolean)
    .sort((a, b) => a.base - b.base);

  return propias.concat(formas);
}

/* El identificador con el que cuenta un Pokemon de tu equipo: el de su forma si
   esa forma esta listada en esta generacion, y si no su numero nacional. */
function idDeEquipo(mon, variantes, idsDeEsteDex) {
  if (!mon.form) return mon.dex;
  const encontrada = variantes.find(([, s]) => s === variantSlug(mon));
  if (!encontrada) return mon.dex;
  if (idsDeEsteDex && !idsDeEsteDex.has(encontrada[0])) return mon.dex;
  return encontrada[0];
}

/* La Pokedex shiny va al reves: en "shinies" se apuntan los que SI tienes,
   porque de variocolores se tienen pocos y seria absurdo listar los que faltan. */
function shinyDe(gen, entradas, variantes) {
  if (typeof CAPTURAS !== "undefined" && perfilVisto) {
    const set = new Set();
    entradas.forEach((e) => { if (CAPTURAS.shiny.has(e.id)) set.add(e.id); });
    return set;
  }

  const fuentes = gen.nacional ? generacionesReales() : [gen];
  const tengo = new Set();
  fuentes.forEach((sec) => parseNumeros(sec.shinies).forEach((n) => tengo.add(n)));

  const ids = new Set(entradas.map((e) => e.id));

  /* Un Pokemon del equipo marcado como variocolor cuenta solo en esta lista */
  fuentes.forEach((sec) => sec.team.forEach((m) => {
    if (m.shiny) tengo.add(idDeEquipo(m, variantes, ids));
  }));

  const set = new Set();
  entradas.forEach((e) => { if (tengo.has(e.id)) set.add(e.id); });
  return set;
}

/* En teams.js se apuntan los que FALTAN. Todo lo demas se da por capturado,
   que para una Pokedex casi completa es mucho menos que escribir. */
/* Las generaciones de verdad, sin el Salon de la Fama, Champions ni la Nacional */
function generacionesReales() {
  return TEAMS.filter((s) => !s.hall && !s.soloEquipo && !s.nacional);
}

function capturadosDe(gen, entradas, variantes) {
  /* Con sesion manda la base; el archivo solo sirve de arranque */
  if (typeof CAPTURAS !== "undefined" && perfilVisto) {
    const set = new Set();
    entradas.forEach((e) => { if (CAPTURAS.normal.has(e.id)) set.add(e.id); });
    return set;
  }

  /* La Nacional no tiene listas propias: junta las de todas las generaciones */
  const fuentes = gen.nacional ? generacionesReales() : [gen];
  const faltan = new Set();
  fuentes.forEach((sec) => parseNumeros(sec.missing).forEach((n) => faltan.add(n)));

  const ids = new Set(entradas.map((e) => e.id));

  /* Si lo llevaste en el equipo lo tienes, aunque este en la lista de faltantes */
  fuentes.forEach((sec) =>
    sec.team.forEach((m) => faltan.delete(idDeEquipo(m, variantes, ids))));

  const set = new Set();
  entradas.forEach((e) => { if (!faltan.has(e.id)) set.add(e.id); });
  return set;
}

/* Numeros de Pokedex Nacional que introdujo cada generacion.
   Si todavia no se sabe donde termina (una generacion recien anunciada), se deja
   abierta: apareceran los Pokemon nuevos en cuanto PokeAPI los publique. */
function rangoDex(generacion) {
  const desde = generacion === 1 ? 1 : CORTES_DEX[generacion - 2] + 1;
  const hasta = CORTES_DEX[generacion - 1];
  return { desde, hasta: hasta === undefined ? Infinity : hasta };
}

function spriteDex(id) {
  return SPRITES + (modoShiny ? "/shiny/" : "/") + id + ".png";
}

function dexTile(entrada, capturados) {
  const tengo = capturados.has(entrada.id);
  const etiqueta = dexNum(entrada.base || entrada.id);
  const estado = tengo
    ? (modoShiny ? " - lo tienes shiny" : " - capturado")
    : (modoShiny ? " - sin shiny" : " - te falta");
  return `
    <li class="dex-tile${tengo ? " caught" : ""}${entrada.region ? " variante" : ""}"
        data-id="${entrada.id}" title="${etiqueta} ${entrada.nombre}${estado}">
      <img class="dex-sprite" loading="lazy" decoding="async" alt="" aria-hidden="true"
           src="${spriteDex(entrada.id)}">
      <span class="dex-num">${etiqueta}</span>
      <span class="dex-name">${entrada.nombre}</span>
    </li>`;
}

/* La entradilla lleva el total capturado de todas las regiones juntas.
   El numero va rellenado con ceros al ancho del total para que la linea
   no baile cada vez que se marca uno. */
async function actualizarEntradilla() {
  const rotulo = document.querySelector(".masthead .eyebrow");
  if (!rotulo) return;

  if (typeof construirCatalogo !== "function") return;

  const catalogo = await construirCatalogo();

  /* Cuenta especies, no entradas: cada forma regional apunta a su especie
     con "base", asi que tener el Marowak de Kanto y el de Alola suma uno,
     no dos. El total son las entradas cuyo id es su propia base, o sea
     las especies sin contar formas. */
  let total = 0;
  catalogo.forEach((info, id) => { if (info.base === id) total++; });

  /* Sin red la primera vez no hay catalogo: mejor dejar el texto de reserva
     del HTML que enseñar "0 de 0" */
  if (!total) return;

  /* Sin perfil, en la pantalla de acceso, se enseña el formato a cero */
  const especies = new Set();
  if (perfilVisto) {
    CAPTURAS.normal.forEach((id) => {
      const info = catalogo.get(id);
      if (info) especies.add(info.base);
    });
  }

  rotulo.textContent = "Pokedex · " + String(especies.size).padStart(String(total).length, "0") +
                       " de " + total + " capturados";
}

/* Cuantos favoritos caben en el Salon de la Fama */
const TOPE_FAVORITOS = 12;

/* Las cajas del PC de los juegos son de 30, en seis columnas por cinco filas */
const POR_CAJA = 30;

/* Lo que hay escrito en el buscador y que filtro esta puesto. Se guarda
   entre pestañas a proposito: "los que me faltan" es util de region en
   region, y como los dos controles se ven en pantalla no es estado oculto. */
let dexBusqueda = "";
let dexFiltro = "todos";   // todos | faltan | tengo

/* La ultima Pokedex pintada, para poder filtrar sin volver a calcularla */
let dexUltima = null;      // { gen, entradas, capturados }

/* Un Pokemon entra en la busqueda por nombre o por numero: "char" saca a
   los Charmander y "25" saca al 0025. */
function coincide(entrada, texto) {
  if (!texto) return true;
  if (entrada.nombre.toLowerCase().includes(texto)) return true;
  return dexNum(entrada.base || entrada.id).toLowerCase().includes(texto);
}

function entradasFiltradas(entradas, capturados) {
  const texto = dexBusqueda.trim().toLowerCase();
  return entradas.filter((e) => {
    if (!coincide(e, texto)) return false;
    if (dexFiltro === "faltan") return !capturados.has(e.id);
    if (dexFiltro === "tengo") return capturados.has(e.id);
    return true;
  });
}

/* Con un filtro puesto las cajas del PC pierden el sentido: lo que sale es
   un resultado de busqueda, asi que va en una sola rejilla. */
function cajasHTML(entradas, capturados, filtrando) {
  if (filtrando) {
    if (!entradas.length) {
      return `<p class="dex-vacio">Ningun Pokemon coincide con lo que buscas.</p>`;
    }
    return `
      <section class="dex-caja" style="--filas:${Math.ceil(entradas.length / 6)}">
        <h4 class="dex-caja-titulo">
          <span>${entradas.length} ${entradas.length === 1 ? "resultado" : "resultados"}</span>
          <span class="dex-caja-cuenta">${entradas.filter((e) => capturados.has(e.id)).length}/${entradas.length}</span>
        </h4>
        <ul class="dex-grid">${entradas.map((e) => dexTile(e, capturados)).join("")}</ul>
      </section>`;
  }

  /* Se parte en cajas de 30, como en el juego. La ultima queda incompleta
     igual que alli cuando la generacion no es multiplo de treinta. */
  let html = "";
  for (let i = 0; i < entradas.length; i += POR_CAJA) {
    const tanda = entradas.slice(i, i + POR_CAJA);
    const tengoEnCaja = tanda.filter((e) => capturados.has(e.id)).length;
    html += `
      <section class="dex-caja" style="--filas:${Math.ceil(tanda.length / 6)}">
        <h4 class="dex-caja-titulo">
          <span>Box ${Math.floor(i / POR_CAJA) + 1}</span>
          <span class="dex-caja-cuenta">${tengoEnCaja}/${tanda.length}</span>
        </h4>
        <ul class="dex-grid">${tanda.map((e) => dexTile(e, capturados)).join("")}</ul>
      </section>`;
  }
  return html;
}

/* Repinta solo las cajas, sin recalcular nada: es lo que corre al escribir */
function repintarCajas() {
  if (!dexUltima) return;
  const grid = panelEl.querySelector("#dexCajas");
  if (!grid) return;

  const { entradas, capturados } = dexUltima;
  const filtrando = Boolean(dexBusqueda.trim()) || dexFiltro !== "todos";
  grid.innerHTML = cajasHTML(entradasFiltradas(entradas, capturados), capturados, filtrando);
}

/* Resumen de las diez regiones, para la Nacional: cuanto llevas en cada una
   sin tener que entrar pestaña por pestaña. Se calcula con las mismas
   funciones que pintan cada Pokedex, asi que los numeros son los suyos. */
function resumenPorRegion(especies, variantes) {
  return generacionesReales().map((sec) => {
    const entradas = entradasDe(sec, especies, variantes);
    const capturados = modoShiny
      ? shinyDe(sec, entradas, variantes)
      : capturadosDe(sec, entradas, variantes);
    const tengo = entradas.filter((e) => capturados.has(e.id)).length;

    return {
      id: sec.id,
      region: sec.region,
      generacion: sec.generation,
      color: colorDe(sec),
      tengo,
      total: entradas.length
    };
  });
}

function resumenHTML(filas) {
  return `
    <section class="resumen">
      <h3 class="section-label">Por region</h3>
      <ul class="resumen-lista">
        ${filas.map((f) => {
          const pct = f.total ? Math.round((f.tengo / f.total) * 100) : 0;
          return `
            <li>
              <button type="button" class="resumen-fila" data-id="${f.id}"
                      style="--tono:${f.color}">
                <span class="resumen-roman">${roman(f.generacion)}</span>
                <span class="resumen-region">${f.region}</span>
                <span class="resumen-barra" aria-hidden="true">
                  <span style="width:${pct}%"></span>
                </span>
                <span class="resumen-cuenta">${f.tengo}/${f.total}</span>
                <span class="resumen-pct">${pct}%</span>
              </button>
            </li>`;
        }).join("")}
      </ul>
    </section>`;
}

async function renderDex(gen, token) {
  const grid = panelEl.querySelector("#dexCajas");
  if (!grid) return;

  const [especies, variantes] = await Promise.all([fetchSpecies(), fetchVariantes()]);
  if (token !== renderToken) return;

  if (!especies.length) {
    grid.outerHTML = `<p class="dex-error">No se pudo cargar la lista de especies.
      Hace falta conexion la primera vez; despues queda guardada en el navegador.</p>`;
    return;
  }

  const entradas = entradasDe(gen, especies, variantes);
  const capturados = modoShiny
    ? shinyDe(gen, entradas, variantes)
    : capturadosDe(gen, entradas, variantes);

  if (!entradas.length) {
    const seccion = grid.closest(".dex-section");
    seccion.innerHTML = `
      <h3 class="section-label">Pokedex de ${gen.region}</h3>
      <p class="dex-error">Todavia no hay datos de esta generacion en PokeAPI.
        Apareceran solos en cuanto se publiquen.</p>`;
    return;
  }

  dexUltima = { gen, entradas, capturados };

  /* La Nacional lleva ademas el desglose por region, encima de las cajas */
  const hueco = panelEl.querySelector("#dexResumen");
  if (hueco) hueco.innerHTML = gen.nacional ? resumenHTML(resumenPorRegion(especies, variantes)) : "";

  repintarCajas();

  const tengo = entradas.filter((e) => capturados.has(e.id)).length;
  const total = entradas.length;
  const pct = total ? Math.round((tengo / total) * 100) : 0;

  document.title = tituloDe(gen, tengo, total);
  actualizarEntradilla();

  const marcador = panelEl.querySelector(".dex-count");
  if (marcador) marcador.textContent = tengo + " / " + total;
  const barra = panelEl.querySelector(".dex-bar-fill");
  if (barra) barra.style.width = pct + "%";
  const pctEl = panelEl.querySelector(".dex-pct");
  if (pctEl) pctEl.textContent = pct + "%";
}

/* ---------- Render ---------- */

function typeChips(types) {
  return types
    .map((t) => `<li class="type-chip t-${t}">${TYPE_ES[t] || t}</li>`)
    .join("");
}

function ballMark(mon) {
  if (!mon.ball) return "";
  const label = "Capturado en " + (BALL_ES[mon.ball] || mon.ball);
  return `<img class="ball-mark" loading="lazy" src="${ITEMS}/${mon.ball}.png"
                 alt="${label}" title="${label}">`;
}

/* Ultimo numero de la Pokedex de cada generacion, para deducir de donde
   sale un favorito que no este en ninguno de tus equipos. */
const CORTES_DEX = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
const GEN_DE_FORMA = { alola: 7, galar: 8, hisui: 8, paldea: 9, mega: 6, gmax: 8 };

function generacionDe(mon) {
  /* 1º: la generacion en la que tu lo usaste. Champions no cuenta: es un
     juego aparte, no una generacion, y devolveria un "XI" que no existe. */
  const enEquipo = generacionesReales().find((s) => s.team.some(
    (m) => m.dex === mon.dex && (m.form || "") === (mon.form || "")
  ));
  if (enEquipo) return enEquipo.generation;

  /* 2º: si es una forma regional, la generacion que la introdujo */
  if (mon.form) {
    const region = Object.keys(GEN_DE_FORMA).find((r) => mon.form.startsWith(r));
    if (region) return GEN_DE_FORMA[region];
  }

  /* 3º: la generacion de la especie, por su numero de Pokedex */
  const i = CORTES_DEX.findIndex((tope) => mon.dex <= tope);
  return i === -1 ? null : i + 1;
}

/* En el Salon de la Fama, en vez del contador "01 / 06" se muestra de que
   generacion viene cada favorito. */
function plateLabel(mon, index, section) {
  if (!section.hall) return plateNum(index + 1) + " / 06";
  const gen = generacionDe(mon);
  return gen ? "Gen " + roman(gen) : plateNum(index + 1);
}

/* Asa para arrastrar. Va aparte del resto de la lamina para que en movil
   se pueda seguir haciendo scroll tocando cualquier otro sitio. */
function asaDeArrastre(index, section) {
  if (typeof esMiPerfil !== "function" || !esMiPerfil()) return "";
  if (section.team.length < 2) return "";

  return `
    <button type="button" class="plate-asa" data-desde="${index}"
            title="Arrastra para cambiarlo de sitio" aria-label="Arrastrar para reordenar">
      <i class="fa-solid fa-up-down-left-right"></i>
    </button>`;
}

function plate(mon, index, section) {
  const g = GENDER[mon.gender] || GENDER.n;
  const nickname = mon.nickname && mon.nickname.trim() ? mon.nickname.trim() : "";
  const title = nickname || mon.species;

  return `
    <article class="plate${typeof esMiPerfil === "function" && esMiPerfil() ? " editable" : ""}"
             data-slot="${index}">
      <div class="plate-figure">
        <img class="plate-img" loading="lazy" alt="${mon.species}"
             src="${spriteSrc(mon)}" data-fallback="${spriteAlt(mon)}">
        ${ballMark(mon)}
        ${mon.form ? `<span class="form-mark" title="${formName(mon)}">${formLabel(mon.form)}</span>` : ""}
        ${asaDeArrastre(index, section)}
      </div>
      <div class="plate-index">
        <span class="num">${plateLabel(mon, index, section)}</span>
        <span>${dexNum(mon.dex)}</span>
      </div>
      <h3 class="plate-name">${title}</h3>
      <p class="plate-species">
        ${nickname ? (mon.form ? formName(mon) : mon.species) + '<span class="sep">·</span>' : ""}
        <span class="gender ${mon.gender || "n"}" role="img"
              title="${g.label}" aria-label="${g.label}">${g.icon}</span>
        ${mon.shiny ? '<i class="fa-solid fa-star plate-shiny" title="Shiny" aria-label="Shiny"></i>' : ""}
      </p>
      <ul class="plate-types">${typeChips(mon.types || [])}</ul>
    </article>`;
}

function emptyPlate(index, section) {
  const mio = typeof esMiPerfil === "function" && esMiPerfil();
  const tope = section && section.hall ? TOPE_FAVORITOS : 6;
  const etiqueta = plateNum(index + 1) + " / " + plateNum(tope);

  return `
    <article class="plate plate-empty${mio ? " editable" : ""}" data-slot="${index}"
            ${mio ? ' role="button" tabindex="0"' : ""}>
      <div class="plate-figure"><span class="empty-mark">${mio ? "+" : "—"}</span></div>
      <div class="plate-index">
        <span class="num">${etiqueta}</span>
        <span>#————</span>
      </div>
      <h3 class="plate-name">${mio ? "Añadir" : "Sin registrar"}</h3>
    </article>`;
}

/* Modo de la Pokedex: normal o variocolor. Se conserva al cambiar de pestaña. */
let modoShiny = false;
let genEnPantalla = null;

/* Cada render lleva numero. Si llega tarde una respuesta de PokeAPI de la
   generacion anterior, se descarta en vez de pintar sobre la nueva. */
let renderToken = 0;

function hallHead(sec) {
  return `
    <header class="gen-head">
      <p class="eyebrow">Salon de la Fama</p>
      <h2 class="gen-title">${sec.title || "Mis favoritos"}</h2>
      <p class="gen-meta">
        ${sec.subtitle || "De todas las regiones"}
        <span class="dot">·</span>
        ${sec.team.length} ${sec.team.length === 1 ? "elegido" : "elegidos"}
      </p>
    </header>`;
}

/* El juego elegido en el perfil manda sobre lo que diga data/teams.js */
function juegoDeGen(gen) {
  if (typeof JUEGOS_ELEGIDOS === "undefined" || typeof juegoDe !== "function") return null;
  /* juegoDe devuelve la primera version de la generacion cuando no hay
     eleccion guardada o cuando la guardada ya no esta en el catalogo */
  return juegoDe(gen.generation, JUEGOS_ELEGIDOS.get(gen.generation));
}

/* ---------- Tema claro / oscuro ---------- */

const TEMA_CLAVE = "pkmnteam:tema";

function temaActual() {
  return document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro";
}

/* Luminancia relativa de WCAG, para poder medir el contraste de verdad */
function luminancia([r, g, b]) {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contraste(a, b) {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
}

function aRgb(hex) {
  const h = hex.replace("#", "");
  const largo = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(largo.slice(i, i + 2), 16));
}

/* Los colores de los juegos estan elegidos sobre negro: el blanco de Teselia
   o el gris de la Nacional desaparecerian sobre fondo claro. Se oscurecen lo
   justo para que se lean, conservando el tono. */
function acentoLegible(hex, fondo) {
  let rgb = aRgb(hex);
  for (let i = 0; i < 24 && contraste(rgb, fondo) < 4.5; i++) {
    rgb = rgb.map((v) => Math.max(0, Math.round(v * 0.9)));
  }
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* El acento que toca segun el tema */
function acentoDelTema(hex) {
  if (temaActual() !== "claro") return hex;
  return acentoLegible(hex, [230, 227, 219]);   /* el --bg del modo claro */
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema === "claro" ? "claro" : "oscuro";
  try { localStorage.setItem(TEMA_CLAVE, temaActual()); } catch { /* modo privado */ }

  const boton = document.getElementById("temaBoton");
  if (boton) {
    const claro = temaActual() === "claro";
    boton.setAttribute("aria-pressed", String(claro));
    boton.title = claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
    boton.setAttribute("aria-label", boton.title);
  }

  /* El acento se recalcula: es el unico color que depende del tema por JS */
  if (genEnPantalla) {
    document.documentElement.style.setProperty("--accent", acentoDelTema(colorDe(genEnPantalla)));
  }
}

function conectarTema() {
  const boton = document.getElementById("temaBoton");
  if (boton) boton.addEventListener("click", () => {
    aplicarTema(temaActual() === "claro" ? "oscuro" : "claro");
  });
  aplicarTema(temaActual());
}

function colorDe(gen) {
  const j = juegoDeGen(gen);
  return (j && j.color) || gen.color || "#ff5a4d";
}

function nombreJuegoDe(gen) {
  const j = juegoDeGen(gen);
  return j ? j.name : "";
}

/* El juego se elige en el perfil; aqui solo se enseña cual es */
function selectorDeJuego(gen) {
  const n = nombreJuegoDe(gen);
  return n ? '<span class="dot">·</span> <b>' + n + "</b>" : "";
}

function champHead(gen) {
  return `
    <header class="gen-head">
      <p class="eyebrow">Team Actual</p>
      <h2 class="gen-title">${gen.title || gen.region}</h2>
      <p class="gen-meta">Equipo de ${gen.team.length} de 6</p>
    </header>`;
}

function nacionalHead(gen) {
  return `
    <header class="gen-head">
      <p class="eyebrow">Todas las regiones</p>
      <h2 class="gen-title">${gen.title || "Pokedex Nacional"}</h2>
      <p class="gen-meta">Las diez generaciones juntas</p>
    </header>`;
}

function genHead(gen) {
  return `
    <header class="gen-head">
      <span class="gen-watermark" aria-hidden="true">${roman(gen.generation)}</span>
      <p class="eyebrow">Team ${plateNum(gen.generation)}</p>
      <h2 class="gen-title">${ORDINAL[gen.generation] || gen.generation} generacion</h2>
      <p class="gen-meta">
        Region <b>${gen.region}</b>
        ${selectorDeJuego(gen)}
        <span class="dot">·</span>
        ${gen.team.length} de 6 registrados
      </p>
    </header>`;
}

function renderGeneration(gen) {
  const token = ++renderToken;
  document.documentElement.style.setProperty("--accent", acentoDelTema(colorDe(gen)));

  /* Una generacion siempre enseña seis huecos; el Salon de la Fama, los que haya. */
  const mostrados = gen.team.slice(0, gen.hall ? TOPE_FAVORITOS : 6);
  const filled = mostrados.map((m, i) => plate(m, i, gen)).join("");
  /* Seis sitios en una generacion, nueve en favoritos */
  const tope = gen.hall ? TOPE_FAVORITOS : 6;
  const huecos = Math.max(0, tope - gen.team.length);

  const empty = Array.from({ length: huecos },
    (_, i) => emptyPlate(gen.team.length + i, gen)).join("");

  const cuerpo = `<div class="plates">${filled}${empty}</div>`;

  /* Solo las generaciones llevan Pokedex; el Salon de la Fama no */
  const puedeEditar = typeof esMiPerfil === "function" && esMiPerfil();
  const vaciar = puedeEditar && gen.team.length
    ? '<button type="button" class="boton" id="vaciarEquipo">Vaciar equipo</button>'
    : "";

  if (gen.soloEquipo) {
    panelEl.innerHTML = champHead(gen) + cuerpo;
    genEnPantalla = gen;
    wireSprites();
    fillMissingTypes(gen, token);
    return;
  }

  /* La Nacional es lo contrario que Champions: Pokedex y nada de equipo */
  const equipo = (gen.hall || gen.nacional) ? (gen.nacional ? "" : cuerpo) : `
    <div class="section-head">
      <h3 class="section-label">Equipo campeon</h3>
      ${vaciar}
    </div>
    ${cuerpo}`;

  const dex = gen.hall ? "" : `
    <section class="dex-section">
      <div class="section-head">
        <h3 class="section-label">${gen.nacional ? "Pokedex Nacional" : "Pokedex de " + gen.region}</h3>
        <div class="dex-modos" role="tablist" aria-label="Tipo de Pokedex">
          <button class="dex-modo" type="button" role="tab" data-modo="normal"
                  aria-selected="${!modoShiny}">Normal</button>
          <button class="dex-modo" type="button" role="tab" data-modo="shiny"
                  aria-selected="${modoShiny}">Shiny</button>
        </div>
        ${puedeEditar ? `
          <details class="dex-masivo">
            <summary class="dex-masivo-abrir" title="Marcar o desmarcar la region entera">Accion</summary>
            <div class="dex-masivo-opciones">
              <button type="button" class="boton" id="dexTodos">Marcar todos</button>
              <button type="button" class="boton" id="dexNinguno">Desmarcar todos</button>
            </div>
          </details>` : ""}
        <p class="dex-progress">
          <span class="dex-count">...</span>
          <span class="dex-pct">0%</span>
        </p>
      </div>
      <div class="dex-bar"><span class="dex-bar-fill"></span></div>
      <div id="dexResumen"></div>
      <div class="dex-buscador">
        <input type="search" id="dexBuscar" class="dex-buscar" autocomplete="off"
               placeholder="Buscar por nombre o numero..." aria-label="Buscar en la Pokedex"
               value="${dexBusqueda.replace(/"/g, "&quot;")}">
        <div class="dex-filtros" role="tablist" aria-label="Que Pokemon mostrar">
          <button class="dex-filtro" type="button" role="tab" data-filtro="todos"
                  aria-selected="${dexFiltro === "todos"}">Todos</button>
          <button class="dex-filtro" type="button" role="tab" data-filtro="faltan"
                  aria-selected="${dexFiltro === "faltan"}">Me faltan</button>
          <button class="dex-filtro" type="button" role="tab" data-filtro="tengo"
                  aria-selected="${dexFiltro === "tengo"}">Los tengo</button>
        </div>
      </div>
      ${puedeEditar && !ayudaAprendida() ? '<p class="dex-ayuda">Arrastra por encima para marcar varias de una vez.</p>' : ""}
      <div class="dex-cajas" id="dexCajas"></div>
    </section>`;

  panelEl.innerHTML = (gen.hall ? hallHead(gen)
    : gen.nacional ? nacionalHead(gen)
    : genHead(gen)) + equipo + dex;

  genEnPantalla = gen;
  wireSprites();
  fillMissingTypes(gen, token);
  if (!gen.hall) renderDex(gen, token);
}

/* Si el artwork no existe, cae al sprite pixelado */
function wireSprites() {
  panelEl.querySelectorAll(".plate-img").forEach((img) => {
    img.addEventListener("error", function onErr() {
      this.removeEventListener("error", onErr);
      this.src = this.dataset.fallback;
    });
  });
}

/* Completa lo que no viene en teams.js: la imagen de las formas regionales
   y los tipos de quien no los declara. */
async function fillMissingTypes(gen, token) {
  for (let i = 0; i < gen.team.length; i++) {
    const mon = gen.team[i];
    const slot = panelEl.querySelectorAll(".plate")[i];
    if (!slot) continue;

    const faltanTipos = !mon.types || !mon.types.length;

    if (mon.form) {
      const info = await fetchVariant(variantSlug(mon));
      if (token !== renderToken) return;
      if (info) {
        const img = variantImage(info, mon);
        if (img) {
          const el = slot.querySelector(".plate-img");
          el.dataset.fallback = spriteSrc(mon);
          el.src = img;
        }
        if (faltanTipos && info.types.length) {
          mon.types = info.types;
          slot.querySelector(".plate-types").innerHTML = typeChips(info.types);
        }
        continue;
      }
    }

    if (faltanTipos) {
      const types = await fetchTypes(mon.dex);
      if (token !== renderToken) return;
      if (!types.length) continue;
      mon.types = types;
      slot.querySelector(".plate-types").innerHTML = typeChips(types);
    }
  }
}

/* ---------- Navegacion ---------- */

/* El titulo lleva el progreso de la region: "Kanto 105/151 — POKEHDEX".
   Los numeros no se saben hasta que la Pokedex termina de cargar, asi que
   primero se pone el nombre y luego se completa. */
function tituloDe(gen, tengo, total) {
  const cola = " — POKEHDEX";
  /* Sin sesion la puerta tapa la pagina: enseñar ahi la region que se este
     pintando por detras no tiene sentido */
  if (!gen || !document.body.classList.contains("con-sesion")) return "POKEHDEX";
  if (gen.hall || gen.soloEquipo) return (gen.title || gen.region) + cola;
  if (gen.nacional && total == null) return (gen.title || gen.region) + cola;
  if (total == null) return gen.region + cola;
  return gen.region + " " + (modoShiny ? "★ " : "") + tengo + "/" + total + cola;
}

function selectGeneration(id, push = true) {
  const gen = TEAMS.find((g) => g.id === id) || TEAMS[0];

  navEl.querySelectorAll(".index-item").forEach((item) => {
    item.setAttribute("aria-selected", String(item.dataset.id === gen.id));
  });

  renderGeneration(gen);

  /* Aqui y no dentro de renderDex: Favoritos y Champions no tienen Pokedex,
     y si no la entradilla se quedaba con el texto de reserva */
  actualizarEntradilla();

  if (push) history.replaceState(null, "", "#" + gen.id);
  document.title = tituloDe(gen);
}

function buildIndex() {
  navEl.innerHTML = TEAMS.map((g) => `
    <button class="index-item${g.hall || g.soloEquipo || g.nacional ? " index-hall" : ""}" role="tab" type="button"
            data-id="${g.id}" aria-selected="false">
      <span class="roman">${g.hall ? '<i class="fa-solid fa-heart"></i>'
        : g.soloEquipo ? '<i class="fa-solid fa-trophy"></i>'
        : g.nacional ? '<i class="fa-solid fa-globe"></i>' : roman(g.generation)}</span>
      <span class="region">${g.hall ? "Favoritos" : g.region}</span>
    </button>`).join("");

  navEl.addEventListener("click", (e) => {
    const item = e.target.closest(".index-item");
    if (item) selectGeneration(item.dataset.id);
  });
}

/* Buscador y filtro de la Pokedex */
function conectarBuscador() {
  let temporizador = null;

  panelEl.addEventListener("input", (e) => {
    const campo = e.target.closest("#dexBuscar");
    if (!campo) return;

    /* Se espera un poco a que pares de escribir: repintar mil casillas en
       cada tecla se nota, y casi siempre la siguiente letra llega antes. */
    dexBusqueda = campo.value;
    clearTimeout(temporizador);
    temporizador = setTimeout(repintarCajas, 150);
  });

  panelEl.addEventListener("click", (e) => {
    const fila = e.target.closest(".resumen-fila");
    if (fila) return selectGeneration(fila.dataset.id);

    const boton = e.target.closest(".dex-filtro");
    if (!boton || boton.dataset.filtro === dexFiltro) return;

    dexFiltro = boton.dataset.filtro;
    panelEl.querySelectorAll(".dex-filtro").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.filtro === dexFiltro));
    });
    repintarCajas();
  });
}

/* Cambio entre Pokedex normal y variocolor */
function conectarModos() {
  panelEl.addEventListener("click", (e) => {
    const boton = e.target.closest(".dex-modo");
    if (!boton) return;

    const quiereShiny = boton.dataset.modo === "shiny";
    if (quiereShiny === modoShiny) return;

    modoShiny = quiereShiny;
    panelEl.querySelectorAll(".dex-modo").forEach((b) => {
      b.setAttribute("aria-selected", String((b.dataset.modo === "shiny") === modoShiny));
    });

    const grid = panelEl.querySelector("#dexCajas");
    if (grid) grid.innerHTML = "";
    if (genEnPantalla) renderDex(genEnPantalla, renderToken);
  });
}

/* Marcar y desmarcar desde la propia Pokedex, solo en el perfil propio */
/* ---------- Editor de un hueco del equipo ---------- */

let editando = null;   // { seccion, indice }

function opcionesDeBall() {
  return Object.entries(BALL_ES)
    .map(([id, nombre]) => '<option value="' + id + '">' + nombre + "</option>")
    .join("");
}

/* El buscador son 1025 <option> y siempre los mismos: montarlos de nuevo en
   cada apertura era lo que trababa el editor al abrirlo en el movil. Se hace
   una sola vez y a partir de ahi la ventana abre al momento. */
let listaMontada = false;

async function montarListaEspecies() {
  if (listaMontada) return;

  const especies = await fetchSpecies();
  if (!especies.length) return;   // sin lista todavia: se reintenta al abrir

  document.getElementById("monLista").innerHTML = especies
    .map(([id, slug]) => '<option value="' + nombreEspecie(slug) + '" data-dex="' + id +
      '" data-slug="' + slug + '">')
    .join("");
  listaMontada = true;
}

async function abrirEditor(seccion, indice) {
  editando = { seccion, indice };
  const mon = seccion.team[indice] || null;
  const dlg = document.getElementById("monEditor");

  /* Primero lo que no depende de PokeAPI, para que la ventana salga ya */
  document.getElementById("monEspecie").value = mon ? mon.species : "";
  document.getElementById("monApodo").value = mon ? mon.nickname || "" : "";
  document.getElementById("monBall").value = mon && mon.ball ? mon.ball : "poke-ball";
  document.getElementById("monShiny").checked = Boolean(mon && mon.shiny);
  document.querySelectorAll(".mon-genero").forEach((b) => {
    b.setAttribute("aria-pressed", String((mon ? mon.gender : "m") === b.dataset.genero));
  });

  document.getElementById("monForma").innerHTML = "";
  document.getElementById("monFormaCampo").hidden = true;
  document.getElementById("monBorrar").hidden = !mon;
  document.getElementById("monTitulo").textContent =
    (mon ? "Editar" : "Añadir") + " · hueco " + plateNum(indice + 1);
  document.getElementById("monMensaje").textContent = "";

  dlg.hidden = false;
  document.getElementById("monEspecie").focus();

  /* Y ya con la ventana abierta, lo que puede tardar */
  await montarListaEspecies();

  /* Se puede haber cerrado o cambiado de hueco mientras tanto */
  if (!editando || editando.seccion !== seccion || editando.indice !== indice) return;

  const especies = await fetchSpecies();
  const slugActual = mon
    ? (especies.find(([id]) => id === mon.dex) || [])[1]
    : null;
  await pintarFormas(slugActual, mon ? mon.form : null);
}

/* Busca las variantes de una especie en el listado completo de PokeAPI:
   todo lo que empieza por "sunombre-" es una forma suya. */
async function pintarFormas(slugEspecie, formaActual) {
  const campo = document.getElementById("monFormaCampo");
  const sel = document.getElementById("monForma");

  if (!slugEspecie) { campo.hidden = true; sel.innerHTML = ""; return; }

  const variantes = await fetchVariantes();
  const suyas = variantes
    .filter(([, slug]) => slug.startsWith(slugEspecie + "-"))
    .map(([, slug]) => slug.slice(slugEspecie.length + 1));

  if (!suyas.length) { campo.hidden = true; sel.innerHTML = ""; return; }

  sel.innerHTML = '<option value="">Normal</option>' + suyas.map((f) =>
    '<option value="' + f + '"' + (f === formaActual ? " selected" : "") + ">" +
    formLabel(f) + "</option>").join("");
  campo.hidden = false;
}

/* Del nombre escrito a su entrada del buscador */
function opcionDeEspecie() {
  const nombre = document.getElementById("monEspecie").value.trim().toLowerCase();
  return [...document.getElementById("monLista").options]
    .find((o) => o.value.toLowerCase() === nombre) || null;
}

function cerrarEditor() {
  editando = null;
  document.getElementById("monEditor").hidden = true;
}

function generoElegido() {
  const b = document.querySelector('.mon-genero[aria-pressed="true"]');
  return b ? b.dataset.genero : "m";
}

async function guardarDelEditor(e) {
  e.preventDefault();
  if (!editando) return;

  const aviso = document.getElementById("monMensaje");
  const nombre = document.getElementById("monEspecie").value.trim();
  const opcion = [...document.getElementById("monLista").options]
    .find((o) => o.value.toLowerCase() === nombre.toLowerCase());

  if (!opcion) { aviso.textContent = "Elige una especie de la lista."; return; }

  const forma = document.getElementById("monForma").value;
  const mon = {
    dex: Number(opcion.dataset.dex),
    species: opcion.value,
    nickname: document.getElementById("monApodo").value.trim(),
    gender: generoElegido(),
    form: forma || undefined,
    ball: document.getElementById("monBall").value,
    shiny: document.getElementById("monShiny").checked
  };

  aviso.textContent = "Guardando...";
  const res = await guardarMon(editando.seccion, editando.indice, mon);
  if (!res.ok) { aviso.textContent = "No se pudo guardar: " + res.error; return; }

  const seccion = editando.seccion;
  cerrarEditor();
  selectGeneration(seccion.id, false);
}

async function borrarDelEditor() {
  if (!editando) return;
  const aviso = document.getElementById("monMensaje");

  aviso.textContent = "Borrando...";
  const res = await borrarMon(editando.seccion, editando.indice);
  if (!res.ok) { aviso.textContent = "No se pudo borrar: " + res.error; return; }

  const seccion = editando.seccion;
  cerrarEditor();
  selectGeneration(seccion.id, false);
}

/* ---------- Arrastrar para reordenar ---------- */

let arrastre = null;      // { origen, desde, offsetX, offsetY }
let huboArrastre = false;

const laminasVisibles = () =>
  [...panelEl.querySelectorAll(".plate:not(.plate-empty)")];

/* Sobre que lamina esta el puntero */
function laminaBajo(x, y) {
  return laminasVisibles().find((el) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;
}

function marcarDestino(el) {
  laminasVisibles().forEach((p) => p.classList.toggle("destino", p === el));
}

function empezarArrastre(e) {
  const asa = e.target.closest(".plate-asa");
  if (!asa || !genEnPantalla) return;

  const origen = asa.closest(".plate");
  if (!origen) return;

  e.preventDefault();
  asa.setPointerCapture(e.pointerId);

  const r = origen.getBoundingClientRect();
  arrastre = {
    origen, asa,
    desde: Number(asa.dataset.desde),
    offsetX: e.clientX - r.left - r.width / 2,
    offsetY: e.clientY - r.top - r.height / 2
  };
  origen.classList.add("arrastrando");
}

function moverArrastre(e) {
  if (!arrastre) return;
  huboArrastre = true;

  const r = arrastre.origen.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2) - arrastre.offsetX;
  const dy = e.clientY - (r.top + r.height / 2) - arrastre.offsetY;
  arrastre.origen.style.transform = "translate(" + dx + "px, " + dy + "px)";

  /* La lamina que se arrastra no puede taparse a si misma */
  arrastre.origen.style.pointerEvents = "none";
  const destino = laminaBajo(e.clientX, e.clientY);
  arrastre.origen.style.pointerEvents = "";
  marcarDestino(destino && destino !== arrastre.origen ? destino : null);
}

async function soltarArrastre(e) {
  if (!arrastre) return;

  const { origen, desde } = arrastre;
  origen.style.pointerEvents = "none";
  const destino = laminaBajo(e.clientX, e.clientY);
  origen.style.pointerEvents = "";

  origen.classList.remove("arrastrando");
  origen.style.transform = "";
  marcarDestino(null);
  arrastre = null;

  if (!destino || destino === origen || !genEnPantalla) return;

  const hacia = Number(destino.dataset.slot);
  const res = await moverMon(genEnPantalla, desde, hacia);
  if (res.ok) selectGeneration(genEnPantalla.id, false);
}

function conectarArrastre() {
  panelEl.addEventListener("pointerdown", empezarArrastre);
  panelEl.addEventListener("pointermove", moverArrastre);
  panelEl.addEventListener("pointerup", soltarArrastre);
  panelEl.addEventListener("pointercancel", soltarArrastre);
}

function conectarEditor() {
  panelEl.addEventListener("click", async (e) => {
    /* Tras arrastrar llega un clic que abriria el editor sin querer */
    if (huboArrastre) { huboArrastre = false; e.stopPropagation(); return; }

    /* Vaciar pide confirmacion en el propio boton */
    const vaciar = e.target.closest("#vaciarEquipo");
    if (vaciar && genEnPantalla) {
      e.stopPropagation();
      if (vaciar.dataset.confirmando !== "si") {
        vaciar.dataset.confirmando = "si";
        vaciar.classList.add("peligro");
        vaciar.textContent = "¿Seguro? Pulsa otra vez";
        setTimeout(() => {
          if (!vaciar.isConnected) return;
          vaciar.dataset.confirmando = "";
          vaciar.classList.remove("peligro");
          vaciar.textContent = "Vaciar equipo";
        }, 4000);
        return;
      }
      const res = await vaciarEquipo(genEnPantalla);
      if (res.ok) selectGeneration(genEnPantalla.id, false);
      return;
    }

    const plate = e.target.closest(".plate.editable");
    if (!plate || !genEnPantalla) return;
    abrirEditor(genEnPantalla, Number(plate.dataset.slot));
  });

  document.getElementById("monBall").innerHTML = opcionesDeBall();

  /* Se monta el buscador en cuanto el navegador tenga un rato libre, sin
     competir con la primera pintada. Asi la primera apertura tampoco tiene
     que esperar a nada. Si no hay requestIdleCallback (Safari viejo), se
     hace un poco despues de cargar. */
  const alRatoLibre = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  alRatoLibre(() => montarListaEspecies());

  document.getElementById("monForm").addEventListener("submit", guardarDelEditor);

  document.getElementById("monEspecie").addEventListener("input", () => {
    const op = opcionDeEspecie();
    pintarFormas(op ? op.dataset.slug : null, null);
  });
  document.getElementById("monBorrar").addEventListener("click", borrarDelEditor);
  document.getElementById("monCancelar").addEventListener("click", cerrarEditor);

  document.querySelectorAll(".mon-genero").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".mon-genero").forEach((o) =>
        o.setAttribute("aria-pressed", String(o === b)));
    });
  });

  document.getElementById("monEditor").addEventListener("click", (e) => {
    if (e.target.id === "monEditor") cerrarEditor();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editando) cerrarEditor();
  });
}

/* Marcar o desmarcar la generacion entera, en el modo que este activo */
function conectarMarcadoMasivo() {
  panelEl.addEventListener("click", async (e) => {
    const todos = e.target.closest("#dexTodos");
    const ninguno = e.target.closest("#dexNinguno");
    if (!todos && !ninguno) return;
    if (typeof esMiPerfil !== "function" || !esMiPerfil()) return;

    const boton = todos || ninguno;
    const tener = Boolean(todos);

    /* Desmarcar borra el avance de toda una region: se pide confirmacion */
    if (!tener && boton.dataset.confirmando !== "si") {
      /* El rojo aparece solo aqui: mientras esta en reposo es un boton mas,
         y la alarma la da el paso que de verdad va a borrar algo. */
      boton.dataset.confirmando = "si";
      boton.classList.add("peligro");
      boton.textContent = "¿Seguro? Pulsa otra vez";
      setTimeout(() => {
        if (!boton.isConnected) return;
        boton.dataset.confirmando = "";
        boton.classList.remove("peligro");
        boton.textContent = "Desmarcar todos";
      }, 4000);
      return;
    }

    const ids = [...panelEl.querySelectorAll(".dex-tile[data-id]")]
      .map((t) => Number(t.dataset.id));
    if (!ids.length) return;

    boton.disabled = true;
    const previo = boton.textContent;
    boton.textContent = "Guardando...";

    const res = await marcarTodas(ids, modoShiny, tener);

    boton.disabled = false;
    boton.textContent = previo;

    if (!res.ok) { boton.textContent = "No se pudo guardar"; return; }
    if (genEnPantalla) renderDex(genEnPantalla, renderToken);
  });
}

function conectarMarcado() {
  panelEl.addEventListener("click", async (e) => {
    const tile = e.target.closest(".dex-tile");
    if (!tile || !tile.dataset.id) return;
    if (!puedoMarcar()) return;

    /* Con raton, el pincel ya marco esta casilla al pulsar */
    if (pincelUsado) { pincelUsado = false; return; }

    const id = Number(tile.dataset.id);
    const tenerlo = !tile.classList.contains("caught");

    tile.classList.toggle("caught", tenerlo);
    tile.classList.add("guardando");

    const res = await alternarCaptura(id, modoShiny, tenerlo);

    tile.classList.remove("guardando");
    if (!res.ok) {
      tile.classList.toggle("caught", !tenerlo);
      tile.classList.add("fallo");
      setTimeout(() => tile.classList.remove("fallo"), 1200);
      return;
    }
    if (genEnPantalla) actualizarMarcadorDex(genEnPantalla);
  });
}

/* ---------- Marcar varias arrastrando ---------- */

/* La linea de ayuda solo sirve hasta que lo descubres. Se cuenta cuantas
   veces has arrastrado de verdad y a la tercera deja de salir. */
const AYUDA_CLAVE = "pkmnteam:ayudaPincel";
const AYUDA_VECES = 3;

function ayudaAprendida() {
  try { return Number(localStorage.getItem(AYUDA_CLAVE) || 0) >= AYUDA_VECES; }
  catch { return false; }   /* modo privado: se sigue enseñando */
}

function apuntarUsoDelPincel() {
  try {
    const n = Number(localStorage.getItem(AYUDA_CLAVE) || 0) + 1;
    localStorage.setItem(AYUDA_CLAVE, String(n));
    if (n >= AYUDA_VECES) {
      const ayuda = panelEl.querySelector(".dex-ayuda");
      if (ayuda) ayuda.remove();
    }
  } catch { /* sin localStorage no pasa nada */ }
}

/* El primer Pokemon que tocas decide que hace el resto del arrastre: si
   estaba sin marcar, se marca todo lo que pises; si estaba marcado, se
   desmarca. Es como el rellenar arrastrando de una hoja de calculo. */
let pincel = null;        // { tener, tocadas: Map<id, tile>, ultimo: {x, y} }
let pincelEspera = null;  // temporizador del toque largo en tactil
let pincelOrigen = null;  // desde donde empezo el dedo, para saber si es scroll
let pincelUsado = false;  // para tragarse el clic que llega despues

function puedoMarcar() {
  return typeof esMiPerfil === "function" && esMiPerfil();
}

/* El navegador no manda un evento por pixel: en un arrastre rapido puede
   saltar de una casilla a otra tres columnas mas alla. Asi que se recorre a
   mano la linea entre el punto anterior y el nuevo, a pasos cortos, para no
   dejarse ninguna por el camino. */
function pintarCamino(x, y) {
  const desde = pincel.ultimo || { x, y };
  const dx = x - desde.x;
  const dy = y - desde.y;
  const largo = Math.hypot(dx, dy);

  /* Un paso de 16px: mas fino que cualquier casilla, hasta en movil */
  const pasos = Math.max(1, Math.ceil(largo / 16));
  for (let i = 1; i <= pasos; i++) {
    const px = desde.x + (dx * i) / pasos;
    const py = desde.y + (dy * i) / pasos;
    const bajo = document.elementFromPoint(px, py);
    pintarCasilla(bajo && bajo.closest(".dex-tile"));
  }

  pincel.ultimo = { x, y };
}

function pintarCasilla(tile) {
  if (!pincel || !tile || !tile.dataset.id) return;

  const id = Number(tile.dataset.id);
  if (pincel.tocadas.has(id)) return;
  /* Las que ya estan como quieres dejarlas no se tocan */
  if (tile.classList.contains("caught") === pincel.tener) return;

  pincel.tocadas.set(id, tile);
  tile.classList.toggle("caught", pincel.tener);
  tile.classList.add("guardando");
  if (genEnPantalla) actualizarMarcadorDex(genEnPantalla);
}

function arrancarPincel(tile) {
  pincelEspera = null;
  pincel = { tener: !tile.classList.contains("caught"), tocadas: new Map(), ultimo: null };
  panelEl.classList.add("pintando");
  pintarCasilla(tile);
  const r = tile.getBoundingClientRect();
  pincel.ultimo = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function cancelarEspera() {
  clearTimeout(pincelEspera);
  pincelEspera = null;
  pincelOrigen = null;
}

/* Al soltar se guarda todo de una vez: arrastrar por treinta casillas son
   treinta cambios, pero una sola escritura. */
async function soltarPincel() {
  cancelarEspera();
  if (!pincel) return;

  const { tener, tocadas } = pincel;
  pincel = null;
  panelEl.classList.remove("pintando");

  if (!tocadas.size) return;
  pincelUsado = true;
  if (tocadas.size > 1) apuntarUsoDelPincel();

  const ids = [...tocadas.keys()];
  const res = await marcarTodas(ids, modoShiny, tener);

  tocadas.forEach((tile) => {
    tile.classList.remove("guardando");
    if (!res.ok) {
      tile.classList.toggle("caught", !tener);
      tile.classList.add("fallo");
      setTimeout(() => tile.classList.remove("fallo"), 1200);
    }
  });

  if (genEnPantalla) actualizarMarcadorDex(genEnPantalla);
  actualizarEntradilla();
}

function conectarPincel() {
  panelEl.addEventListener("pointerdown", (e) => {
    const tile = e.target.closest(".dex-tile");
    if (!tile || !tile.dataset.id || !puedoMarcar()) return;

    if (e.pointerType === "touch") {
      /* En tactil un arrastre normal es hacer scroll, asi que el pincel solo
         entra si mantienes el dedo quieto un momento sobre una casilla. */
      pincelOrigen = { x: e.clientX, y: e.clientY };
      pincelEspera = setTimeout(() => arrancarPincel(tile), 350);
    } else {
      arrancarPincel(tile);
    }
  });

  panelEl.addEventListener("pointermove", (e) => {
    /* Si el dedo se mueve antes de tiempo es que querias desplazar la pagina */
    if (pincelEspera && pincelOrigen) {
      const lejos = Math.abs(e.clientX - pincelOrigen.x) > 10 ||
                    Math.abs(e.clientY - pincelOrigen.y) > 10;
      if (lejos) cancelarEspera();
      return;
    }
    if (!pincel) return;

    /* En tactil el navegador manda todos los eventos a la casilla donde
       empezaste, asi que hay que mirar que hay debajo del dedo */
    pintarCamino(e.clientX, e.clientY);
  });

  /* Mientras se pinta, el dedo no debe arrastrar la pagina */
  panelEl.addEventListener("touchmove", (e) => {
    if (pincel) e.preventDefault();
  }, { passive: false });

  panelEl.addEventListener("pointerup", soltarPincel);
  panelEl.addEventListener("pointercancel", soltarPincel);
  panelEl.addEventListener("pointerleave", soltarPincel);
}

/* Recalcula contador, porcentaje y barra sin repintar toda la rejilla */
function actualizarMarcadorDex(gen) {
  const total = panelEl.querySelectorAll(".dex-tile").length;
  const tengo = panelEl.querySelectorAll(".dex-tile.caught").length;
  const pct = total ? Math.round((tengo / total) * 100) : 0;

  document.title = tituloDe(gen, tengo, total);
  actualizarEntradilla();

  const c = panelEl.querySelector(".dex-count");
  const p = panelEl.querySelector(".dex-pct");
  const b = panelEl.querySelector(".dex-bar-fill");
  if (c) c.textContent = tengo + " / " + total;
  if (p) p.textContent = pct + "%";
  if (b) b.style.width = pct + "%";
}

/* Repinta la generacion en pantalla, para cuando llegan los datos del perfil */
function refrescarTodo() {
  if (genEnPantalla) selectGeneration(genEnPantalla.id, false);
}

function init() {
  /* admin.html reutiliza las funciones de este archivo pero no tiene estos
     elementos, asi que aqui no hay nada que montar */
  if (!navEl || !panelEl) return;

  if (typeof TEAMS === "undefined" || !Array.isArray(TEAMS) || !TEAMS.length) {
    panelEl.innerHTML = "<p class='gen-meta'>No hay equipos en <code>data/teams.js</code>.</p>";
    return;
  }
  buildIndex();
  conectarTema();
  conectarModos();
  conectarBuscador();
  conectarMarcado();
  conectarPincel();
  conectarMarcadoMasivo();
  conectarEditor();
  conectarArrastre();

  const fromHash = location.hash.slice(1);
  if (TEAMS.some((g) => g.id === fromHash)) return selectGeneration(fromHash, false);

  /* Sin favoritos todavia, no tiene sentido abrir la pagina en una seccion
     vacia: se cae a la primera generacion de verdad, no a Champions ni a la
     Nacional, que ahora van antes y despues de ellas en el indice. */
  const inicio = TEAMS.find((g) => g.hall && g.team.length)
    || generacionesReales()[0] || TEAMS[0];
  selectGeneration(inicio.id, false);
}

document.addEventListener("DOMContentLoaded", init);
