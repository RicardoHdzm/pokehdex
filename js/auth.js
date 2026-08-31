/* ============================================================
   ACCESO POR ENLACE DE CORREO
   ------------------------------------------------------------
   El registro esta cerrado en Supabase: solo entran los correos que
   Ricardo haya registrado en Authentication > Users.
   ============================================================ */

const sb = (typeof supabase !== "undefined" && HAY_SUPABASE)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let sesion = null;
let perfil = null;

/* supabase-js borra el hash en cuanto lo procesa, asi que se lee ya */
const HASH_INICIAL = location.hash || "";
let esRecuperacion = HASH_INICIAL.includes("type=recovery");

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
  if (t.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (t.includes("email not confirmed")) {
    return "Ese correo esta sin confirmar. Pideselo a Ricardo.";
  }
  if (t.includes("signups not allowed") || t.includes("signup is disabled")) {
    return "Ese correo no esta registrado. Pideselo a Ricardo.";
  }
  if (t.includes("rate limit") || t.includes("too many")) {
    return "Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.";
  }
  if (t.includes("invalid") && t.includes("email")) {
    return "Ese correo no se ve bien, revisalo.";
  }
  return "No se pudo enviar el enlace: " + (error && error.message ? error.message : "error desconocido");
}

/* Entrada normal: correo y contraseña, sin pasar por el correo */
async function entrar(e) {
  e.preventDefault();
  if (!sb) return pintarAcceso("Falta configurar Supabase en js/config.js", "error");

  const boton = document.getElementById("authEnviar");
  const correo = document.getElementById("authCorreo").value.trim();
  const clave = document.getElementById("authClave").value;
  if (!correo || !clave) return;

  boton.disabled = true;
  pintarAcceso("Entrando...", "");

  const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });

  if (error) {
    boton.disabled = false;
    return pintarAcceso(explicar(error), "error");
  }
  /* onAuthStateChange recarga la pagina y ya entra con sesion */
}

/* Manda el enlace para poner o cambiar la contraseña.
   Supabase responde igual exista el correo o no, a proposito: asi nadie
   puede usar esta pantalla para averiguar quien tiene cuenta. Por eso el
   mensaje que se enseña es deliberadamente ambiguo. */
async function pedirEnlace() {
  if (!sb) return pintarAcceso("Falta configurar Supabase en js/config.js", "error");

  const correo = document.getElementById("authCorreo").value.trim();
  const boton = document.getElementById("authOtp");
  if (!correo) return pintarAcceso("Escribe primero tu correo.", "error");

  boton.disabled = true;
  pintarAcceso("Enviando...", "");

  const { error } = await sb.auth.resetPasswordForEmail(correo, {
    redirectTo: location.origin + location.pathname
  });

  boton.disabled = false;

  if (error) return pintarAcceso(explicar(error), "error");
  pintarAcceso("Si " + correo + " esta registrado, le llega un enlace para poner la contraseña.", "ok");
}

/* ---------- Poner la contraseña al volver del correo ---------- */

function pintarClave(mensaje, tipo) {
  const caja = document.getElementById("authClaveMensaje");
  if (!caja) return;
  caja.textContent = mensaje || "";
  caja.className = "auth-mensaje" + (tipo ? " " + tipo : "");
}

function mostrarPanelClave() {
  const login = document.querySelector(".auth-caja");
  const panel = document.getElementById("authClavePanel");
  if (login) login.hidden = true;
  if (panel) panel.hidden = false;
  mostrarPuerta(true);
}

async function guardarClave(e) {
  e.preventDefault();

  const nueva = document.getElementById("authClaveNueva").value;
  const repetir = document.getElementById("authClaveRepetir").value;
  const boton = document.getElementById("authClaveGuardar");

  if (nueva !== repetir) return pintarClave("Las dos contraseñas no coinciden.", "error");
  if (nueva.length < 8) return pintarClave("Minimo 8 caracteres.", "error");

  boton.disabled = true;
  pintarClave("Guardando...", "");

  const { error } = await sb.auth.updateUser({ password: nueva });

  if (error) {
    boton.disabled = false;
    return pintarClave(explicar(error), "error");
  }

  pintarClave("Listo. Entrando...", "ok");
  esRecuperacion = false;
  setTimeout(() => location.replace(location.pathname), 900);
}

/* ---------- Perfil ---------- */

