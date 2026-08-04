/**
 * Dificultad = la técnica más avanzada que un tablero obliga a usar.
 *
 * No el número de huecos: los tableros minimales del generador rondan todos las
 * 23–27 pistas y entre ellos los hay triviales y los hay que no salen con
 * ninguna técnica conocida. Lo que separa a un jugador de otro es el
 * razonamiento que necesita, no cuántas casillas ve vacías.
 *
 * Para medirlo hay que resolver de verdad, encadenando detecciones: un naked
 * pair no coloca nada, solo elimina candidatos, y esa eliminación es la que
 * destapa el siguiente single. Por eso el bucle mantiene su propia rejilla de
 * candidatos en vez de recalcularla del tablero en cada paso.
 */

import { isSolved, setCellValue } from './board';
import { candidateGrid } from './detectors/candidates';
import { DETECTORS, detectNext } from './detectors/registry';
import { rankOf, type Detection, type Detector, type TechniqueId } from './detectors/types';
import { requireRef } from './notation';
import { BOARD_SIZE, UNIT_SIZE, type Board, type CellIndex, type Digit } from './types';
import { peersOf } from './units';

/** Niveles de dificultad, de menor a mayor exigencia. */
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard'] as const);

export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * La técnica más avanzada que se permite en cada nivel. Un nivel incluye todas
 * las técnicas de los anteriores: el orden de `TECHNIQUES` es la escala.
 */
const HARDEST_TECHNIQUE: Readonly<Record<Difficulty, TechniqueId>> = Object.freeze({
  easy: 'hidden-single',
  medium: 'naked-pair',
  hard: 'pointing-pair',
});

/** Rejilla de candidatos mutable: la del solver, que va tachando sobre ella. */
type WorkingGrid = Set<Digit>[];

function workingGrid(board: Board): WorkingGrid {
  return candidateGrid(board).map((candidates) => new Set(candidates));
}

/** Cada paso tacha al menos un candidato, así que este tope no se alcanza nunca. */
const MAX_STEPS = BOARD_SIZE * UNIT_SIZE;

function detectorsUpTo(hardest: TechniqueId): readonly Detector[] {
  return DETECTORS.filter((detector) => rankOf(detector.technique) <= rankOf(hardest));
}

/** Coloca un dígito y lo retira de los candidatos de la celda y de sus peers. */
function place(board: Board, grid: WorkingGrid, cell: CellIndex, digit: Digit): Board {
  grid[cell] = new Set();
  for (const peer of peersOf(cell)) grid[peer].delete(digit);
  return setCellValue(board, cell, digit);
}

function apply(board: Board, grid: WorkingGrid, detection: Detection): Board {
  let next = board;
  for (const placement of detection.placements) {
    next = place(next, grid, requireRef(placement.cell), placement.digit);
  }
  for (const elimination of detection.eliminations) {
    grid[requireRef(elimination.cell)].delete(elimination.digit);
  }
  return next;
}

/**
 * Resuelve aplicando solo técnicas hasta `hardest`, y devuelve el tablero tal y
 * como quede: resuelto, o atascado en el punto en que ninguna de esas técnicas
 * ve nada. Es lo que hará el jugador si solo conoce esas técnicas.
 */
export function solveByTechniques(board: Board, hardest: TechniqueId): Board {
  const detectors = detectorsUpTo(hardest);
  const grid = workingGrid(board);
  let current = board;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const detection = detectNext(current, detectors, grid);
    if (detection === null) return current;
    current = apply(current, grid, detection);
  }
  return current;
}

/**
 * El nivel más bajo cuyas técnicas resuelven el tablero, o `null` si no lo
 * resuelve ninguno. `null` no significa "muy difícil" sino "fuera de lo que el
 * engine sabe explicar": esos tableros se descartan, no se ofrecen al jugador.
 */
export function classify(board: Board): Difficulty | null {
  for (const difficulty of DIFFICULTIES) {
    if (isSolved(solveByTechniques(board, HARDEST_TECHNIQUE[difficulty]))) return difficulty;
  }
  return null;
}
