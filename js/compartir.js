/* ============================================================
   COMPARTIR UN EQUIPO COMO IMAGEN
   ------------------------------------------------------------
   Dibuja el equipo en un <canvas> y lo entrega como PNG. En movil
   sale el menu de compartir del sistema (WhatsApp, Telegram, lo que
   haya); en escritorio, que no lo tiene, se descarga el archivo.

   La estampa no copia las laminas del sitio a proposito. Dentro de
   la pagina los sprites de pixeles son la identidad; en una imagen
   suelta, que se ve grande y sin contexto, pierden. Asi que aqui:

   - manda el artwork oficial, de 475 px, no el sprite de 96
   - no hay recuadros: lo que separa una ficha de otra es el aire y
     un resplandor del color del tipo detras de cada uno
   - el tipo se dice con color —un rotulo chico y una barra abajo—
     en vez de con badges, que a este tamaño se peleaban entre ellos
   - detras de cada Pokemon va su numero de hueco en grande y casi
     apagado, el mismo recurso del numero romano de las cabeceras

   Sale en 9:16, la medida de un estado o una historia, y va siempre
   en oscuro aunque el sitio este en claro: es la misma imagen para
   todos y asi se ve igual en cualquier chat.

   Los sprites se piden con crossOrigin porque si no el navegador
   marca el lienzo como "sucio" y toBlob() deja de funcionar. El
   repositorio de PokeAPI responde con Access-Control-Allow-Origin,
   asi que no hay que proxyar nada.
   ============================================================ */

const COMPARTIR_SITIO = "pokehdex.vercel.app";

/* Todo esta en puntos de diseño y se multiplica al final: asi la imagen
   sale al doble de resolucion sin tocar ni una medida. */
const ESCALA = 2;

const LIENZO = {
  fondo:  "#0d0d0d",
  tinta:  "#f2f2f2",
  tinta2: "#9a9a9a",
  marco:  "#333333"
};

/* La ball va al doble exacto de su tamaño original (son de 30x30): en
   multiplos enteros el escalado por vecino mas cercano sale limpio, y en
   cualquier otro quedan filas de pixeles de distinto grosor. */
/* El sprite va al doble exacto de su tamaño original —son de 96x96, la ball
   de 30x30—: en multiplos enteros el escalado por vecino mas cercano sale
   limpio, y en cualquier otro quedan filas de pixeles de distinto grosor. */
const FICHA = { ancho: 332, alto: 354, arte: 208, sprite: 192, bola: 60 };
const MARGEN = 36;
const HUECO = 24;
const PIE = 76;

const ICONO_GENERO = { m: "", f: "", n: "" };
const ICONO_SHINY = "";

/* ---------- Colores de tipo ----------
   Viven en el CSS como --t de cada .t-loquesea. Se leen de ahi en vez de
   copiarlos aqui: una sola lista que mantener. */

let TINTES = null;

function tinteDeTipo(tipo) {
  if (!TINTES) {
    TINTES = {};
    const sonda = document.createElement("span");
    sonda.style.display = "none";
    document.body.appendChild(sonda);
    for (const t of Object.keys(TYPE_ES)) {
      sonda.className = "type-chip t-" + t;
      TINTES[t] = getComputedStyle(sonda).getPropertyValue("--t").trim() || "#9099a1";
    }
    sonda.remove();
  }
  return TINTES[tipo] || "#9099a1";
}

/* ---------- Utilidades de dibujo ---------- */

const pixel = (px) => '400 ' + px + 'px "Press Start 2P", monospace';
const term = (px) => '400 ' + px + 'px "VT323", monospace';

/* Las fuentes del sitio no estan listas hasta que el navegador las baja, y
   un canvas no espera: pide la fuente, no la tiene y pinta con otra. */
async function fuentesListas() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('400 16px "Press Start 2P"'),
      document.fonts.load('400 16px "VT323"'),
      document.fonts.load('900 16px "Font Awesome 6 Free"')
    ]);
    await document.fonts.ready;
  } catch { /* se pinta con lo que haya */ }
}

