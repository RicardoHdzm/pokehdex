/* ============================================================
   COMPARTIR UN EQUIPO COMO IMAGEN
   ------------------------------------------------------------
   Dibuja el equipo en un <canvas> y lo entrega como PNG. En movil
   sale el menu de compartir del sistema (WhatsApp, Telegram, lo que
   haya); en escritorio, que no lo tiene, se descarga el archivo.

   La estampa va siempre en oscuro aunque el sitio este en claro: es
   la misma imagen para todos y asi se ve igual en cualquier chat.

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
  panel:  "#151515",
  hueco:  "#101010",
  marco:  "#333333",
  tinta:  "#f2f2f2",
  tinta2: "#9a9a9a"
};

const CARTA = { ancho: 300, alto: 376, hueco: 18, figura: 176 };
const ANCHO_TIPO = 104;
const MARGEN = 40;
const CABECERA = 152;
const PIE = 56;

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

/* Carga una imagen probando la cadena de recambios, igual que las laminas:
   si no existe la version femenina se cae a la normal, y de ahi al artwork. */
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

function recuadro(ctx, x, y, w, h, relleno, borde) {
  if (relleno) { ctx.fillStyle = relleno; ctx.fillRect(x, y, w, h); }
  if (borde) {
    ctx.strokeStyle = borde;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
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

const pixel = (px) => '400 ' + px + 'px "Press Start 2P", monospace';
const term = (px) => '400 ' + px + 'px "VT323", monospace';

/* ---------- Los rotulos de arriba ---------- */

function rotulosDe(sec) {
  const quien = typeof nombreDelPerfil === "function" ? nombreDelPerfil() : "";

  if (sec.hall) {
    return { arriba: "Salon de la Fama", titulo: "Favoritos", abajo: quien };
  }
  if (sec.soloEquipo) {
    return { arriba: "Team Actual", titulo: sec.title || sec.region, abajo: quien };
  }

  const juego = typeof nombreJuegoDe === "function" ? nombreJuegoDe(sec) : "";
  return {
    arriba: "Team " + plateNum(sec.generation),
    titulo: (ORDINAL[sec.generation] || sec.generation) + " generacion",
    abajo: [sec.region, juego, quien].filter(Boolean).join("   ·   ")
  };
}

/* ---------- Una carta ---------- */

function pintarCarta(ctx, mon, index, sec, x, y, acento, sprite, bola) {
  const { ancho, alto, figura } = CARTA;

  recuadro(ctx, x, y, ancho, alto, LIENZO.panel, LIENZO.marco);

  /* Figura */
  recuadro(ctx, x, y, ancho, figura, LIENZO.hueco, null);

  if (sprite) {
    /* Sin suavizado: son sprites de pixeles, interpolarlos los emborrona */
    ctx.imageSmoothingEnabled = false;
    const lado = 162;
    ctx.drawImage(sprite, x + (ancho - lado) / 2, y + (figura - lado) / 2, lado, lado);
    ctx.imageSmoothingEnabled = true;
  }

  if (bola) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bola, x + ancho - 46, y + 12, 34, 34);
    ctx.imageSmoothingEnabled = true;
  }

  /* Etiqueta de forma, abajo a la izquierda de la figura */
  if (mon.form) {
    const texto = formLabel(mon.form).toUpperCase();
    ctx.font = pixel(9);
    const w = ctx.measureText(texto).width + 14;
    recuadro(ctx, x + 10, y + figura - 32, w, 22, "rgba(0,0,0,.65)", acento);
    ctx.fillStyle = acento;
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x + 17, y + figura - 20);
    ctx.textBaseline = "alphabetic";
  }

  /* Hueco y numero */
  const dentro = x + 16;
  const tope = ancho - 32;
  ctx.font = pixel(10);
  ctx.fillStyle = acento;
  ctx.fillText(plateLabel(mon, index, sec), dentro, y + figura + 28);
  ctx.fillStyle = LIENZO.tinta2;
  ctx.textAlign = "right";
  ctx.fillText(dexNum(mon.dex), x + ancho - 16, y + figura + 28);
  ctx.textAlign = "left";

  /* Nombre: el apodo si lo lleva */
  const apodo = mon.nickname && mon.nickname.trim() ? mon.nickname.trim() : "";
  ctx.font = term(38);
  ctx.fillStyle = LIENZO.tinta;
  ctx.fillText(textoCabe(ctx, apodo || mon.species, tope), dentro, y + figura + 68);

  /* Especie (si hay apodo), genero y variocolor */
  let cursor = dentro;
  const linea = y + figura + 96;

  if (apodo) {
    ctx.font = term(24);
    ctx.fillStyle = LIENZO.tinta2;
    const nombre = textoCabe(ctx, mon.form ? formName(mon) : mon.species, tope - 74);
    ctx.fillText(nombre, cursor, linea);
    cursor += ctx.measureText(nombre).width + 12;
  }

  ctx.font = '900 18px "Font Awesome 6 Free"';
  ctx.fillStyle = LIENZO.tinta2;
  const iconoGenero = { m: "", f: "", n: "" }[mon.gender || "n"];
  ctx.fillText(iconoGenero, cursor, linea);
  cursor += 28;

  if (mon.shiny) {
    ctx.fillStyle = acento;
    ctx.fillText("", cursor, linea);
  }

  /* Tipos */
  const tipos = (mon.types || []).slice(0, 2);
  let tx = dentro;
  const ty = y + alto - 46;
  for (const t of tipos) {
    const tinte = tinteDeTipo(t);
    const etiqueta = (TYPE_ES[t] || t).toUpperCase();
    ctx.font = pixel(10);
    /* Todos del mismo ancho, como en las laminas: lo marca el nombre mas
       largo, ELECTRIC y FIGHTING, de ocho letras */
    const w = Math.max(ctx.measureText(etiqueta).width + 20, ANCHO_TIPO);
    recuadro(ctx, tx, ty, w, 30, tinte + "33", tinte + "a6");
    ctx.fillStyle = tinte;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(etiqueta, tx + w / 2, ty + 16);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tx += w + 8;
  }
}

