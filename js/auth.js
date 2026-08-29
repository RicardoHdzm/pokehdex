/* ============================================================
   ACCESO POR ENLACE DE CORREO
   ------------------------------------------------------------
   El alta esta cerrada en Supabase: solo entran los correos que
   Ricardo haya dado de alta en Authentication > Users.
   ============================================================ */

const sb = (typeof supabase !== "undefined" && HAY_SUPABASE)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let sesion = null;
let perfil = null;

/* ---------- Pantalla de acceso ---------- */

function pintarAcceso(mensaje, tipo) {
  const caja = document.getElementById("authMensaje");
  if (!caja) return;
  caja.textContent = mensaje || "";
  caja.className = "auth-mensaje" + (tipo ? " " + tipo : "");
}

function mostrarPuerta(visible) {
  const puerta = document.getElementById("authPuerta");
  if (puerta) puerta.hidden = !visible;
  document.body.classList.toggle("con-sesion", !visible);
}

/* Traduce los errores de Supabase, que llegan en ingles y algo cripticos */
function explicar(error) {
  const t = (error && error.message ? error.message : "").toLowerCase();
  if (t.includes("signups not allowed") || t.includes("signup is disabled")) {
    return "Ese correo no esta dado de alta. Pideselo a Ricardo.";
  }
  if (t.includes("rate limit") || t.includes("too many")) {
    return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";
  }
  if (t.includes("invalid") && t.includes("email")) {
    return "Ese correo no tiene buena pinta, revisalo.";
  }
  return "No se pudo enviar el enlace: " + (error && error.message ? error.message : "error desconocido");
}

async function pedirEnlace(e) {
  e.preventDefault();
  if (!sb) return pintarAcceso("Falta configurar Supabase en js/config.js", "error");

  const campo = document.getElementById("authCorreo");
  const boton = document.getElementById("authEnviar");
  const correo = campo.value.trim();
  if (!correo) return;

  boton.disabled = true;
  pintarAcceso("Enviando...", "");

  /* Vuelve exactamente a esta pagina; tiene que estar en la lista de
     Redirect URLs del panel de Supabase */
  const { error } = await sb.auth.signInWithOtp({
    email: correo,
    options: { emailRedirectTo: location.origin + location.pathname }
  });

  boton.disabled = false;

  if (error) return pintarAcceso(explicar(error), "error");
  pintarAcceso("Enlace enviado a " + correo + ". Revisa el correo, caduca en una hora.", "ok");
  campo.value = "";
}

/* ---------- Perfil ---------- */

async function cargarPerfil() {
  if (!sb || !sesion) return null;
  const { data, error } = await sb
    .from("profiles")
    .select("id, handle, display_name")
    .eq("id", sesion.user.id)
    .single();

  if (error) {
    console.warn("No se pudo leer el perfil:", error.message);
    return null;
  }
  return data;
}

function pintarSesion() {
  const barra = document.getElementById("authBarra");
  if (!barra) return;

  if (!sesion) { barra.innerHTML = ""; return; }

  const quien = (perfil && (perfil.display_name || perfil.handle)) || sesion.user.email;
  barra.innerHTML = `
    <span class="auth-quien"><i class="fa-solid fa-user"></i> ${quien}</span>
    <button class="auth-salir" type="button" id="authSalir">Salir</button>`;

  document.getElementById("authSalir").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });
}

/* ---------- Arranque ---------- */

async function initAuth() {
  if (!sb) {
    mostrarPuerta(true);
    pintarAcceso("Falta configurar Supabase en js/config.js", "error");
    return;
  }

  const form = document.getElementById("authForm");
  if (form) form.addEventListener("submit", pedirEnlace);

  const { data } = await sb.auth.getSession();
  sesion = data.session;

  if (sesion) {
    perfil = await cargarPerfil();
    /* Limpia los tokens que el enlace deja colgando en la direccion */
    if (location.hash.includes("access_token")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  mostrarPuerta(!sesion);
  pintarSesion();

  sb.auth.onAuthStateChange((evento, nueva) => {
    if (evento === "SIGNED_IN" && !sesion) location.reload();
    if (evento === "SIGNED_OUT") location.reload();
  });
}

document.addEventListener("DOMContentLoaded", initAuth);