/* Carga una imagen probando la cadena de recambios, separados por barra */
function cargarImagen(cadena) {
  return new Promise((listo) => {
    const urls = String(cadena || "").split("|").filter(Boolean);
    if (!urls.length) return listo(null);

    const img = new Image();
    img.crossOrigin = "anonymous";
    let i = 0;
    img.onload = () => listo(img);
    img.onerror = () => {
      i += 1;
      if (i < urls.length) img.src = urls[i];
      else listo(null);
    };
    img.src = urls[0];
  });
}

/* Los sprites de pixeles, que son los del sitio. La cadena ya trae sus
   propios recambios —la version femenina, la normal— y de ultimo el
   artwork, por si algun dia falta el sprite de una forma. */
const cadenaDeArte = (mon) =>
  [spriteSrc(mon), cadenaDeRecambio(mon), artwork(mon)].join("|");

/* Un resplandor redondo que se apaga hacia afuera */
function resplandor(ctx, x, y, radio, color, fuerza) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radio);
  g.addColorStop(0, color + fuerza);
  g.addColorStop(1, color + "00");
  ctx.fillStyle = g;
  ctx.fillRect(x - radio, y - radio, radio * 2, radio * 2);
}

/* Recorta con puntos suspensivos lo que no quepa */
function textoCabe(ctx, texto, tope) {
  if (ctx.measureText(texto).width <= tope) return texto;
  let corto = texto;
  while (corto.length > 1 && ctx.measureText(corto + "...").width > tope) {
    corto = corto.slice(0, -1);
  }
  return corto + "...";
}

/* ---------- Los rotulos de arriba ----------
   Encima va de quien es el equipo; debajo del titulo, la region y la
   edicion en dos renglones, como se nombran los juegos. */

function rotulosDe(sec) {
  const quien = typeof nombreDelPerfil === "function" ? nombreDelPerfil() : "";

  if (sec.hall) {
    return { encima: quien, titulo: "Favoritos", lineas: ["Salon de la Fama"] };
  }
  if (sec.soloEquipo) {
    return { encima: quien, titulo: sec.title || sec.region, lineas: ["Team Actual"] };
  }

  const juego = typeof nombreJuegoDe === "function" ? nombreJuegoDe(sec) : "";
  const lineas = [];
  if (sec.region) lineas.push(sec.region + " Region");
  if (juego) lineas.push(juego + " Version");

  return {
    encima: quien,
    titulo: (ORDINAL[sec.generation] || sec.generation) + " generacion",
    lineas
  };
}

/* La cabecera crece con lo que tenga: sin nombre de entrenador el titulo
   sube, y Champions no lleva region ni edicion. */
const altoDeCabecera = (rot) =>
  (rot.encima ? 100 : 74) + rot.lineas.length * 28 + 40;

function pintarCabecera(ctx, rot, ancho, acento) {
  /* Lavado del color de la region, que se disuelve hacia abajo */
  resplandor(ctx, ancho / 2, -40, ancho * 0.9, acento, "1f");

  ctx.fillStyle = acento;
  ctx.fillRect(0, 0, ancho, 8);

  const tope = ancho - MARGEN * 2;

  if (rot.encima) {
    ctx.font = pixel(12);
    ctx.fillStyle = acento;
    ctx.fillText(textoCabe(ctx, rot.encima.toUpperCase(), tope), MARGEN, 58);
  }

  const y = rot.encima ? 100 : 74;
  ctx.font = pixel(24);
  ctx.fillStyle = LIENZO.tinta;
  ctx.fillText(textoCabe(ctx, rot.titulo.toUpperCase(), tope), MARGEN, y);

  ctx.font = term(26);
  ctx.fillStyle = LIENZO.tinta2;
  rot.lineas.forEach((linea, i) => {
    ctx.fillText(textoCabe(ctx, linea, tope), MARGEN, y + 33 + i * 28);
  });
}

function pintarPie(ctx, ancho, alto) {
  const base = alto - 30;
  ctx.strokeStyle = LIENZO.marco;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGEN, base - 28);
  ctx.lineTo(ancho - MARGEN, base - 28);
  ctx.stroke();

  ctx.font = pixel(11);
  ctx.fillStyle = LIENZO.tinta;
  ctx.fillText("POKEHDEX", MARGEN, base);
  ctx.font = term(22);
  ctx.fillStyle = LIENZO.tinta2;
  ctx.textAlign = "right";
  ctx.fillText(COMPARTIR_SITIO, ancho - MARGEN, base);
  ctx.textAlign = "left";
}

