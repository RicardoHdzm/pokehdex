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

const TYPE_ES = {
  normal: "Normal", fire: "Fuego", water: "Agua", electric: "Electrico",
  grass: "Planta", ice: "Hielo", fighting: "Lucha", poison: "Veneno",
  ground: "Tierra", flying: "Volador", psychic: "Psiquico", bug: "Bicho",
  rock: "Roca", ghost: "Fantasma", dragon: "Dragon", dark: "Siniestro",
  steel: "Acero", fairy: "Hada"
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

/* Nombres en español de las Poke Balls (clave = archivo del sprite) */
const BALL_ES = {
  "poke-ball": "Poke Ball",       "great-ball": "Super Ball",
  "ultra-ball": "Ultra Ball",     "master-ball": "Master Ball",
  "premier-ball": "Honor Ball",   "luxury-ball": "Lujo Ball",
  "dusk-ball": "Ocaso Ball",      "quick-ball": "Veloz Ball",
  "net-ball": "Malla Ball",       "dive-ball": "Buceo Ball",
  "nest-ball": "Nido Ball",       "repeat-ball": "Acopio Ball",
  "timer-ball": "Turno Ball",     "heal-ball": "Sana Ball",
  "safari-ball": "Safari Ball",   "level-ball": "Nivel Ball",
  "lure-ball": "Cebo Ball",       "moon-ball": "Luna Ball",
  "friend-ball": "Amiga Ball",    "love-ball": "Amor Ball",
  "heavy-ball": "Peso Ball",      "fast-ball": "Rapid Ball",
  "dream-ball": "Ensueño Ball",   "beast-ball": "Ente Ball",
  "sport-ball": "Competi Ball",   "cherish-ball": "Gloria Ball",
  "park-ball": "Parque Ball"
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
  const guardado = leerLista(SPECIES_KEY);
  if (guardado && guardado.length > 900) return guardado;

  try {
    const res = await fetch(SPECIES_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const lista = data.results
      .map((r) => [Number(r.url.split("/").filter(Boolean).pop()), r.name])
      .filter(([id]) => id > 0)
      .sort((a, b) => a[0] - b[0]);
    guardarLista(SPECIES_KEY, lista);
    return lista;
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
  const guardado = leerLista(FORMAS_KEY);
  if (guardado && guardado.length > 1000) return guardado;

  try {
    const res = await fetch(FORMAS_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const lista = data.results
      .map((r) => [Number(r.url.split("/").filter(Boolean).pop()), r.name])
      .sort((a, b) => a[0] - b[0]);
    guardarLista(FORMAS_KEY, lista);
    return lista;
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

  const tengo = parseNumeros(gen.shinies);
  const ids = new Set(entradas.map((e) => e.id));

  /* Un Pokemon del equipo marcado como variocolor cuenta solo en esta lista */
  gen.team.forEach((m) => {
    if (m.shiny) tengo.add(idDeEquipo(m, variantes, ids));
  });

  const set = new Set();
  entradas.forEach((e) => { if (tengo.has(e.id)) set.add(e.id); });
  return set;
}

/* En teams.js se apuntan los que FALTAN. Todo lo demas se da por capturado,
   que para una Pokedex casi completa es mucho menos que escribir. */
function capturadosDe(gen, entradas, variantes) {
  /* Con sesion manda la base; el archivo solo sirve de arranque */
  if (typeof CAPTURAS !== "undefined" && perfilVisto) {
    const set = new Set();
    entradas.forEach((e) => { if (CAPTURAS.normal.has(e.id)) set.add(e.id); });
    return set;
  }

  const faltan = parseNumeros(gen.missing);
  const ids = new Set(entradas.map((e) => e.id));

  /* Si lo llevaste en el equipo lo tienes, aunque este en la lista de faltantes */
  gen.team.forEach((m) => faltan.delete(idDeEquipo(m, variantes, ids)));

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
    ? (modoShiny ? " - lo tienes variocolor" : " - capturado")
    : (modoShiny ? " - sin variocolor" : " - te falta");
  return `
    <li class="dex-tile${tengo ? " caught" : ""}${entrada.region ? " variante" : ""}"
        data-id="${entrada.id}" title="${etiqueta} ${entrada.nombre}${estado}">
      <img class="dex-sprite" loading="lazy" alt="" aria-hidden="true"
           src="${spriteDex(entrada.id)}">
      <span class="dex-num">${etiqueta}</span>
      <span class="dex-name">${entrada.nombre}</span>
    </li>`;
}

async function renderDex(gen, token) {
  const grid = panelEl.querySelector(".dex-grid");
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

  grid.innerHTML = entradas.map((e) => dexTile(e, capturados)).join("");

  const tengo = entradas.filter((e) => capturados.has(e.id)).length;
  const total = entradas.length;
  const pct = total ? Math.round((tengo / total) * 100) : 0;

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
  /* 1º: la generacion en la que tu lo usaste */
  const enEquipo = TEAMS.find((s) => !s.hall && s.team.some(
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

function plate(mon, index, section) {
  const g = GENDER[mon.gender] || GENDER.n;
  const nickname = mon.nickname && mon.nickname.trim() ? mon.nickname.trim() : "";
  const title = nickname || mon.species;

  return `
    <article class="plate${typeof esMiPerfil === "function" && esMiPerfil() ? " editable" : ""}"
             data-slot="${index}" style="animation-delay:${index * 70}ms">
      <div class="plate-figure">
        <img class="plate-img" loading="lazy" alt="${mon.species}"
             src="${spriteSrc(mon)}" data-fallback="${spriteAlt(mon)}">
        ${ballMark(mon)}
        ${mon.form ? `<span class="form-mark" title="${formName(mon)}">${formLabel(mon.form)}</span>` : ""}
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
        ${mon.shiny ? '<span class="plate-note">Ejemplar variocolor</span>' : ""}
      </p>
      <ul class="plate-types">${typeChips(mon.types || [])}</ul>
    </article>`;
}

function emptyPlate(index) {
  const mio = typeof esMiPerfil === "function" && esMiPerfil();
  return `
    <article class="plate plate-empty${mio ? " editable" : ""}" data-slot="${index}"
             style="animation-delay:${index * 70}ms"${mio ? ' role="button" tabindex="0"' : ""}>
      <div class="plate-figure"><span class="empty-mark">${mio ? "+" : "—"}</span></div>
      <div class="plate-index">
        <span class="num">${plateNum(index + 1)} / 06</span>
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
      <span class="gen-watermark" aria-hidden="true">RH</span>
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
  const elegido = JUEGOS_ELEGIDOS.get(gen.generation);
  return elegido ? juegoDe(gen.generation, elegido) : null;
}

function colorDe(gen) {
  const j = juegoDeGen(gen);
  return (j && j.color) || gen.color || "#ff5a4d";
}

function nombreJuegoDe(gen) {
  const j = juegoDeGen(gen);
  return j ? j.name : (gen.game || "");
}

/* Desplegable con los juegos de esa generacion, solo en el perfil propio */
function selectorDeJuego(gen) {
  const lista = (typeof GAMES !== "undefined" && GAMES[gen.generation]) || [];
  if (!lista.length) return "";

  const puedeElegir = typeof esMiPerfil === "function" && esMiPerfil();
  if (!puedeElegir) {
    const n = nombreJuegoDe(gen);
    return n ? '<span class="dot">·</span> <b>' + n + "</b>" : "";
  }

  const actual = juegoDeGen(gen);
  const opciones = lista.map((j) =>
    '<option value="' + j.id + '"' + (actual && actual.id === j.id ? " selected" : "") + ">" +
    j.name + "</option>").join("");

  return '<span class="dot">·</span> <select class="juego-select" id="juegoSel" ' +
         'aria-label="Juego de esta region">' + opciones + "</select>";
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
  document.documentElement.style.setProperty("--accent", colorDe(gen));

  /* Una generacion siempre enseña seis huecos; el Salon de la Fama, los que haya. */
  const mostrados = gen.hall ? gen.team : gen.team.slice(0, 6);
  const filled = mostrados.map((m, i) => plate(m, i, gen)).join("");
  const empty = gen.hall ? "" : Array.from({ length: Math.max(0, 6 - gen.team.length) },
    (_, i) => emptyPlate(gen.team.length + i)).join("");

  const cuerpo = gen.hall && !gen.team.length
    ? `<p class="hall-empty">Todavia no has elegido a tus favoritos.<br>
         Añadelos en <code>data/teams.js</code>, dentro de <code>id: "favoritos"</code>.</p>`
    : `<div class="plates">${filled}${empty}</div>`;

  /* Solo las generaciones llevan Pokedex; el Salon de la Fama no */
  const equipo = gen.hall ? cuerpo : `
    <h3 class="section-label">Equipo campeon</h3>
    ${cuerpo}`;

  const dex = gen.hall ? "" : `
    <section class="dex-section">
      <div class="section-head">
        <h3 class="section-label">Pokedex de ${gen.region}</h3>
        <div class="dex-modos" role="tablist" aria-label="Tipo de Pokedex">
          <button class="dex-modo" type="button" role="tab" data-modo="normal"
                  aria-selected="${!modoShiny}">Normal</button>
          <button class="dex-modo" type="button" role="tab" data-modo="shiny"
                  aria-selected="${modoShiny}">Shiny</button>
        </div>
        <p class="dex-progress">
          <span class="dex-count">...</span>
          <span class="dex-pct">0%</span>
        </p>
      </div>
      <div class="dex-bar"><span class="dex-bar-fill"></span></div>
      <ul class="dex-grid"></ul>
    </section>`;

  panelEl.innerHTML = (gen.hall ? hallHead(gen) : genHead(gen)) + equipo + dex;

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

function selectGeneration(id, push = true) {
  const gen = TEAMS.find((g) => g.id === id) || TEAMS[0];

  navEl.querySelectorAll(".index-item").forEach((item) => {
    item.setAttribute("aria-selected", String(item.dataset.id === gen.id));
  });

  renderGeneration(gen);
  if (push) history.replaceState(null, "", "#" + gen.id);
  document.title = gen.hall
    ? `${gen.title || "Mis favoritos"} — PPVDEX`
    : `${ORDINAL[gen.generation]} generacion · ${gen.region} — PPVDEX`;
}

function buildIndex() {
  navEl.innerHTML = TEAMS.map((g) => `
    <button class="index-item${g.hall ? " index-hall" : ""}" role="tab" type="button"
            data-id="${g.id}" aria-selected="false">
      <span class="roman">${g.hall ? '<i class="fa-solid fa-star"></i>' : roman(g.generation)}</span>
      <span class="region">${g.hall ? "Favoritos" : g.region}</span>
    </button>`).join("");

  navEl.addEventListener("click", (e) => {
    const item = e.target.closest(".index-item");
    if (item) selectGeneration(item.dataset.id);
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

    const grid = panelEl.querySelector(".dex-grid");
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

async function abrirEditor(seccion, indice) {
  editando = { seccion, indice };
  const mon = seccion.team[indice] || null;
  const dlg = document.getElementById("monEditor");

  /* La lista de especies alimenta el buscador */
  const especies = await fetchSpecies();
  document.getElementById("monLista").innerHTML = especies
    .map(([id, slug]) => '<option value="' + nombreEspecie(slug) + '" data-dex="' + id + '">')
    .join("");

  document.getElementById("monEspecie").value = mon ? mon.species : "";
  document.getElementById("monApodo").value = mon ? mon.nickname || "" : "";
  document.getElementById("monBall").value = mon && mon.ball ? mon.ball : "poke-ball";
  document.getElementById("monShiny").checked = Boolean(mon && mon.shiny);
  document.querySelectorAll(".mon-genero").forEach((b) => {
    b.setAttribute("aria-pressed", String((mon ? mon.gender : "m") === b.dataset.genero));
  });

  document.getElementById("monBorrar").hidden = !mon;
  document.getElementById("monTitulo").textContent =
    (mon ? "Editar" : "Añadir") + " · hueco " + plateNum(indice + 1);
  document.getElementById("monMensaje").textContent = "";

  dlg.hidden = false;
  document.getElementById("monEspecie").focus();
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

  const mon = {
    dex: Number(opcion.dataset.dex),
    species: opcion.value,
    nickname: document.getElementById("monApodo").value.trim(),
    gender: generoElegido(),
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

function conectarEditor() {
  panelEl.addEventListener("click", (e) => {
    const plate = e.target.closest(".plate.editable");
    if (!plate || !genEnPantalla) return;
    abrirEditor(genEnPantalla, Number(plate.dataset.slot));
  });

  document.getElementById("monForm").addEventListener("submit", guardarDelEditor);
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

function conectarSelectorJuego() {
  panelEl.addEventListener("change", async (e) => {
    if (e.target.id !== "juegoSel" || !genEnPantalla) return;

    const gen = genEnPantalla;
    const elegido = e.target.value;

    /* Se pinta el color al momento y luego se guarda */
    const juego = juegoDe(gen.generation, elegido);
    if (juego) document.documentElement.style.setProperty("--accent", juego.color);

    const res = await guardarJuego(gen.generation, elegido);
    if (!res.ok) {
      document.documentElement.style.setProperty("--accent", colorDe(gen));
      return;
    }
    buildIndex();
    selectGeneration(gen.id, false);
  });
}

function conectarMarcado() {
  panelEl.addEventListener("click", async (e) => {
    const tile = e.target.closest(".dex-tile");
    if (!tile || !tile.dataset.id) return;
    if (typeof esMiPerfil !== "function" || !esMiPerfil()) return;

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

/* Recalcula contador, porcentaje y barra sin repintar toda la rejilla */
function actualizarMarcadorDex(gen) {
  const total = panelEl.querySelectorAll(".dex-tile").length;
  const tengo = panelEl.querySelectorAll(".dex-tile.caught").length;
  const pct = total ? Math.round((tengo / total) * 100) : 0;

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
  conectarModos();
  conectarMarcado();
  conectarSelectorJuego();
  conectarEditor();

  const fromHash = location.hash.slice(1);
  if (TEAMS.some((g) => g.id === fromHash)) return selectGeneration(fromHash, false);

  /* Sin favoritos todavia, no tiene sentido abrir la pagina en una seccion vacia */
  const inicio = TEAMS.find((g) => !g.hall || g.team.length) || TEAMS[0];
  selectGeneration(inicio.id, false);
}

document.addEventListener("DOMContentLoaded", init);
