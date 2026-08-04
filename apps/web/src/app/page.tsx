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

const LINK =
  'flex min-h-9 items-center justify-center rounded-sm border border-line px-3 text-sm ' +
  'transition-colors hover:border-accent-deep';

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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-xl tracking-tight">{copy.app.title}</h1>
        <p className="text-sm text-ink-muted">{copy.app.tagline}</p>
      </header>

      <nav aria-label={copy.game.difficultyLabel} className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((level) => (
          <Link
            key={level}
            href={href(level)}
            aria-current={level === difficulty ? 'page' : undefined}
            className={`${LINK} ${level === difficulty ? 'border-accent text-accent' : 'text-ink-muted'}`}
          >
            {copy.game.difficulty[level]}
          </Link>
        ))}
        <Link href={href(difficulty)} className={`${LINK} ml-auto`}>
          {copy.game.newGame}
        </Link>
      </nav>

      {/* Sin `key`, navegar cambiaría la prop pero el reducer conservaría el
          tablero anterior: el estado se inicializa una sola vez por montaje. */}
      <Game key={wire} puzzle={wire} />
    </main>
  );
}