/* ---------- Una ficha ---------- */

function pintarFicha(ctx, mon, index, sec, x, y, acento, arte, bola) {
  const { ancho, alto } = FICHA;
  const tipos = (mon.types || []).slice(0, 2);
  const principal = tipos[0] ? tinteDeTipo(tipos[0]) : acento;

  /* 1. Resplandor del tipo, detras de todo */
  resplandor(ctx, x + ancho / 2, y + FICHA.arte / 2, FICHA.arte * 0.66, principal, "33");

  /* 2. El sprite, sin suavizado y al doble exacto: son pixeles, e
     interpolarlos los emborrona. */
  if (arte) {
    ctx.imageSmoothingEnabled = false;
    const lado = FICHA.sprite;
    ctx.drawImage(arte, x + (ancho - lado) / 2, y + (FICHA.arte - lado) / 2, lado, lado);
    ctx.imageSmoothingEnabled = true;
  }

  /* 3. El pie de la ficha.
     La ball va aqui abajo y no encima del artwork: las ilustraciones no
     tienen todas el mismo margen y se le montaba a los que son anchos
     de arriba, como Exploud. */
  if (bola) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bola, x + ancho - FICHA.bola, y + 248, FICHA.bola, FICHA.bola);
    ctx.imageSmoothingEnabled = true;
  }

  const tope = ancho - FICHA.bola - 12;
  const apodo = mon.nickname && mon.nickname.trim() ? mon.nickname.trim() : "";

  /* Hueco y numero. En Favoritos el rotulo dice la generacion. */
  ctx.font = pixel(10);
  ctx.fillStyle = acento;
  ctx.fillText(plateLabel(mon, index, sec), x, y + 238);
  ctx.fillStyle = LIENZO.tinta2;
  ctx.fillText(dexNum(mon.dex), x + 100, y + 238);

  ctx.font = term(38);
  ctx.fillStyle = LIENZO.tinta;
  ctx.fillText(textoCabe(ctx, apodo || mon.species, tope), x, y + 284);

  /* El segundo renglon dice lo que el primero no alcanzo a decir: con
     apodo, la especie; sin apodo, la forma si la tiene, y si tampoco, la
     ball. Sin esto el renglon se quedaba con el icono de genero solo. */
  let cursor = x;
  ctx.font = term(23);
  ctx.fillStyle = LIENZO.tinta2;

  const bajo = apodo
    ? (mon.form ? formName(mon) : mon.species)
    : (mon.form ? formLabel(mon.form) : (BALL_ES[mon.ball] || mon.ball || ""));

  if (bajo) {
    const puesto = textoCabe(ctx, bajo, tope - 60);
    ctx.fillText(puesto, cursor, y + 310);
    cursor += ctx.measureText(puesto).width + 12;
  }

  ctx.font = '900 16px "Font Awesome 6 Free"';
  ctx.fillText(ICONO_GENERO[mon.gender || "n"], cursor, y + 310);
  cursor += 24;
  if (mon.shiny) {
    ctx.fillStyle = acento;
    ctx.fillText(ICONO_SHINY, cursor, y + 310);
  }

  /* Los tipos, dichos con color y no con recuadros */
  ctx.font = pixel(10);
  let tx = x;
  tipos.forEach((t, i) => {
    if (i) {
      ctx.fillStyle = LIENZO.marco;
      ctx.fillText("/", tx, y + 336);
      tx += 18;
    }
    ctx.fillStyle = tinteDeTipo(t);
    const etiqueta = (TYPE_ES[t] || t).toUpperCase();
    ctx.fillText(etiqueta, tx, y + 336);
    tx += ctx.measureText(etiqueta).width + 10;
  });

  /* Y repetidos como una barra, que se lee de reojo */
  if (tipos.length) {
    const trozo = ancho / tipos.length;
    tipos.forEach((t, i) => {
      ctx.fillStyle = tinteDeTipo(t);
      ctx.fillRect(x + i * trozo, y + 348, trozo, 5);
    });
  }
}

/* ---------- La estampa entera ---------- */

