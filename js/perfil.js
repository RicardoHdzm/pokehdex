/* ============================================================
   PANEL DE PERFIL
   ------------------------------------------------------------
   Nombre a mostrar y el juego de cada region, que es lo que
   define el color de acento de esa pestaña.
   ============================================================ */

function abrirPerfil() {
  if (!sesion || !perfil) return;

  document.getElementById("perfilNombre").value = perfil.display_name || perfil.handle || "";
  document.getElementById("perfilHandle").textContent = "@" + (perfil.handle || "");
  document.getElementById("perfilCorreo").textContent = sesion.user.email || "";
  document.getElementById("perfilMensaje").textContent = "";

  pintarJuegosDelPerfil();
  document.getElementById("perfilPanel").hidden = false;
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
        <span class="perfil-region">${roman(gen.generation)} · ${gen.region}</span>
        <select class="juego-select" data-gen="${gen.generation}"
                aria-label="Juego de ${gen.region}">${opciones}</select>
      </div>`;
  }).join("");
}

async function guardarNombre(e) {
  e.preventDefault();

  const aviso = document.getElementById("perfilMensaje");
  const nombre = document.getElementById("perfilNombre").value.trim();

  if (!nombre) { aviso.textContent = "El nombre no puede quedar vacio."; aviso.className = "mon-mensaje"; return; }

  aviso.textContent = "Guardando...";
  aviso.className = "mon-mensaje neutro";

  const { error } = await sb
    .from("profiles")
    .update({ display_name: nombre })
    .eq("id", sesion.user.id);

  if (error) {
    aviso.textContent = "No se pudo guardar: " + error.message;
    aviso.className = "mon-mensaje";
    return;
  }

  perfil.display_name = nombre;
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

  panel.addEventListener("click", (e) => { if (e.target === panel) cerrarPerfil(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrarPerfil();
  });
}

document.addEventListener("DOMContentLoaded", conectarPerfil);
