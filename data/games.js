/* ============================================================
   CATALOGO DE JUEGOS POR GENERACION
   ------------------------------------------------------------
   Solo los juegos originales de cada generacion: nada de remakes.
   FireRed, HeartGold, Omega Ruby, Brilliant Diamond o los Lets Go
   son remakes hechos en generaciones posteriores, y aqui lo que se
   elige es el color de la region, no la partida concreta.

   Cada perfil escoge uno por region y de ahi sale el acento. Los
   colores estan ajustados para leerse sobre el fondo negro.

   Para añadir un juego basta con meter una entrada aqui, no hace
   falta tocar la base: game_id se guarda como texto suelto.
   ============================================================ */

const GAMES = {
  1: [
    { id: "red-blue-green", name: "Rojo / Azul / Verde", color: "#e3350d" },
    { id: "yellow",         name: "Amarillo",            color: "#ffcb05" }
  ],
  2: [
    { id: "gold-silver", name: "Oro / Plata", color: "#d4af37" },
    { id: "crystal",     name: "Cristal",     color: "#4dd0e1" }
  ],
  3: [
    { id: "ruby-sapphire", name: "Rubi / Zafiro", color: "#c62828" },
    { id: "emerald",       name: "Esmeralda",     color: "#2fbf71" }
  ],
  4: [
    { id: "diamond-pearl", name: "Diamante / Perla", color: "#8fb8de" },
    { id: "platinum",      name: "Platino",          color: "#9fa8b0" }
  ],
  5: [
    { id: "black-white",     name: "Negro / Blanco",     color: "#78909c" },
    { id: "black2-white2",   name: "Negro 2 / Blanco 2", color: "#546e7a" }
  ],
  6: [
    { id: "x", name: "X", color: "#3f51b5" },
    { id: "y", name: "Y", color: "#e8383d" }
  ],
  7: [
    { id: "sun-moon",             name: "Sol / Luna",             color: "#f57c00" },
    { id: "ultra-sun-ultra-moon", name: "Ultrasol / Ultraluna",   color: "#4a6cf7" }
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

/* Devuelve el juego elegido, o el primero de la lista si no hay eleccion
   o si la guardada ya no existe en el catalogo */
function juegoDe(generacion, gameId) {
  const lista = GAMES[generacion] || [];
  return lista.find((j) => j.id === gameId) || lista[0] || null;
}