async function lienzoDelEquipo(sec) {
  await fuentesListas();

  const mons = sec.team.slice(0, sec.hall ? TOPE_FAVORITOS : 6);
  if (!mons.length) return null;

  /* Dos columnas para un equipo; con los doce de Favoritos, tres */
  const columnas = mons.length > 6 ? 3 : 2;
  const filas = Math.ceil(mons.length / columnas);
  const { ancho: fw, alto: fh } = FICHA;

  const rot = rotulosDe(sec);
  const cabecera = altoDeCabecera(rot);

  const ancho = MARGEN * 2 + columnas * fw + (columnas - 1) * HUECO;
  const alto = cabecera + filas * fh + (filas - 1) * HUECO + PIE;

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho * ESCALA;
  lienzo.height = alto * ESCALA;
  const ctx = lienzo.getContext("2d");
  ctx.scale(ESCALA, ESCALA);
  ctx.textBaseline = "alphabetic";

  const acento = typeof colorDe === "function" ? colorDe(sec) : "#ff5a4d";

  ctx.fillStyle = LIENZO.fondo;
  ctx.fillRect(0, 0, ancho, alto);

  pintarCabecera(ctx, rot, ancho, acento);

  /* Primero se bajan todas las imagenes y luego se pinta, que si no el
     orden de dibujado depende de cual llegue antes */
  const piezas = await Promise.all(mons.map((mon) => Promise.all([
    cargarImagen(cadenaDeArte(mon)),
    mon.ball ? cargarImagen(ITEMS + "/" + mon.ball + ".png") : null
  ])));

  mons.forEach((mon, i) => {
    const x = MARGEN + (i % columnas) * (fw + HUECO);
    const y = cabecera + Math.floor(i / columnas) * (fh + HUECO);
    pintarFicha(ctx, mon, i, sec, x, y, acento, piezas[i][0], piezas[i][1]);
  });

  pintarPie(ctx, ancho, alto);
  return lienzo;
}

/* ---------- Entregarla ---------- */

function nombreDeArchivo(sec) {
  const limpio = rotulosDe(sec).titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return "pokehdex-" + (limpio || "equipo") + ".jpg";
}

/* JPEG y no PNG: desde que la estampa lleva artwork en vez de sprites, el
   PNG se iba a 3 MB —son ilustraciones con degradados, que no comprime— y
   en JPEG al 92% baja a 400 KB. Medido sobre el texto de pixeles y los
   bordes duros de la ball, la diferencia media es de 0.6 a 1.5 sobre 255:
   no se ve. El fondo esta pintado entero, asi que no se pierde nada por
   no tener transparencia. */
const CALIDAD = 0.92;
const aBlob = (lienzo) =>
  new Promise((listo) => lienzo.toBlob(listo, "image/jpeg", CALIDAD));

async function compartirEquipo(sec, boton) {
  const original = boton ? boton.textContent : "";
  const decir = (txt) => { if (boton) boton.textContent = txt; };

  decir("Armando...");
  if (boton) boton.disabled = true;

  try {
    const lienzo = await lienzoDelEquipo(sec);
    if (!lienzo) { decir("Equipo vacio"); return; }

    const blob = await aBlob(lienzo);
    if (!blob) { decir("No se pudo"); return; }

    const archivo = new File([blob], nombreDeArchivo(sec), { type: "image/jpeg" });

    /* En movil, el menu de compartir del sistema. canShare con files hay que
       preguntarlo: hay navegadores con share pero sin envio de archivos. */
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: rotulosDe(sec).titulo });
        decir("Listo");
        return;
      } catch (err) {
        /* Si se cancela, no se descarga nada por detras */
        if (err && err.name === "AbortError") { decir(original); return; }
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    decir("Descargada");
  } catch (err) {
    console.error(err);
    decir("No se pudo");
  } finally {
    if (boton) boton.disabled = false;
    setTimeout(() => decir(original), 2500);
  }
}

/* El boton se repinta con cada seccion, asi que el click se escucha arriba */
document.addEventListener("click", (e) => {
  const boton = e.target.closest("#compartirEquipo");
  if (!boton || !genEnPantalla) return;
  e.preventDefault();
  compartirEquipo(genEnPantalla, boton);
});
