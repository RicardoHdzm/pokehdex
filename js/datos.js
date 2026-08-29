/* ============================================================
   DATOS DEL PERFIL CONTRA SUPABASE
   ------------------------------------------------------------
   En la base se guarda lo que SI se tiene, tanto normal como variocolor.
   La sintaxis de "missing" de data/teams.js solo se usa ya para la
   importacion inicial: a partir de ahi manda la base.
   ============================================================ */

/* Lo que tiene el perfil que se esta viendo */
const CAPTURAS = { normal: new Set(), shiny: new Set() };

/* Juego elegido por generacion: Map<generacion, game_id> */
const JUEGOS_ELEGIDOS = new Map();

/* De quien son los datos en pantalla. Si no es la sesion, es solo lectura. */
let perfilVisto = null;

const esMiPerfil = () => Boolean(sesion && perfilVisto && perfilVisto.id === sesion.user.id);

/* ---------- Lectura ---------- */

async function cargarCapturas(userId) {
  CAPTURAS.normal.clear();
  CAPTURAS.shiny.clear();
  if (!sb) return;

  /* PostgREST pagina de mil en mil, asi que se pide por tramos */
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    const { data, error } = await sb
      .from("catches")
      .select("dex_id, shiny")
      .eq("user_id", userId)
      .range(desde, desde + paso - 1);

    if (error) { console.warn("capturas:", error.message); return; }
    data.forEach((f) => (f.shiny ? CAPTURAS.shiny : CAPTURAS.normal).add(f.dex_id));
    if (data.length < paso) return;
  }
}

async function cargarJuegos(userId) {
  JUEGOS_ELEGIDOS.clear();
  if (!sb) return;

  const { data, error } = await sb
    .from("region_games")
    .select("generation, game_id")
    .eq("user_id", userId);

  if (error) { console.warn("juegos:", error.message); return; }
  data.forEach((f) => JUEGOS_ELEGIDOS.set(f.generation, f.game_id));
}

/* Equipos y favoritos: mandan los de la base. Un perfil recien creado los
   tiene vacios, y cada quien se los va montando. */
function filaAMon(f) {
  return {
    dex: f.dex_id, species: f.species, nickname: f.nickname || "",
    gender: f.gender || "n", form: f.form || undefined,
    ball: f.ball || undefined, shiny: Boolean(f.shiny)
  };
}

async function cargarEquipos(userId) {
  TEAMS.forEach((s) => { s.team = []; });
  if (!sb) return;

  const [eq, fav] = await Promise.all([
    sb.from("teams").select("generation, slot, dex_id, species, nickname, gender, form, ball, shiny")
      .eq("user_id", userId).order("generation").order("slot"),
    sb.from("favourites").select("position, dex_id, species, nickname, gender, form, ball, shiny")
      .eq("user_id", userId).order("position")
  ]);

  if (eq.error) console.warn("equipos:", eq.error.message);
  else {
    const porGen = new Map();
    eq.data.forEach((f) => {
      if (!porGen.has(f.generation)) porGen.set(f.generation, []);
      porGen.get(f.generation).push(filaAMon(f));
    });
    TEAMS.forEach((s) => { if (!s.hall) s.team = porGen.get(s.generation) || []; });
  }

  if (fav.error) console.warn("favoritos:", fav.error.message);
  else {
    const hall = TEAMS.find((s) => s.hall);
    if (hall) hall.team = fav.data.map(filaAMon);
  }
}

async function cargarPerfilCompleto(userId) {
  await Promise.all([cargarCapturas(userId), cargarJuegos(userId), cargarEquipos(userId)]);
}

/* ---------- Editar un hueco del equipo o de favoritos ---------- */

