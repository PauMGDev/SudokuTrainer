/**
 * Rejilla de candidatos: los 81 sets calculados de una pasada.
 *
 * Todos los detectores necesitan lo mismo antes de mirar nada, y llamar a
 * `candidatesFor` dentro de sus bucles recorrería los peers de cada celda una
 * vez por unidad. Se calcula una vez por `find()` y se pasa.
 *
 * Los candidatos salen de los valores del tablero, no de las notas del jugador:
 * un detector razona sobre las reglas, no sobre lo que el jugador haya apuntado.
 */

import { candidatesFor } from '../board';
import { BOARD_SIZE, type Board, type CandidateSet, type CellIndex } from '../types';

/** Candidatos por índice de celda. Las celdas con valor tienen el set vacío. */
export type CandidateGrid = readonly CandidateSet[];

export function candidateGrid(board: Board): CandidateGrid {
  return Array.from({ length: BOARD_SIZE }, (_unused, index: CellIndex) =>
    candidatesFor(board, index),
  );
}
