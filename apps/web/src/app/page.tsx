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
 */

const DEFAULT_DIFFICULTY: Difficulty = 'easy';

type Param = string | string[] | undefined;

function toDifficulty(param: Param): Difficulty {
  return DIFFICULTIES.find((difficulty) => difficulty === param) ?? DEFAULT_DIFFICULTY;
}

function toSeed(param: Param): number {
  const seed = Number(param);
  return Number.isInteger(seed) && seed >= 0 ? seed : 0;
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
  const { puzzle, seed } = generate({ seed: toSeed(params.seed), difficulty });
  // Formato de cable: los 81 caracteres, el mismo que necesitará /api/explain.
  const wire = boardToString(puzzle);

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
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center-safe gap-5 p-4
        pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6"
    >
      {/* Todo en mono: es una app de números, no una portada editorial. */}
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl leading-none tracking-tight sm:text-4xl">
          {copy.app.title}
        </h1>
        <p className="font-mono text-sm text-ink-muted">{copy.app.tagline}</p>
      </header>

      {/* En móvil, los tres niveles se reparten la fila y "New game" ocupa la
          suya: con `flex-wrap` y `ml-auto` quedaba descolgado a media línea. */}
      <nav aria-label={copy.game.difficultyLabel} className="flex flex-wrap items-center gap-2">
        {DIFFICULTIES.map((level) => (
          <Link
            key={level}
            href={href(level)}
            aria-current={level === difficulty ? 'page' : undefined}
            className={`${LINK} flex-1 sm:flex-none ${
              level === difficulty ? 'border-accent text-accent' : 'text-ink-muted'
            }`}
          >
            {copy.game.difficulty[level]}
          </Link>
        ))}
        <Link href={href(difficulty)} className={`${LINK} w-full text-ink-muted sm:ml-auto sm:w-auto`}>
          {copy.game.newGame}
        </Link>
      </nav>

      {/* Sin `key`, navegar cambiaría la prop pero el reducer conservaría el
          tablero anterior: el estado se inicializa una sola vez por montaje. */}
      <Game key={wire} puzzle={wire} />
    </main>
  );
}