/* seccion es la del indice: la del Salon de la Fama va a otra tabla */
async function guardarMon(seccion, indice, mon) {
  if (!sb || !sesion) return { ok: false, error: "sin sesion" };

  /* El equipo es una lista sin huecos en medio. Si se pulsa un cuadro por
     encima del ultimo ocupado, el Pokemon entra al final: escribir en
     team[5] con la lista vacia crearia un array disperso de longitud 6,
     y entonces no quedarian huecos libres que pintar. */
  const i = Math.min(indice, seccion.team.length);

  const comun = {
    user_id: sesion.user.id, dex_id: mon.dex, species: mon.species,
    nickname: mon.nickname || null, gender: mon.gender || "n",
    form: mon.form || null, ball: mon.ball || null, shiny: Boolean(mon.shiny)
  };

  const { error } = seccion.hall
    ? await sb.from("favourites").upsert({ ...comun, position: i + 1 }, { onConflict: "user_id,position" })
    : await sb.from("teams").upsert({ ...comun, generation: seccion.generation, slot: i + 1 },
        { onConflict: "user_id,generation,slot" });

  if (error) return { ok: false, error: error.message };

  seccion.team[i] = mon;
  return { ok: true, indice: i };
}

/* Reescribe los huecos de una seccion tal y como esta el array en memoria.
   Primero mete los que hay y luego quita los que sobran, en ese orden: si
   fallara algo por el camino nunca se queda sin datos. */
