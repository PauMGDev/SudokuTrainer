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
 * La dificultad la mide `classify`: la técnica más avanzada que el tablero
 * obliga a usar. Pedir un nivel concreto es probar semillas hasta que una cae
 * en él, porque quitar pistas no permite apuntar a una dificultad.
 */

import { BOARD_SIZE, DIGITS, type Board } from './types';
import { emptyBoard, fromString, getCell, toString } from './board';
import { hasUniqueSolution, solve } from './solver';
import { createRandom, type Random } from './random';
import { classify, type Difficulty } from './difficulty';

export interface GeneratedPuzzle {
  /** El tablero a jugar. Todas sus celdas rellenas son pistas. */
  readonly puzzle: Board;
  /** Su única solución. Viene de regalo: el generador ya la tenía. */
  readonly solution: Board;
  /** La semilla que lo produjo. Regenerar con ella da exactamente esto. */
  readonly seed: number;
  /** Cuántas pistas conserva el enunciado. */
  readonly clues: number;
  /**
   * La técnica más avanzada que exige, o `null` si no se resuelve con ninguna
   * de las que el engine sabe explicar. Ver `classify`.
   */
  readonly difficulty: Difficulty | null;
}

export interface GenerateOptions {
  /**
   * Semilla del generador. La misma semilla da siempre el mismo tablero, así que
   * sirve para reproducir un puzzle concreto en un test o en un informe de bug.
   */
  readonly seed?: number;
  /**
   * Nivel exigido. El generador prueba semillas consecutivas desde `seed` hasta
   * dar con un tablero de ese nivel, así que sigue siendo reproducible: mismos
   * `seed` y `difficulty`, mismo tablero.
   */
  readonly difficulty?: Difficulty;
}

/**
 * Semillas que se prueban antes de rendirse al pedir una dificultad.
 * Medido sobre las 100 primeras: fáciles ~48%, medias ~4%, difíciles ~4% y el
 * resto no se resuelve con las técnicas conocidas. Con el nivel más escaso, 200
 * intentos fallan solo si algo se ha roto, no por mala suerte.
 */
const MAX_ATTEMPTS = 200;

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

/** El tablero de una semilla concreta, ya clasificado. */
function generateFromSeed(seed: number): GeneratedPuzzle {
  const random = createRandom(seed);
  const solution = generateSolution(random);
  const puzzle = removeClues(solution, random);

  return Object.freeze({
    puzzle,
    solution,
    seed,
    clues: countClues(puzzle),
    difficulty: classify(puzzle),
  });
}

/**
 * Genera un sudoku con solución única.
 * Sin semilla explícita se usa la 0, reproducible a propósito: en un engine
 * determinista, "dame uno al azar" tiene que ser una decisión de quien llama,
 * no un efecto oculto.
 */
export function generate(options: GenerateOptions = {}): GeneratedPuzzle {
  const first = options.seed ?? 0;
  if (options.difficulty === undefined) return generateFromSeed(first);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const generated = generateFromSeed(first + attempt);
    if (generated.difficulty === options.difficulty) return generated;
  }
  throw new Error(
    `Ningún tablero de dificultad ${options.difficulty} en ${MAX_ATTEMPTS} semillas desde ${first}`,
  );
}
