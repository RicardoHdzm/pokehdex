/* ============================================================
   USUARIOS
   ------------------------------------------------------------
   El directorio de gente y a quien tienes agregado.

   La amistad se guarda en una direccion por fila: "yo te agrego".
   Solo cuando existen las dos filas es mutua, y solo entonces se
   habilita ver la Pokedex del otro. Comparar lo que les falta no
   depende de esto: eso lo hace el panel de Comparar con quien sea.
   ============================================================ */

let AMISTADES = { mias: new Set(), suyas: new Set() };

function esMutuo(id) {
  return AMISTADES.mias.has(id) && AMISTADES.suyas.has(id);
}

/* Como esta la relacion con alguien. El color lo resume y el texto sigue
   estando en el title: quien no distinga colores, o use lector de pantalla,
   necesita leerlo. Los dos pendientes comparten el amarillo porque a los dos
   les falta lo mismo; cual de los dos es lo dice el boton, que pone Agregar
   o Quitar segun a quien le toque mover. */
function estadoCon(id) {
  const yoLoTengo = AMISTADES.mias.has(id);
  const elMeTiene = AMISTADES.suyas.has(id);

  if (yoLoTengo && elMeTiene) return { clave: "mutuo", texto: "Amigos" };
  if (yoLoTengo) return { clave: "pendiente", texto: "Pendiente: falta que te agregue" };
  if (elMeTiene) return { clave: "pendiente", texto: "Pendiente: te tiene agregado, agregalo tu" };
  return { clave: "ninguna", texto: "No amigos" };
}

function filaDeUsuario(p) {
  const estado = estadoCon(p.id);
  const nombre = p.display_name || p.handle || "";
  const agregado = AMISTADES.mias.has(p.id);

  return `
    <li class="usuario ${estado.clave}">
      <span class="usuario-nombre">${avatarHTML(p)}${nombre}</span>
      <span class="usuario-estado" role="img"
            title="${estado.texto}" aria-label="${estado.texto}"></span>
      <button type="button" class="boton primary usuario-ver" data-id="${p.id}"
              data-nombre="${nombre}"${esMutuo(p.id) ? "" : " disabled"}
              title="${esMutuo(p.id) ? "Ver su Pokedex" : "Solo cuando los dos se tengan agregados"}"
              >Perfil</button>
      <button type="button" class="boton usuario-agregar" data-id="${p.id}"
              aria-pressed="${agregado}">${agregado ? "Quitar" : "Agregar"}</button>
    </li>`;
}

function pintarUsuarios(perfiles) {
  const lista = document.getElementById("usuariosLista");
  if (!lista) return;

  /* Los amigos arriba. El resto conserva el orden alfabetico con el que
     llegan de la base: sort es estable, asi que basta con separar. */
  const ordenados = [...perfiles].sort((a, b) => Number(esMutuo(b.id)) - Number(esMutuo(a.id)));
  lista.innerHTML = ordenados.map(filaDeUsuario).join("");
}

async function abrirUsuarios() {
  if (!sesion) return;

  const panel = document.getElementById("usuariosPanel");
  const aviso = document.getElementById("usuariosMensaje");
  panel.hidden = false;
  aviso.textContent = "Cargando...";

  const [perfiles, amistades] = await Promise.all([cargarPerfiles(), cargarAmistades()]);
  AMISTADES = amistades;

  if (!perfiles.length) {
    aviso.textContent = "Todavia no hay nadie mas con perfil.";
    document.getElementById("usuariosLista").innerHTML = "";
    return;
  }

  aviso.textContent = "";
  pintarUsuarios(perfiles);
}

function cerrarUsuarios() {
  document.getElementById("usuariosPanel").hidden = true;
}

/* Agregar o quitar. Se pinta antes de que responda la base y se deshace si
   falla, que es como se comporta el resto del sitio. */
async function alternarAmigo(boton) {
  const id = boton.dataset.id;
  const tenia = AMISTADES.mias.has(id);

  if (tenia) AMISTADES.mias.delete(id); else AMISTADES.mias.add(id);
  pintarUsuarios(perfilesCache || []);

  const res = tenia ? await quitarAmigo(id) : await agregarAmigo(id);

  if (!res.ok) {
    if (tenia) AMISTADES.mias.add(id); else AMISTADES.mias.delete(id);
    pintarUsuarios(perfilesCache || []);
    document.getElementById("usuariosMensaje").textContent = "No se pudo guardar: " + res.error;
  }
}

function conectarUsuarios() {
  const panel = document.getElementById("usuariosPanel");
  if (!panel) return;

  document.getElementById("usuariosCerrar").addEventListener("click", cerrarUsuarios);

  document.getElementById("usuariosLista").addEventListener("click", (e) => {
    const agregar = e.target.closest(".usuario-agregar");
    if (agregar) return alternarAmigo(agregar);

    const ver = e.target.closest(".usuario-ver");
    if (ver && !ver.disabled) {
      cerrarUsuarios();
      verPokedexDe(ver.dataset.id, ver.dataset.nombre);
    }
  });

  panel.addEventListener("click", (e) => { if (e.target === panel) cerrarUsuarios(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrarUsuarios();
  });
}

document.addEventListener("DOMContentLoaded", conectarUsuarios);
