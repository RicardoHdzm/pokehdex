/* ============================================================
   CATALOGO DE JUEGOS POR GENERACION
   ------------------------------------------------------------
   Una entrada por version, y solo los originales de cada
   generacion: nada de remakes, secuelas ni versiones ampliadas.
   Fuera quedan FireRed, HeartGold, Omega Ruby, Brilliant Diamond,
   los Lets Go, Negro 2 / Blanco 2 y Ultrasol / Ultraluna.

   Los nombres van en ingles, como los tipos, las especies y las
   balls. Cada perfil escoge una version por region y de ahi sale
   el acento; los colores son los de cada version, ajustados para
   leerse sobre el fondo negro.

   Para añadir un juego basta con meter una entrada aqui, no hace
   falta tocar la base: game_id se guarda como texto suelto.
   ============================================================ */

const GAMES = {
  1: [
    { id: "red",    name: "Red",       color: "#e3350d" },
    { id: "blue",   name: "Blue",      color: "#3b82d6" },
    { id: "green",  name: "Green",     color: "#3fae5a" },
    { id: "yellow", name: "Yellow",    color: "#ffcb05" }
  ],
  2: [
    { id: "gold",    name: "Gold",    color: "#d4af37" },
    { id: "silver",  name: "Silver",  color: "#b9c3cc" },
    { id: "crystal", name: "Crystal", color: "#4dd0e1" }
  ],
  3: [
    { id: "ruby",     name: "Ruby",      color: "#f04141" },
    { id: "sapphire", name: "Sapphire",  color: "#4a90e8" },
    { id: "emerald",  name: "Emerald",   color: "#2fbf71" }
  ],
  4: [
    { id: "diamond",  name: "Diamond",  color: "#8fb8de" },
    { id: "pearl",    name: "Pearl",    color: "#f2a3c0" },
    { id: "platinum", name: "Platinum", color: "#9fa8b0" }
  ],
  5: [
    { id: "black", name: "Black",  color: "#7d8590" },
    { id: "white", name: "White",  color: "#f0f0f0" }
  ],
  6: [
    { id: "x", name: "X", color: "#7b8ef0" },
    { id: "y", name: "Y", color: "#e8383d" }
  ],
  7: [
    { id: "sun",  name: "Sun",  color: "#f57c00" },
    { id: "moon", name: "Moon", color: "#8b9aeb" }
  ],
  8: [
    { id: "sword",  name: "Sword",  color: "#00c2d1" },
    { id: "shield", name: "Shield", color: "#f4508c" }
  ],
  9: [
    { id: "scarlet", name: "Scarlet", color: "#e04a3f" },
    { id: "violet",  name: "Violet",  color: "#b46cff" }
  ],
  10: [
    { id: "waves", name: "Waves", color: "#22d3ee" },
    { id: "winds", name: "Winds", color: "#7ef0c6" }
  ],
  11: [
    { id: "champions", name: "Champions", color: "#ffab00" }
  ]
};

/* Devuelve el juego elegido, o el primero de la lista si no hay eleccion
   o si la guardada ya no existe en el catalogo */
function juegoDe(generacion, gameId) {
  const lista = GAMES[generacion] || [];
  return lista.find((j) => j.id === gameId) || lista[0] || null;
}
