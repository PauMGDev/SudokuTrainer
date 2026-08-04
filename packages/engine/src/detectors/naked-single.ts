/**
 * Naked single: una celda vacía a la que solo le cabe un dígito.
 *
 * La técnica más simple que hay: no hace falta mirar más allá de los peers de
 * la celda. Es la primera pista que debe recibir el jugador siempre que exista.
 */

import { BOARD_SIZE, type Board } from '../types';
import { candidateGrid } from './candidates';
import { createDetection } from './detection';
import type { Detection, Detector } from './types';

const TECHNIQUE = 'naked-single';

export function findNakedSingles(board: Board): readonly Detection[] {
  const candidates = candidateGrid(board);
  const detections: Detection[] = [];

  for (let cell = 0; cell < BOARD_SIZE; cell += 1) {
    if (candidates[cell].size !== 1) continue;
    const [digit] = candidates[cell];
    detections.push(
      createDetection({
        technique: TECHNIQUE,
        cells: [cell],
        digits: [digit],
        placements: [{ cell, digit }],
      }),
    );
  }

  return detections;
}

export const nakedSingleDetector: Detector = {
  technique: TECHNIQUE,
  find: findNakedSingles,
};
