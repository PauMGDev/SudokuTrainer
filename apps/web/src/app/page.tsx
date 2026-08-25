import Link from 'next/link';
import { DIFFICULTIES, generate, toString as boardToString, type Difficulty } from 'engine';

import { Game } from '../components/Game';
import { copy } from '../copy';

/**
 * La partida vive en la URL: `?difficulty=hard&seed=12` es un tablero concreto y
 * reproducible, así que compartir el enlace comparte la partida y recargar no
 * la pierde. Leer `searchParams` hace la página dinámica — `generate` cuesta
 * entre 8 y 330 ms según el nivel (medido con el propio engine), asumible por
 * navegación, y así el solver se queda en servidor y fuera del bundle.
 *
 * Ese coste por navegación es asumible mientras quien navega sea una persona.
 * Un rastreador no navega: sigue todos los enlaces, y como cada tablero enlaza
 * a la semilla siguiente, el sitio parecía un grafo infinito de páginas caras.
 * En agosto de 2026 eso agotó la CPU incluida del plan y Vercel pausó la cuenta
 * entera. De ahí las tres defensas de este archivo y de `public/robots.txt`:
 * semillas acotadas, tableros cacheados y enlaces que no invitan a seguir.
 */

const DEFAULT_DIFFICULTY: Difficulty = 'easy';

/**
 * El espacio de semillas se cierra a propósito. Cada partida enlaza a la
 * siguiente semilla, así que sin tope hay infinitas URL distintas y cada una
 * cuesta una generación en servidor: un rastreador que siga los enlaces pasea
 * sin fin quemando CPU. Con el módulo el paseo da la vuelta, el catálogo es
 * finito —MAX_SEED tableros por nivel— y la caché de abajo lo cubre entero.
 */
const MAX_SEED = 1000;

type Param = string | string[] | undefined;

function toDifficulty(param: Param): Difficulty {
  return DIFFICULTIES.find((difficulty) => difficulty === param) ?? DEFAULT_DIFFICULTY;
}

function toSeed(param: Param): number {
  const seed = Number(param);
  return Number.isInteger(seed) && seed >= 0 ? seed % MAX_SEED : 0;
}

interface CachedBoard {
  /** Los 81 caracteres, el formato que necesitará `/api/explain`. */
  readonly wire: string;
  /** La semilla que de verdad produjo el tablero, no la que se pidió. */
  readonly seed: number;
}

/**
 * `generate` es determinista: mismos `seed` y `difficulty`, mismo tablero. Como
 * el catálogo es finito, el mapa se llena con MAX_SEED × niveles entradas de 81
 * caracteres y a partir de ahí ninguna visita vuelve a pagar la generación.
 *
 * Vive en el módulo, o sea por instancia de función: no es un caché compartido
 * ni pretende serlo, es no repetir el mismo trabajo mientras la instancia siga
 * viva. Es justo lo que hace falta contra el tráfico que repite URL.
 */
const boards = new Map<string, CachedBoard>();

function board(difficulty: Difficulty, seed: number): CachedBoard {
  const key = `${difficulty}:${seed}`;
  const cached = boards.get(key);
  if (cached !== undefined) return cached;

  const generated = generate({ seed, difficulty });
  const value: CachedBoard = { wire: boardToString(generated.puzzle), seed: generated.seed };
  boards.set(key, value);
  return value;
}

/**
 * El mismo enlace del portfolio: borde tenue, mono, y el cyan reservado para
 * el hover y el estado activo. 44 px de alto — el mínimo táctil cómodo.
 */
const LINK =
  'flex min-h-11 items-center justify-center rounded-sm border border-line px-4 font-mono text-sm ' +
  'transition-all duration-300 hover:border-accent hover:text-accent';

export default async function Page(props: PageProps<'/'>) {
  const params = await props.searchParams;
  const difficulty = toDifficulty(params.difficulty);
  const { wire, seed } = board(difficulty, toSeed(params.seed));

  // Se enlaza a la semilla *encontrada* + 1, no a la pedida: pedir un nivel
  // escaso avanza semillas hasta dar con él, y volver a pedir desde la misma
  // devolvería el mismo tablero una y otra vez.
  const href = (level: Difficulty): string => `/?difficulty=${level}&seed=${seed + 1}`;

  return (
    // `justify-center-safe`, no `justify-center`: en un móvil la partida entera
    // no cabe en la pantalla, y centrar un contenido más alto que el hueco
    // recorta por arriba y deja lo cortado fuera del alcance del scroll.
    // El padding inferior respeta la barra de gestos de iOS.
    <main
      // `max-w-lg` en móvil y tableta; en pantalla ancha se abre para que la
      // explicación quepa al lado del tablero en vez de debajo.
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center-safe gap-5 p-4
        pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6 lg:max-w-4xl"
    >
      {/* Todo en mono: es una app de números, no una portada editorial. */}
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl leading-none tracking-tight sm:text-4xl">
          {copy.app.title}
        </h1>
        <p className="font-mono text-sm text-ink-muted">{copy.app.tagline}</p>
      </header>

      {/* En móvil, los tres niveles se reparten la fila y "New game" ocupa la
          suya: con `flex-wrap` y `ml-auto` quedaba descolgado a media línea.
          En ancho va justo detrás del último nivel, no empujado al extremo
          derecho: allí flotaba solo, sin nada con lo que alinearse. El glifo y
          el hueco extra son los que lo separan del grupo de dificultades. */}
      <nav aria-label={copy.game.difficultyLabel} className="flex flex-wrap items-center gap-2">
        {DIFFICULTIES.map((level) => (
          <Link
            key={level}
            href={href(level)}
            // Cada enlace estrena semilla, así que para un rastreador esto no
            // se acaba nunca. `nofollow` es la señal que dice "no sigas por
            // aquí"; `robots.txt` lo repite para quien mire ahí primero.
            rel="nofollow"
            aria-current={level === difficulty ? 'page' : undefined}
            className={`${LINK} flex-1 sm:flex-none ${
              level === difficulty ? 'border-accent text-accent' : 'text-ink-muted'
            }`}
          >
            {copy.game.difficulty[level]}
          </Link>
        ))}
        <Link
          href={href(difficulty)}
          rel="nofollow"
          className={`${LINK} w-full gap-2 text-ink-muted sm:ml-2 sm:w-auto`}
        >
          <span aria-hidden>{copy.game.newGameGlyph}</span>
          {copy.game.newGame}
        </Link>
      </nav>

      {/* Sin `key`, navegar cambiaría la prop pero el reducer conservaría el
          tablero anterior: el estado se inicializa una sola vez por montaje. */}
      <Game key={wire} puzzle={wire} />
    </main>
  );
}