async function cargarPerfil() {
  if (!sb || !sesion) return null;
  let { data, error } = await sb
    .from("profiles")
    .select("id, handle, display_name, friend_code, champions_id, favourite_ball")
    .eq("id", sesion.user.id)
    .single();

  /* Si la base todavia no tiene las columnas nuevas se piden las de siempre:
     sin esto, no habria perfil y la pagina entera se quedaria a medias. */
  if (error && error.code === "42703") {
    console.warn("Faltan columnas en profiles, se piden las basicas:", error.message);
    ({ data, error } = await sb
      .from("profiles")
      .select("id, handle, display_name")
      .eq("id", sesion.user.id)
      .single());
  }

  if (error) {
    console.warn("No se pudo leer el perfil:", error.message);
    return null;
  }
  return data;
}

function pintarSesion() {
  const barra = document.getElementById("authBarra");
  const nombre = document.getElementById("authNombre");
  if (!barra) return;

  if (!sesion) {
    barra.innerHTML = "";
    if (nombre) nombre.innerHTML = "";
    return;
  }

  const quien = (perfil && (perfil.display_name || perfil.handle)) || sesion.user.email;

  /* Bajo el titulo van tu nombre y tus codigos de intercambio, para tenerlos
     a mano al pasarselos a alguien sin abrir el perfil */
  if (nombre) {
    const codigos = [];
    if (perfil && perfil.friend_code) {
      codigos.push('<span class="visita-codigo"><b>Switch</b> ' + perfil.friend_code + "</span>");
    }
    if (perfil && perfil.champions_id) {
      codigos.push('<span class="visita-codigo"><b>Champions</b> ' + perfil.champions_id + "</span>");
    }

    /* Si has elegido favorito manda su icono; si no, el monigote de siempre */
    const cara = (typeof avatarHTML === "function" && avatarHTML(perfil)) ||
                 '<i class="fa-solid fa-user"></i>';

    /* La cara va en su propia linea, encima del nombre. El contenedor ya
       apila en columna, asi que basta con sacarla del span del nombre. */
    nombre.innerHTML =
      '<span class="auth-cara">' + cara + "</span>" +
      '<span class="auth-quien">' + quien + "</span>" +
      (codigos.length ? '<span class="auth-codigos">' + codigos.join("") + "</span>" : "");
  }

  barra.innerHTML = `
    <button class="auth-salir" type="button" id="authPerfil">Perfil</button>
    <button class="auth-salir" type="button" id="authUsuarios">Usuarios</button>
    <button class="auth-salir" type="button" id="authComparar">Comparar</button>
    <button class="auth-salir" type="button" id="authSalir">Salir</button>`;

  document.getElementById("authUsuarios").addEventListener("click", () => {
    if (typeof abrirUsuarios === "function") abrirUsuarios();
  });

  document.getElementById("authComparar").addEventListener("click", () => {
    if (typeof abrirComparar === "function") abrirComparar();
  });

  document.getElementById("authPerfil").addEventListener("click", () => {
    if (typeof abrirPerfil === "function") abrirPerfil();
  });

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
  if (form) form.addEventListener("submit", entrar);

  const otp = document.getElementById("authOtp");
  if (otp) otp.addEventListener("click", pedirEnlace);

  const claveForm = document.getElementById("authClaveForm");
  if (claveForm) claveForm.addEventListener("submit", guardarClave);

  const { data } = await sb.auth.getSession();
  sesion = data.session;

  if (sesion) {
    perfil = await cargarPerfil();
    if (perfil) {
      perfilVisto = perfil;
      await cargarPerfilCompleto(perfil.id);
    }
    /* Limpia los tokens que el enlace deja colgando en la direccion */
    if (location.hash.includes("access_token")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  if (esRecuperacion && sesion) {
    mostrarPanelClave();
    return;
  }

  mostrarPuerta(!sesion);
  pintarSesion();

  /* Se repinta despues de abrir la puerta: hasta ese momento el body no
     esta marcado con sesion y el titulo se quedaria en el generico */
  if (sesion && perfil && typeof refrescarTodo === "function") refrescarTodo();

  sb.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") { esRecuperacion = true; mostrarPanelClave(); return; }
    if (esRecuperacion) return;
    if (evento === "SIGNED_IN" && !sesion) location.reload();
    if (evento === "SIGNED_OUT") location.reload();
  });
}

document.addEventListener("DOMContentLoaded", initAuth);
