/**
 * Hidden single: un dígito que en toda una unidad solo cabe en una celda.
 *
 * La celda puede admitir más dígitos —por eso está "escondido"—, pero si el 7
 * de la fila no cabe en ninguna otra, ahí va. Se busca por unidad, no por celda:
 * es el razonamiento inverso al del naked single.
 *
 * Una misma colocación puede salir por fila, por columna y por caja. Se emite
 * una detección por unidad: son argumentos distintos para el jugador, y el
 * `patternKey` los distingue porque el patrón incluye la unidad entera.
 */

import { ALL_UNITS } from '../units';
import { DIGITS, type Board, type CellIndex } from '../types';
import { candidateGrid } from './candidates';
import { createDetection } from './detection';
import type { Detection, Detector } from './types';

const TECHNIQUE = 'hidden-single';

export function findHiddenSingles(board: Board): readonly Detection[] {
  const candidates = candidateGrid(board);
  const detections: Detection[] = [];

  for (const unit of ALL_UNITS) {
    for (const digit of DIGITS) {
      let only: CellIndex | null = null;
      let count = 0;
      for (const cell of unit.cells) {
        if (!candidates[cell].has(digit)) continue;
        only = cell;
        count += 1;
        if (count > 1) break;
      }
      // Un solo sitio y más de un candidato: con uno solo sería un naked single,
      // y la pista fácil ya la da esa técnica.
      if (count !== 1 || only === null || candidates[only].size === 1) continue;
      detections.push(
        createDetection({
          technique: TECHNIQUE,
          cells: unit.cells,
          digits: [digit],
          placements: [{ cell: only, digit }],
        }),
      );
    }
  }

  return detections;
}

export const hiddenSingleDetector: Detector = {
  technique: TECHNIQUE,
  find: findHiddenSingles,
};
