/* ============================================================
   MIS EQUIPOS POKEMON — por generacion
   ------------------------------------------------------------
   Edita este archivo para cambiar tus equipos. Nada mas.

   Cada generacion:
     id         -> identificador unico, se usa en la URL (#gen-1)
     generation -> numero de generacion
     region     -> region de esa generacion
     game       -> juego con el que la jugaste, se muestra en la cabecera
     forms      -> formas sueltas que añadir al final de esa Pokedex, con el nombre
                   que usa PokeAPI: ["ursaluna-bloodmoon", "urshifu-rapid-strike"].
                   Las formas regionales (Alola, Galar, Hisui, Paldea) ya salen
                   solas en la generacion que las estreno, no hace falta ponerlas.
     color      -> color de acento (hex)
     missing    -> Pokemon que te FALTAN de esa generacion. Todo lo que no este
                   en esta lista cuenta como capturado. Admite numeros sueltos y
                   rangos separados por comas: "10-15, 25, 63-65, 150".
                     ""          -> Pokedex completa
                     "1-151"     -> generacion sin empezar (usa su rango entero)
                   Los seis del equipo cuentan como capturados aunque los pongas
                   aqui. Los numeros fuera del rango de la generacion se ignoran.
     team       -> lista de hasta 6 Pokemon (dejala vacia [] si aun no la has jugado)

   Cada Pokemon:
     dex      -> numero de la Pokedex Nacional (para el sprite)
     species  -> nombre de la especie
     nickname -> apodo ("" si no tiene)
     gender   -> "m" (macho), "f" (hembra) o "n" (desconocido/sin genero)
     types    -> ["fire", "flying"] (opcional: si lo omites se busca en PokeAPI)
     form     -> Forma regional (opcional): "alola", "galar", "hisui", "paldea".
                 Tambien valen "mega", "mega-x", "mega-y", "gmax". Con esto la pagina
                 busca en PokeAPI el sprite y los tipos propios de esa forma.
                 Si una especie tiene varias variantes hay que ser mas concreto,
                 p. ej. Tauros: "paldea-combat-breed", "paldea-blaze-breed".
     ball     -> Ball de captura: "poke-ball", "great-ball", "ultra-ball", "master-ball",
                 "premier-ball", "luxury-ball", "dusk-ball", "quick-ball", "net-ball",
                 "dive-ball", "nest-ball", "repeat-ball", "timer-ball", "heal-ball",
                 "safari-ball", "level-ball", "lure-ball", "moon-ball", "friend-ball",
                 "love-ball", "heavy-ball", "fast-ball", "dream-ball", "beast-ball",
                 "sport-ball", "cherish-ball", "park-ball"
     shiny    -> true si es variocolor (opcional)

   Tipos validos: normal fire water electric grass ice fighting poison
                  ground flying psychic bug rock ghost dragon dark steel fairy
   ============================================================ */

