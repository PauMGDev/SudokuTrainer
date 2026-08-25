/**
 * Una partida concreta: `/hard/12` es un tablero reproducible y compartible.
 *
 * El nivel y la semilla van en la ruta, no en la query, porque una ruta se
 * cachea por URL y una query no. Las primeras semillas de cada nivel se
 * prerenderizan en el build; el resto se genera la primera vez que alguien las
 * pide y queda cacheada a partir de ahí. Como el catálogo está acotado
 * (MAX_SEED por nivel), el gasto total tiene techo por muchas visitas que
 * lleguen.
 */

import { notFound } from 'next/navigation';
import { DIFFICULTIES } from 'engine';

import { BoardPage } from '../../../components/BoardPage';
import { toDifficulty, toSeed } from '../../../lib/boards';

/**
 * Cuántas semillas por nivel entran en el build. Pocas: son las que se visitan
 * al llegar desde la portada, y cada una cuesta su generación en compilación.
 * Las demás se cachean solas cuando alguien las pide.
 */
const PRERENDERED = 5;

export function generateStaticParams(): Array<{ difficulty: string; seed: string }> {
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: PRERENDERED }, (_, index) => ({
      difficulty,
      seed: String(index),
    })),
  );
}

/**
 * Los parámetros se tipan a mano: `PageProps` lo genera Next durante el build
 * y `pnpm typecheck` corre antes, así que en frío todavía no existe.
 */
interface Params {
  readonly params: Promise<{ readonly difficulty: string; readonly seed: string }>;
}

export default async function Page({ params }: Params) {
  const { difficulty: level, seed: requested } = await params;

  const difficulty = toDifficulty(level);
  const seed = toSeed(requested);
  // Una ruta que no nombra un nivel y una semilla de verdad no es una partida:
  // 404 y no un tablero por defecto, que enmascararía el enlace roto.
  if (difficulty === null || seed === null) notFound();

  return <BoardPage difficulty={difficulty} seed={seed} />;
}
