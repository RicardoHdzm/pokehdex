/* ============================================================
   PANEL DE PERFIL
   ------------------------------------------------------------
   Nombre a mostrar y el juego de cada region, que es lo que
   define el color de acento de esa pestaña.
   ============================================================ */

/* El buscador de especies es el mismo que usa el editor de equipo: son los
   mismos 1025 y ya esta montado, asi que no hace falta una segunda lista. */
async function prepararFavorito() {
  if (typeof montarListaEspecies === "function") await montarListaEspecies();

  const campo = document.getElementById("perfilFavorito");
  const especies = typeof fetchSpecies === "function" ? await fetchSpecies() : [];
  const suyo = especies.find(([id]) => id === Number(perfil.favourite_dex));
  campo.value = suyo ? nombreEspecie(suyo[1]) : "";
  pintarAvatarDelPerfil();
}

/* La miniatura de al lado, que cambia mientras escribes */
function pintarAvatarDelPerfil() {
  const hueco = document.getElementById("perfilAvatar");
  const dex = dexDelFavorito();
  hueco.innerHTML = dex
    ? '<img src="' + avatarDe(dex) + '" alt="" aria-hidden="true">'
    : "";
  hueco.classList.toggle("vacio", !dex);
}

/* Del nombre escrito a su numero, usando la lista del buscador */
function dexDelFavorito() {
  const escrito = document.getElementById("perfilFavorito").value.trim().toLowerCase();
  if (!escrito) return null;
  const op = [...document.getElementById("monLista").options]
    .find((o) => o.value.toLowerCase() === escrito);
  return op ? Number(op.dataset.dex) : null;
}

function abrirPerfil() {
  if (!sesion || !perfil) return;

  document.getElementById("perfilNombre").value = perfil.display_name || perfil.handle || "";
  document.getElementById("perfilFriendCode").value = perfil.friend_code || "";
  document.getElementById("perfilChampionsId").value = perfil.champions_id || "";
  document.getElementById("perfilHandle").textContent = "@" + (perfil.handle || "");
  document.getElementById("perfilCorreo").textContent = sesion.user.email || "";
  document.getElementById("perfilMensaje").textContent = "";

  pintarJuegosDelPerfil();
  document.getElementById("perfilPanel").hidden = false;
  prepararFavorito();
}

function cerrarPerfil() {
  document.getElementById("perfilPanel").hidden = true;
}

/* Una fila por generacion: nombre de la region y su desplegable */
function pintarJuegosDelPerfil() {
  const cont = document.getElementById("perfilJuegos");

  cont.innerHTML = TEAMS.filter((s) => !s.hall).map((gen) => {
    const lista = (GAMES[gen.generation] || []);
    if (!lista.length) return "";

    const actual = juegoDe(gen.generation, JUEGOS_ELEGIDOS.get(gen.generation));
    const opciones = lista.map((j) =>
      '<option value="' + j.id + '"' + (actual && actual.id === j.id ? " selected" : "") + ">" +
      j.name + "</option>").join("");

    return `
      <div class="perfil-fila">
        <span class="perfil-muestra" style="background:${actual ? actual.color : gen.color}"></span>
        <span class="perfil-region">${gen.soloEquipo
          ? gen.title || gen.region
          : roman(gen.generation) + " · " + gen.region}</span>
        <select class="juego-select" data-gen="${gen.generation}"
                aria-label="Juego de ${gen.region}">${opciones}</select>
      </div>`;
  }).join("");
}

/* Los codigos de Switch son doce digitos. Se acepta como los escriba cada
   uno y se guarda siempre igual: SW-0000-0000-0000 */
function normalizarFriendCode(texto) {
  const digitos = texto.replace(/[^0-9]/g, "");
  if (digitos.length !== 12) return texto.trim();
  return "SW-" + digitos.slice(0, 4) + "-" + digitos.slice(4, 8) + "-" + digitos.slice(8);
}

async function guardarNombre(e) {
  e.preventDefault();

  const aviso = document.getElementById("perfilMensaje");
  const nombre = document.getElementById("perfilNombre").value.trim();
  const campoFc = document.getElementById("perfilFriendCode");
  const campoCh = document.getElementById("perfilChampionsId");

  if (!nombre) { aviso.textContent = "El nombre no puede quedar vacio."; aviso.className = "mon-mensaje"; return; }

  const fc = campoFc.value.trim() ? normalizarFriendCode(campoFc.value) : null;
  const ch = campoCh.value.trim() || null;

  /* Si has escrito algo que no esta en la lista, no se guarda a medias */
  const favorito = dexDelFavorito();
  if (document.getElementById("perfilFavorito").value.trim() && !favorito) {
    aviso.textContent = "Ese Pokemon no esta en la lista. Elige uno de las sugerencias.";
    aviso.className = "mon-mensaje";
    return;
  }

  if (fc && !/^SW-[0-9]{4}-[0-9]{4}-[0-9]{4}$/.test(fc)) {
    aviso.textContent = "El codigo de amigo son doce digitos: SW-0000-0000-0000.";
    aviso.className = "mon-mensaje";
    return;
  }

  aviso.textContent = "Guardando...";
  aviso.className = "mon-mensaje neutro";

  const { error } = await sb
    .from("profiles")
    .update({ display_name: nombre, friend_code: fc, champions_id: ch, favourite_dex: favorito })
    .eq("id", sesion.user.id);

  if (error) {
    aviso.textContent = "No se pudo guardar: " + error.message;
    aviso.className = "mon-mensaje";
    return;
  }

  perfil.display_name = nombre;
  perfil.friend_code = fc;
  perfil.champions_id = ch;
  perfil.favourite_dex = favorito;
  campoFc.value = fc || "";
  pintarSesion();
  aviso.textContent = "Guardado.";
  aviso.className = "mon-mensaje ok";
}

/* Al cambiar un juego se guarda y, si es la region en pantalla, se repinta */
async function cambiarJuegoDelPerfil(e) {
  const sel = e.target.closest(".juego-select");
  if (!sel) return;

  const generacion = Number(sel.dataset.gen);
  const res = await guardarJuego(generacion, sel.value);

  const muestra = sel.parentElement.querySelector(".perfil-muestra");
  const juego = juegoDe(generacion, sel.value);
  if (muestra && juego) muestra.style.background = juego.color;

  if (!res.ok) {
    document.getElementById("perfilMensaje").textContent = "No se pudo guardar el juego.";
    return;
  }

  buildIndex();
  if (genEnPantalla) selectGeneration(genEnPantalla.id, false);
}

function conectarPerfil() {
  const panel = document.getElementById("perfilPanel");
  if (!panel) return;

  document.getElementById("perfilForm").addEventListener("submit", guardarNombre);
  document.getElementById("perfilCerrar").addEventListener("click", cerrarPerfil);
  document.getElementById("perfilJuegos").addEventListener("change", cambiarJuegoDelPerfil);
  document.getElementById("perfilFavorito").addEventListener("input", pintarAvatarDelPerfil);

  panel.addEventListener("click", (e) => { if (e.target === panel) cerrarPerfil(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrarPerfil();
  });
}

document.addEventListener("DOMContentLoaded", conectarPerfil);