async function guardarOrden(seccion) {
  if (!sb || !sesion) return { ok: false, error: "sin sesion" };

  const yo = sesion.user.id;
  /* filter(Boolean) por si quedara algun hueco suelto: un null aqui
     reventaria la insercion entera */
  seccion.team = seccion.team.filter(Boolean);
  const filas = seccion.team.map((m, i) => {
    const comun = {
      user_id: yo, dex_id: m.dex, species: m.species,
      nickname: m.nickname || null, gender: m.gender || "n",
      form: m.form || null, ball: m.ball || null, shiny: Boolean(m.shiny)
    };
    return seccion.hall
      ? { ...comun, position: i + 1 }
      : { ...comun, generation: seccion.generation, slot: i + 1 };
  });

  if (filas.length) {
    const { error } = seccion.hall
      ? await sb.from("favourites").upsert(filas, { onConflict: "user_id,position" })
      : await sb.from("teams").upsert(filas, { onConflict: "user_id,generation,slot" });
    if (error) return { ok: false, error: error.message };
  }

  /* Fuera los huecos que quedaron por encima del ultimo */
  const sobrantes = seccion.hall
    ? sb.from("favourites").delete().eq("user_id", yo).gt("position", filas.length)
    : sb.from("teams").delete().eq("user_id", yo)
        .eq("generation", seccion.generation).gt("slot", filas.length);

  const { error } = await sobrantes;
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* Saca el Pokemon de su hueco y lo mete en otro, corriendo los demas.
   Es lo que se espera al arrastrar, a diferencia de un intercambio seco. */
async function moverMon(seccion, desde, hacia) {
  if (desde === hacia) return { ok: true };
  if (hacia < 0 || hacia >= seccion.team.length) return { ok: false, error: "fuera de rango" };

  const antes = seccion.team.slice();
  const copia = seccion.team.slice();
  const [movido] = copia.splice(desde, 1);
  copia.splice(hacia, 0, movido);
  seccion.team = copia;

  const res = await guardarOrden(seccion);
  if (!res.ok) seccion.team = antes;
  return res;
}

/* Vacia el equipo entero de esa seccion */
async function vaciarEquipo(seccion) {
  if (!sb || !sesion) return { ok: false, error: "sin sesion" };

  const yo = sesion.user.id;
  const { error } = seccion.hall
    ? await sb.from("favourites").delete().eq("user_id", yo)
    : await sb.from("teams").delete().eq("user_id", yo).eq("generation", seccion.generation);

  if (error) return { ok: false, error: error.message };
  seccion.team = [];
  return { ok: true };
}

async function borrarMon(seccion, indice) {
  if (!sb || !sesion) return { ok: false, error: "sin sesion" };

  /* Se quita del array y se reescriben los huecos: asi no quedan numerados
     con saltos (1, 3, 4) cuando se borra uno del medio */
  const antes = seccion.team.slice();
  seccion.team.splice(indice, 1);

  const res = await guardarOrden(seccion);
  if (!res.ok) seccion.team = antes;
  return res;
}

/* ---------- Escritura ---------- */

/* Marca o desmarca un Pokemon. Actualiza la pantalla al momento y si la
   base falla lo deshace, para no dejar mintiendo al contador. */
async function alternarCaptura(dexId, shiny, tener) {
  const conjunto = shiny ? CAPTURAS.shiny : CAPTURAS.normal;
  if (tener) conjunto.add(dexId); else conjunto.delete(dexId);

  if (!sb || !sesion) return { ok: false, error: "sin sesion" };

  const fila = { user_id: sesion.user.id, dex_id: dexId, shiny };
  const { error } = tener
    ? await sb.from("catches").upsert(fila, { onConflict: "user_id,dex_id,shiny" })
    : await sb.from("catches").delete().match(fila);

  if (error) {
    if (tener) conjunto.delete(dexId); else conjunto.add(dexId);
    console.warn("no se pudo guardar:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function guardarJuego(generacion, gameId) {
  JUEGOS_ELEGIDOS.set(generacion, gameId);
  if (!sb || !sesion) return { ok: false };

  const { error } = await sb.from("region_games").upsert(
    { user_id: sesion.user.id, generation: generacion, game_id: gameId },
    { onConflict: "user_id,generation" }
  );

  if (error) { console.warn("no se pudo guardar el juego:", error.message); return { ok: false }; }
  return { ok: true };
}

/* ---------- Importacion inicial desde data/teams.js ---------- */

/* Trocea para no mandar mil filas de golpe */
async function insertarPorTandas(tabla, filas, conflicto) {
  const TANDA = 500;
  for (let i = 0; i < filas.length; i += TANDA) {
    const { error } = await sb
      .from(tabla)
      .upsert(filas.slice(i, i + TANDA), { onConflict: conflicto });
    if (error) return error;
  }
  return null;
}

async function importarDesdeArchivo(alProgresar) {
  if (!sb || !sesion) return { ok: false, error: "Hay que entrar primero" };

  const yo = sesion.user.id;
  const avisar = alProgresar || (() => {});

  avisar("Pidiendo las especies a PokeAPI...");
  const [especies, variantes] = await Promise.all([fetchSpecies(), fetchVariantes()]);
  if (!especies.length) return { ok: false, error: "No se pudo cargar la lista de especies" };

  const capturas = [];
  const equipos = [];
  const favoritos = [];

  for (const seccion of TEAMS) {
    if (seccion.hall) {
      seccion.team.forEach((m, i) => {
        favoritos.push({
          user_id: yo, position: i + 1, dex_id: m.dex, species: m.species,
          nickname: m.nickname || null, gender: m.gender || "n",
          form: m.form || null, ball: m.ball || null, shiny: Boolean(m.shiny)
        });
      });
      continue;
    }

    avisar("Generacion " + seccion.generation + "...");

    const entradas = entradasDe(seccion, especies, variantes);
    capturadosDe(seccion, entradas, variantes)
      .forEach((id) => capturas.push({ user_id: yo, dex_id: id, shiny: false }));
    shinyDe(seccion, entradas, variantes)
      .forEach((id) => capturas.push({ user_id: yo, dex_id: id, shiny: true }));

    seccion.team.forEach((m, i) => {
      equipos.push({
        user_id: yo, generation: seccion.generation, slot: i + 1,
        dex_id: m.dex, species: m.species, nickname: m.nickname || null,
        gender: m.gender || "n", form: m.form || null,
        ball: m.ball || null, shiny: Boolean(m.shiny)
      });
    });

    /* El juego de teams.js, si esta en el catalogo */
    const lista = GAMES[seccion.generation] || [];
    const juego = lista.find((j) => j.name.toLowerCase() === String(seccion.game || "")
      .replace(/^pokemon\s+/i, "").toLowerCase());
    if (juego) {
      await guardarJuego(seccion.generation, juego.id);
    }
  }

  avisar("Subiendo " + capturas.length + " capturas...");
  let error = await insertarPorTandas("catches", capturas, "user_id,dex_id,shiny");
  if (error) return { ok: false, error: error.message };

  avisar("Subiendo los equipos...");
  error = await insertarPorTandas("teams", equipos, "user_id,generation,slot");
  if (error) return { ok: false, error: error.message };

  avisar("Subiendo los favoritos...");
  error = await insertarPorTandas("favourites", favoritos, "user_id,position");
  if (error) return { ok: false, error: error.message };

  await cargarPerfilCompleto(yo);
  return { ok: true, capturas: capturas.length, equipos: equipos.length, favoritos: favoritos.length };
}
