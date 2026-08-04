/**
 * Pointing pair: un dígito que dentro de una caja solo cabe en dos celdas, y
 * esas dos comparten fila o columna. El dígito va en una de las dos, así que
 * en el resto de esa línea —fuera de la caja— queda descartado.
 *
 * Solo pares, no tríos: el trío (pointing triple) es otra técnica, con su
 * propio nombre y su propio sitio en la escala de dificultad.
 */

import { BOXES, COLUMNS, ROWS, colOf, rowOf, type Unit } from '../units';
import { DIGITS, type Board, type CellIndex } from '../types';
import { candidateGrid } from './candidates';
import { createDetection } from './detection';
import type { Detection, Detector } from './types';

const TECHNIQUE = 'pointing-pair';

/** La fila o la columna que comparten las dos celdas, o `null` si no comparten. */
function sharedLine(a: CellIndex, b: CellIndex): Unit | null {
  if (rowOf(a) === rowOf(b)) return ROWS[rowOf(a)];
  if (colOf(a) === colOf(b)) return COLUMNS[colOf(a)];
  return null;
}

export function findPointingPairs(board: Board): readonly Detection[] {
  const candidates = candidateGrid(board);
  const detections: Detection[] = [];

  for (const box of BOXES) {
    for (const digit of DIGITS) {
      const places = box.cells.filter((cell) => candidates[cell].has(digit));
      if (places.length !== 2) continue;

      const line = sharedLine(places[0], places[1]);
      if (line === null) continue;

      const eliminations = line.cells
        .filter((cell) => !places.includes(cell) && candidates[cell].has(digit))
        .map((cell) => ({ cell, digit }));
      if (eliminations.length === 0) continue;

      detections.push(
        createDetection({
          technique: TECHNIQUE,
          cells: places,
          digits: [digit],
          eliminations,
        }),
      );
    }
  }

  return detections;
}

export const pointingPairDetector: Detector = {
  technique: TECHNIQUE,
  find: findPointingPairs,
};
