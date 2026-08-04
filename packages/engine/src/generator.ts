/**
 * Generador de sudokus con solución única.
 *
 * Dos fases:
 * 1. Rejilla completa: resolver el tablero vacío probando los dígitos en orden
 *    barajado. La primera solución que sale es una rejilla válida aleatoria.
 * 2. Retirada de pistas: recorrer las celdas en orden barajado y vaciar cada una
 *    solo si el tablero sigue teniendo solución única.
 *
 * El resultado es minimal respecto a ese recorrido: ninguna de las pistas que
 * quedan se puede quitar sin que aparezca una segunda solución. No es el mínimo
 * absoluto —para eso habría que probar todos los órdenes—, pero sí garantiza
 * que no sobra ninguna.
 *
 * La dificultad no se calibra aquí: clasificar por la técnica más avanzada que
 * exige un tablero necesita los detectores de la fase 2 (paso 2.6). Este paso
 * solo promete unicidad.
 */

import { BOARD_SIZE, DIGITS, type Board } from './types';
import { emptyBoard, fromString, getCell, toString } from './board';
import { hasUniqueSolution, solve } from './solver';
import { createRandom, type Random } from './random';

export interface GeneratedPuzzle {
  /** El tablero a jugar. Todas sus celdas rellenas son pistas. */
  readonly puzzle: Board;
  /** Su única solución. Viene de regalo: el generador ya la tenía. */
  readonly solution: Board;
  /** La semilla que lo produjo. Regenerar con ella da exactamente esto. */
  readonly seed: number;
  /** Cuántas pistas conserva el enunciado. */
  readonly clues: number;
}

export interface GenerateOptions {
  /**
   * Semilla del generador. La misma semilla da siempre el mismo tablero, así que
   * sirve para reproducir un puzzle concreto en un test o en un informe de bug.
   */
  readonly seed?: number;
}

/** Una rejilla completa válida, elegida al azar según el generador `random`. */
export function generateSolution(random: Random): Board {
  const solution = solve(emptyBoard(), { digitOrder: random.shuffle(DIGITS) });
  // El tablero vacío siempre tiene solución: el solver solo devuelve null ante
  // un enunciado contradictorio, y aquí no hay enunciado.
  if (solution === null) throw new Error('El tablero vacío debería tener solución');
  return solution;
}

/**
 * Vacía celdas de la solución mientras esta siga siendo única.
 * Se trabaja sobre el texto del tablero porque `fromString` es lo que marca las
 * celdas rellenas como pistas: reconstruirlo deja los flags `given` correctos.
 */
function removeClues(solution: Board, random: Random): Board {
  const order = random.shuffle(Array.from({ length: BOARD_SIZE }, (_unused, index) => index));
  const cells = [...toString(solution)];

  for (const index of order) {
    const removed = cells[index];
    cells[index] = '.';
    if (!hasUniqueSolution(fromString(cells.join('')))) cells[index] = removed;
  }

  return fromString(cells.join(''));
}

export function countClues(board: Board): number {
  let clues = 0;
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    if (getCell(board, index).value !== null) clues += 1;
  }
  return clues;
}

/**
 * Genera un sudoku con solución única.
 * Sin semilla explícita se usa la 0, reproducible a propósito: en un engine
 * determinista, "dame uno al azar" tiene que ser una decisión de quien llama,
 * no un efecto oculto.
 */
export function generate(options: GenerateOptions = {}): GeneratedPuzzle {
  const seed = options.seed ?? 0;
  const random = createRandom(seed);
  const solution = generateSolution(random);
  const puzzle = removeClues(solution, random);

  return Object.freeze({
    puzzle,
    solution,
    seed,
    clues: countClues(puzzle),
  });
}
