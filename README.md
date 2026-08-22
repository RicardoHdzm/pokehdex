# Mis Equipos Pokemon

Pagina web estatica que muestra, en cada generacion, mi equipo de 6 Pokemon (sprite,
apodo, especie, genero, tipos y Ball) y la Pokedex completa de esa generacion con los
capturados marcados.

## Como verla

Abre `index.html` con doble clic. No necesita instalar nada.

Si prefieres un servidor local:

```bash
node .claude/server.js
```

Luego entra en <http://localhost:5178>.

## Como editar un equipo

Todo esta en [`data/teams.js`](data/teams.js). Hay una entrada por generacion (1 a 9):

```js
{
  id: "gen-1",          // se usa en la URL (#gen-1)
  generation: 1,
  region: "Kanto",
  color: "#e8503a",     // color de acento de esa generacion
  team: [
    { dex: 9, species: "Blastoise", nickname: "Shellshocker", gender: "m", types: ["water"], ball: "poke-ball" }
  ]
}
```

Campos de cada Pokemon:

| Campo      | Obligatorio | Descripcion |
|------------|-------------|-------------|
| `dex`      | si          | Numero de la Pokedex Nacional (define el sprite) |
| `species`  | si          | Nombre de la especie |
| `nickname` | no          | Apodo. Si lo dejas vacio se muestra la especie |
| `gender`   | si          | `"m"`, `"f"` o `"n"` (sin genero) |
| `types`    | no          | `["fire","flying"]`. Si lo omites se consulta a PokeAPI y se guarda en cache |
| `form`     | no          | Forma regional: `"alola"`, `"galar"`, `"hisui"`, `"paldea"`. Tambien `"mega"`, `"mega-x"`, `"mega-y"`, `"gmax"` |
| `ball`     | no          | Ball de captura, p. ej. `"ultra-ball"`. Se muestra en la esquina de la lamina |
| `shiny`    | no          | `true` para usar el sprite variocolor |

Con `form` la pagina pide a PokeAPI el sprite y los tipos propios de esa forma, asi que
no hace falta que toques `dex` ni `types`. Si una especie tiene varias variantes hay que
concretar mas, por ejemplo Tauros: `"paldea-combat-breed"`, `"paldea-blaze-breed"`,
`"paldea-aqua-breed"`.

Balls disponibles: `poke-ball`, `great-ball`, `ultra-ball`, `master-ball`, `premier-ball`,
`luxury-ball`, `dusk-ball`, `quick-ball`, `net-ball`, `dive-ball`, `nest-ball`,
`repeat-ball`, `timer-ball`, `heal-ball`, `safari-ball`, `level-ball`, `lure-ball`,
`moon-ball`, `friend-ball`, `love-ball`, `heavy-ball`, `fast-ball`, `dream-ball`,
`beast-ball`, `sport-ball`, `cherish-ball`, `park-ball`.

Si una generacion tiene menos de 6 Pokemon (o `team: []`), los huecos se muestran vacios.

Para añadir una generacion futura, copia el ultimo bloque y cambia `id`, `generation`,
`region` y `color`. El ordinal ("Decima generacion") ya esta contemplado en `js/app.js`.

## Pokedex de cada generacion

Cada pestaña de generacion muestra dos bloques: arriba tu **equipo campeon** de seis, y
debajo la **Pokedex completa** de esa generacion con los capturados marcados. La cabecera
indica la region y el juego con el que la jugaste (campo `game` de la generacion).

La lista de especies se pide a PokeAPI una sola vez (una peticion para las 1025) y se
guarda en el navegador, asi que a partir de la segunda visita se pinta sin red.

Para marcar capturados se apunta lo contrario: el campo `missing` lista los que **te
faltan**, y todo lo demas del rango cuenta como capturado. Con una Pokedex casi completa
es mucho menos que escribir.

```js
missing: "10-15, 25, 63-65, 150",   // te faltan esos
missing: "",                        // Pokedex completa
missing: "1-151",                   // generacion sin empezar
```

Detalles:

- **Los seis del equipo cuentan como capturados** aunque los pongas en `missing`.
- Cada pestaña lista los Pokemon **introducidos en esa generacion** (Kanto 151, Johto
  los 100 nuevos, Hoenn 135...), asi que ninguno aparece en dos pestañas.
- **Las formas regionales van al final de la Pokedex de la region que las estreno**,
  con el borde a rayas y un rombo junto al numero: las de Alola en la septima, las de
  Galar y Hisui en la octava, las de Paldea en la novena. Llevan el numero de su
  especie (#0026 Raichu de Alola) pero cuentan como entrada aparte.
- En `missing` las formas se identifican con su id de PokeAPI, de 10000 en adelante.
  No hace falta que los busques: los genera la pagina de marcar.
- Los numeros fuera del rango de la generacion se ignoran.

## Pagina para marcar capturados

Escribir a mano cientos de numeros es inviable, asi que hay un editor aparte:
**`admin.html`** (enlazado tambien al pie de la coleccion).

- Haces clic en cada Pokemon para marcarlo o desmarcarlo.
- Abajo se genera la linea `missing` ya comprimida en rangos, con boton de copiar.
- El boton **Ver las 9 generaciones** saca las nueve lineas de golpe.
- Los seis del equipo salen con un candado: cuentan como capturados y no se tocan.
- Hay filtro por nombre o numero, y botones de marcar y desmarcar todo.

Lo que marcas se guarda en el navegador mientras trabajas, pero **no es definitivo
hasta que pegas el codigo en `data/teams.js`**. El boton *Volver a teams.js* descarta
el borrador de esa generacion y recupera lo que hay en el archivo.

## Salon de la Fama (favoritos)

La primera entrada de `TEAMS` no es una generacion, sino tu seleccion de favoritos.
Se distingue por `hall: true` y admite los mismos campos que cualquier Pokemon:

```js
{
  id: "favoritos",
  hall: true,
  title: "Mis favoritos",
  subtitle: "De todas las regiones",
  color: "#ffd45c",
  team: [
    { dex: 9, species: "Blastoise", nickname: "Shellshock", gender: "m", ball: "poke-ball" }
  ]
}
```

Diferencias con una generacion normal:

- **No tiene limite de seis** ni muestra huecos vacios.
- En lugar del contador `01 / 06`, cada lamina indica **de que generacion viene**.
  Se calcula solo: primero busca el Pokemon en tus equipos; si no esta, lo deduce de
  la forma regional o del numero de Pokedex.
- Si la dejas vacia, la pagina se abre en la primera generacion en vez de en una
  seccion sin nada.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub.
2. Settings → Pages → Source: `Deploy from a branch`, rama `main`, carpeta `/ (root)`.

## Estructura

```
index.html        Estructura de la pagina
admin.html        Editor para marcar capturados y generar el codigo
css/styles.css    Estilos (tema arcade oscuro, tipografia de 8 bits, colores de tipo)
css/admin.css     Estilos propios del editor
js/admin.js       Logica del editor
js/app.js         Selector de generacion y render de las tarjetas
data/teams.js     TUS EQUIPOS — es lo unico que necesitas editar
```

Los sprites se cargan desde el repositorio de [PokeAPI](https://github.com/PokeAPI/sprites),
asi que hace falta conexion a internet para verlos.

## Cambiar el estilo de imagen

En [`js/app.js`](js/app.js), la constante `SPRITE_STYLE` decide que imagen se usa:

```js
const SPRITE_STYLE = "pixel";   // sprites de 8 bits (por defecto)
// const SPRITE_STYLE = "artwork";  // ilustracion oficial en alta resolucion
```