/* ---------- La estampa entera ---------- */

async function lienzoDelEquipo(sec) {
  await fuentesListas();

  const mons = sec.team.slice(0, sec.hall ? TOPE_FAVORITOS : 6);
  if (!mons.length) return null;

  const columnas = mons.length > 6 ? 4 : 3;
  const filas = Math.ceil(mons.length / columnas);
  const { ancho: cw, alto: ch, hueco } = CARTA;

  const ancho = MARGEN * 2 + columnas * cw + (columnas - 1) * hueco;
  const alto = CABECERA + filas * ch + (filas - 1) * hueco + PIE + MARGEN;

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho * ESCALA;
  lienzo.height = alto * ESCALA;
  const ctx = lienzo.getContext("2d");
  ctx.scale(ESCALA, ESCALA);
  ctx.textBaseline = "alphabetic";

  const acento = typeof colorDe === "function" ? colorDe(sec) : "#ff5a4d";

  /* Fondo y franja de la region */
  ctx.fillStyle = LIENZO.fondo;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = acento;
  ctx.fillRect(0, 0, ancho, 8);

  /* Cabecera */
  const rot = rotulosDe(sec);
  ctx.font = pixel(12);
  ctx.fillStyle = acento;
  ctx.fillText(rot.arriba.toUpperCase(), MARGEN, 56);

  ctx.font = pixel(26);
  ctx.fillStyle = LIENZO.tinta;
  ctx.fillText(textoCabe(ctx, rot.titulo.toUpperCase(), ancho - MARGEN * 2), MARGEN, 100);

  if (rot.abajo) {
    ctx.font = term(26);
    ctx.fillStyle = LIENZO.tinta2;
    ctx.fillText(textoCabe(ctx, rot.abajo, ancho - MARGEN * 2), MARGEN, 130);
  }

  /* Las cartas: primero se bajan todas las imagenes y luego se pinta, que
     si no el orden de dibujado depende de cual llegue antes */
  const piezas = await Promise.all(mons.map((mon) => Promise.all([
    cargarImagen(spriteSrc(mon) + "|" + cadenaDeRecambio(mon)),
    mon.ball ? cargarImagen(ITEMS + "/" + mon.ball + ".png") : null
  ])));

  mons.forEach((mon, i) => {
    const x = MARGEN + (i % columnas) * (cw + hueco);
    const y = CABECERA + Math.floor(i / columnas) * (ch + hueco);
    pintarCarta(ctx, mon, i, sec, x, y, acento, piezas[i][0], piezas[i][1]);
  });

  /* Pie */
  const base = alto - MARGEN - 8;
  ctx.strokeStyle = LIENZO.marco;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGEN, base - 30);
  ctx.lineTo(ancho - MARGEN, base - 30);
  ctx.stroke();

  ctx.font = pixel(12);
  ctx.fillStyle = LIENZO.tinta;
  ctx.fillText("POKEHDEX", MARGEN, base);
  ctx.font = term(24);
  ctx.fillStyle = LIENZO.tinta2;
  ctx.textAlign = "right";
  ctx.fillText(COMPARTIR_SITIO, ancho - MARGEN, base);
  ctx.textAlign = "left";

  return lienzo;
}

/* ---------- Entregarla ---------- */

function nombreDeArchivo(sec) {
  const rot = rotulosDe(sec);
  const limpio = rot.titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return "pokehdex-" + (limpio || "equipo") + ".png";
}

const aBlob = (lienzo) => new Promise((listo) => lienzo.toBlob(listo, "image/png"));

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

    const archivo = new File([blob], nombreDeArchivo(sec), { type: "image/png" });

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