const TEAMS = [
  /* --- Salon de la Fama: tus favoritos, salgan de la generacion que salgan.
         Admite los mismos campos que cualquier otro Pokemon (form, ball, shiny...)
         y no tiene limite de seis. La etiqueta de generacion se calcula sola
         buscando el Pokemon en los equipos de abajo. --- */
  {
    id: "favoritos",
    hall: true,
    title: "Mis favoritos",
    subtitle: "De todas las regiones",
    color: "#ffffff",
    team: [
      { dex: 9,   species: "Blastoise",  nickname: "Shellshock", gender: "m", types: ["water"], ball: "poke-ball" },
      { dex: 26,  species: "Raichu",     nickname: "Raider",       gender: "m", types: ["electric"], ball: "poke-ball" },
      { dex: 197,  species: "Umbreon",   nickname: "Shadow",       gender: "m", types: ["dark"], ball: "poke-ball" },
      { dex: 464,  species: "Rhyperior",   nickname: "Rocksteady",      gender: "m", types: ["ground", "rock"], ball: "safari-ball" },
      { dex: 34,  species: "Nidoking",   nickname: "Royalrumble",       gender: "m", types: ["poison", "ground"], ball: "poke-ball" },
      { dex: 212, species: "Scizor",     nickname: "Redsteel",     gender: "m", types: ["bug", "steel"], ball: "poke-ball" },
    ]
  },
  {
    id: "gen-1",
    generation: 1,
    region: "Kanto",
    game: "Pokemon FireRed",
    missing: "18, 20, 35-36, 39-40, 44-45, 49, 51, 53, 61-65, 67-68, 73, 75-76, 85, 87-89, 93-94, 99, 103, 108, 110, 113, 115, 119, 122-124, 128, 134-137, 141, 146-150",
    color: "#ff6b35",
    team: [
      { dex: 9,   species: "Blastoise",  nickname: "Shellshock", gender: "m", types: ["water"], ball: "poke-ball" },
      { dex: 26,  species: "Raichu",     nickname: "Raider",       gender: "m", types: ["electric"], ball: "poke-ball" },
      { dex: 34,  species: "Nidoking",   nickname: "Rampage",       gender: "m", types: ["poison", "ground"], ball: "poke-ball" },
      { dex: 59,  species: "Arcanine",   nickname: "Hotrod",      gender: "m", types: ["fire"], ball: "poke-ball" },
      { dex: 112, species: "Rhydon",     nickname: "Rocksteady",   gender: "m", types: ["ground", "rock"], ball: "safari-ball" },
      { dex: 142, species: "Aerodactyl", nickname: "Skydread",     gender: "m", types: ["rock", "flying"], ball: "poke-ball" }
    ]
  },
  {
    id: "gen-2",
    generation: 2,
    region: "Johto",
    game: "Pokemon HeartGold",
    missing: "152-251",
    color: "#ffc233",
    team: [
      { dex: 160, species: "Feraligatr", nickname: "Jawbreakr", gender: "m", types: ["water"], ball: "poke-ball" },
      { dex: 197, species: "Umbreon",    nickname: "Shadow",    gender: "m", types: ["dark"], ball: "ultra-ball" },
      { dex: 169, species: "Crobat",     nickname: "Batboy",          gender: "m", types: ["poison", "flying"], ball: "poke-ball" },
      { dex: 232, species: "Donphan",    nickname: "Justroll",          gender: "m", types: ["ground"], ball: "premier-ball" },
      { dex: 214, species: "Heracross",  nickname: "Ringostar",          gender: "m", types: ["bug", "fighting"], ball: "great-ball" },
      { dex: 248, species: "Tyranitar",  nickname: "Punkrock",          gender: "m", types: ["rock", "dark"], ball: "heavy-ball" }
    ]
  },
  {
    id: "gen-3",
    generation: 3,
    region: "Hoenn",
    game: "Pokemon Omega Ruby",
    missing: "252-386",
    color: "#d81b60",
    team: [
      { dex: 254, species: "Sceptile",  nickname: "Razoredge", gender: "m", types: ["grass"], ball: "poke-ball" },
      { dex: 295, species: "Exploud", nickname: "Boombox", gender: "m", types: ["normal"], ball: "poke-ball" },
      { dex: 319, species: "Sharpedo",  nickname: "Bloodseak", gender: "m", types: ["water", "dark"], ball: "quick-ball" },
      { dex: 362, species: "Glalie",    nickname: "Frostbite", gender: "m", types: ["ice"], ball: "dive-ball" },
      { dex: 306, species: "Aggron",    nickname: "Trashmetal", gender: "m", types: ["steel", "rock"], ball: "premier-ball" },
      { dex: 373, species: "Salamance",   nickname: "Rhaegar", gender: "m", types: ["dragon", "flying"], ball: "great-ball" },
    ]
  },
  {
    id: "gen-4",
    generation: 4,
    region: "Sinnoh",
    game: "Pokemon Brilliant Diamond",
    missing: "387-493",
    color: "#56ccf2",
    team: [
      { dex: 395, species: "Empoleon",   nickname: "Emperor", gender: "m", types: ["water", "steel"], ball: "poke-ball" },
      { dex: 430, species: "Honchkrow",  nickname: "Capone", gender: "m", types: ["dark", "flying"], ball: "poke-ball" },
      { dex: 405, species: "Luxray",     nickname: "Blackout", gender: "m", types: ["electric"], ball: "ultra-ball" },
      { dex: 454, species: "Toxicroak",  nickname: "", gender: "m", types: ["poison", "fighting"], ball: "safari-ball" },
      { dex: 461, species: "Weavile",    nickname: "", gender: "m", types: ["dark", "ice"], ball: "dusk-ball" },
      { dex: 445, species: "Garchomp",   nickname: "Starscream", gender: "m", types: ["dragon", "ground"], ball: "quick-ball" }
    ]
  },
  {
    id: "gen-5",
    generation: 5,
    region: "Teselia",
    game: "Pokemon White 2",
    missing: "494-649",
    color: "#f0f0f0",
    team: [
      { dex: 500, species: "Emboar",     nickname: "Porkchop", gender: "m", types: ["fire", "fighting"], ball: "poke-ball" },
      { dex: 508, species: "Stoutland",  nickname: "Chewbie", gender: "m", types: ["normal"], ball: "poke-ball" },
      { dex: 523, species: "Zebstrika",  nickname: "", gender: "m", types: ["electric"], ball: "poke-ball" },
      { dex: 553, species: "Krookodile", nickname: "Xades", gender: "m", types: ["ground", "dark"], ball: "poke-ball" },
      { dex: 628, species: "Braviary",   nickname: "Freedoom", gender: "m", types: ["normal", "flying"], ball: "poke-ball" },
      { dex: 565, species: "Carracosta", nickname: "", gender: "m", types: ["water", "rock"], ball: "poke-ball" }
    ]
  },
  {
    id: "gen-6",
    generation: 6,
    region: "Kalos",
    game: "Pokemon Y",
    missing: "650-721",
    color: "#e8383d",
    team: [
      { dex: 652, species: "Chesnaught", nickname: "Wreckingball", gender: "m", types: ["grass", "fighting"], ball: "poke-ball" },
      { dex: 663, species: "Talonflame", nickname: "", gender: "m", types: ["fire", "flying"], ball: "poke-ball" },
      { dex: 675, species: "Pangoro",    nickname: "", gender: "m", types: ["fighting", "dark"], ball: "premier-ball" },
      { dex: 693, species: "Clawitzer",  nickname: "", gender: "m", types: ["water"], ball: "dive-ball" },
      { dex: 715, species: "Noivern",    nickname: "Jetstream", gender: "m", types: ["flying", "dragon"], ball: "net-ball" },
      { dex: 697, species: "Tyrantrum",  nickname: "Ragnarock", gender: "m", types: ["rock", "dragon"], ball: "poke-ball" }
    ]
  },
  {
    id: "gen-7",
    generation: 7,
    region: "Alola",
    game: "Pokemon Ultra Moon",
    missing: "722-809, 10091-10092, 10100-10115",
    color: "#4a6cf7",
    team: [
      { dex: 727, species: "Incineroar",  nickname: "Zeromiedo", gender: "m", types: ["fire", "dark"], ball: "poke-ball" },
      { dex: 738, species: "Vikavolt",    nickname: "Rokushock", gender: "m", types: ["bug", "electric"], ball: "poke-ball" },
      { dex: 745, species: "Lycanroc",    nickname: "Chopper", gender: "m", types: ["rock"], ball: "poke-ball" },
      { dex: 778, species: "Mimikyu",  nickname: "Kidrhaul", gender: "m", types: ["ghost", "fairy"], ball: "dream-ball" },
      { dex: 28, species: "Sandslash", form: "alola",   nickname: "Spike", gender: "m", types: ["ice", "steel"], ball: "dive-ball" },
      { dex: 768, species: "Golisopod",   nickname: "Greivous", gender: "m", types: ["bug", "water"], ball: "premier-ball" }
    ]
  },
  {
    id: "gen-8",
    generation: 8,
    region: "Galar",
    game: "Pokemon Sword",
    missing: "810-905, 10161-10176, 10179-10180, 10229-10244",
    color: "#00c2d1",
    team: [
      { dex: 815, species: "Cinderace",    nickname: "Burnabeu", gender: "m", types: ["fire"], ball: "poke-ball" },
      { dex: 823, species: "Corviknight", nickname: "Knightwing", gender: "m", types: ["flying", "steel"], ball: "poke-ball" },
      { dex: 834, species: "Drednaw",   nickname: "Juggernawt", gender: "m", types: ["water", "rock"],    ball: "poke-ball" },
      { dex: 862, species: "Obstagoon",   nickname: "Crossroad", gender: "m", types: ["dark", "normal"], ball: "poke-ball" },
      { dex: 849, species: "Toxtricity", form: "low-key",  nickname: "Punkshock", gender: "m", types: ["electric", "poison"], ball: "luxury-ball" },
      { dex: 873, species: "Frosmoth",    nickname: "Snowflake", gender: "f", types: ["ice", "bug"],      ball: "premier-ball" }
    ]
  },
  {
    id: "gen-9",
    generation: 9,
    region: "Paldea",
    game: "Pokemon Violet",
    forms: ["ursaluna-bloodmoon"],
    missing: "906-1025, 10250-10253",
    color: "#b46cff",
    team: [
      { dex: 908, species: "Meowscarada",   nickname: "Wildflower", gender: "f", types: ["grass", "dark"],    ball: "poke-ball" },
      { dex: 941, species: "Kilowattrel",   nickname: "Lighting", gender: "m", types: ["electric", "flying"], ball: "ultra-ball" },
      { dex: 920, species: "Lokix",          nickname: "Chainsaw", gender: "m", types: ["bug", "dark"],      ball: "level-ball" },
      { dex: 937, species: "Ceruledge",      nickname: "Souleater", gender: "m", types: ["fire", "ghost"],    ball: "dusk-ball" },
      { dex: 959, species: "Tinkaton",        nickname: "Babymetal", gender: "f", types: ["fairy", "steel"],              ball: "heal-ball" },
      { dex: 901, species: "Ursaluna", form: "bloodmoon", nickname: "Moonster", gender: "m", types: ["ground", "normal"], ball: "timer-ball" }
    ]
  },
  {
    id: "gen-10",
    generation: 10,
    region: "Por confirmar",
    game: "Pokemon Waves",
    missing: "",
    color: "#22d3ee",
    team: []
  }
];
