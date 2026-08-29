/* ============================================================
   CATALOGO DE JUEGOS POR GENERACION
   ------------------------------------------------------------
   Cada perfil elige uno por region y de ahi sale el color de acento.
   Los colores estan pensados para leerse sobre el fondo negro: son los
   de la version, aclarados lo justo para que no se pierdan.

   Para añadir un juego basta con meter una entrada aqui, no hace falta
   tocar la base de datos: game_id se guarda como texto suelto.
   ============================================================ */

const GAMES = {
  1: [
    { id: "red-blue-green", name: "Rojo / Azul / Verde", color: "#e3350d" },
    { id: "yellow",         name: "Amarillo",            color: "#ffcb05" },
    { id: "firered",        name: "Rojo Fuego",          color: "#ff6b35" },
    { id: "leafgreen",      name: "Verde Hoja",          color: "#5cb85c" },
    { id: "lets-go-pikachu", name: "Lets Go Pikachu",    color: "#f7d02c" },
    { id: "lets-go-eevee",   name: "Lets Go Eevee",      color: "#c98a4b" }
  ],
  2: [
    { id: "gold-silver", name: "Oro / Plata",       color: "#d4af37" },
    { id: "crystal",     name: "Cristal",           color: "#4dd0e1" },
    { id: "heartgold",   name: "HeartGold",         color: "#ffc233" },
    { id: "soulsilver",  name: "SoulSilver",        color: "#c8d0d8" }
  ],
  3: [
    { id: "ruby-sapphire", name: "Rubi / Zafiro",   color: "#c62828" },
    { id: "emerald",       name: "Esmeralda",       color: "#2fbf71" },
    { id: "omega-ruby",    name: "Omega Ruby",      color: "#d81b60" },
    { id: "alpha-sapphire", name: "Alfa Zafiro",    color: "#1e88e5" }
  ],
  4: [
    { id: "diamond-pearl",   name: "Diamante / Perla",   color: "#8fb8de" },
    { id: "platinum",        name: "Platino",            color: "#9fa8b0" },
    { id: "brilliant-diamond", name: "Brilliant Diamond", color: "#56ccf2" },
    { id: "shining-pearl",   name: "Shining Pearl",      color: "#f48fb1" },
    { id: "legends-arceus",  name: "Leyendas Arceus",    color: "#c9a227" }
  ],
  5: [
    { id: "black-white",     name: "Negro / Blanco",     color: "#78909c" },
    { id: "black-2",         name: "Negro 2",            color: "#546e7a" },
    { id: "white-2",         name: "Blanco 2",           color: "#f0f0f0" }
  ],
  6: [
    { id: "x", name: "X", color: "#3f51b5" },
    { id: "y", name: "Y", color: "#e8383d" }
  ],
  7: [
    { id: "sun",        name: "Sol",        color: "#f57c00" },
    { id: "moon",       name: "Luna",       color: "#5c6bc0" },
    { id: "ultra-sun",  name: "Ultra Sol",  color: "#ff8f00" },
    { id: "ultra-moon", name: "Ultra Luna", color: "#4a6cf7" }
  ],
  8: [
    { id: "sword",  name: "Espada", color: "#00c2d1" },
    { id: "shield", name: "Escudo", color: "#d81b60" }
  ],
  9: [
    { id: "scarlet", name: "Escarlata", color: "#e04a3f" },
    { id: "violet",  name: "Purpura",   color: "#b46cff" }
  ],
  10: [
    { id: "waves", name: "Waves", color: "#22d3ee" }
  ]
};

/* Devuelve el juego elegido, o el primero de la lista si no hay eleccion */
function juegoDe(generacion, gameId) {
  const lista = GAMES[generacion] || [];
  return lista.find((j) => j.id === gameId) || lista[0] || null;
}
