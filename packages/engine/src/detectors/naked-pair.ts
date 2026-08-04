/**
 * Naked pair: dos celdas de una unidad que admiten exactamente los mismos dos
 * dígitos. Entre las dos se reparten ese par, así que ninguna otra celda de la
 * unidad puede llevarlos.
 *
 * Primera técnica que no coloca nada: solo elimina candidatos. Si no elimina
 * ninguno, el par existe pero no enseña nada, y no se emite detección.
 */

import { ALL_UNITS, type Unit } from '../units';
import type { Board, CellIndex, Digit } from '../types';
import { candidateGrid, type CandidateGrid } from './candidates';
import { createDetection } from './detection';
import type { Detection, Detector } from './types';

const TECHNIQUE = 'naked-pair';

/** "4,9": identifica el par de candidatos de una celda. */
function pairKey(digits: readonly Digit[]): string {
  return digits.join(',');
}

function findInUnit(unit: Unit, candidates: CandidateGrid): Detection[] {
  const byPair = new Map<string, CellIndex[]>();
  for (const cell of unit.cells) {
    if (candidates[cell].size !== 2) continue;
    const key = pairKey([...candidates[cell]].sort((a, b) => a - b));
    byPair.set(key, [...(byPair.get(key) ?? []), cell]);
  }

  const detections: Detection[] = [];
  for (const [, cells] of byPair) {
    // Tres celdas con el mismo par sería un tablero sin solución: no es un
    // naked pair, y quien lo detecte es el validador, no el profesor.
    if (cells.length !== 2) continue;
    const digits = [...candidates[cells[0]]];
    const eliminations = unit.cells
      .filter((cell) => !cells.includes(cell))
      .flatMap((cell) => digits.filter((digit) => candidates[cell].has(digit)).map((digit) => ({ cell, digit })));

    if (eliminations.length === 0) continue;
    detections.push(
      createDetection({ technique: TECHNIQUE, cells, digits, eliminations }),
    );
  }
  return detections;
}

export function findNakedPairs(
  board: Board,
  candidates: CandidateGrid = candidateGrid(board),
): readonly Detection[] {
  return ALL_UNITS.flatMap((unit) => findInUnit(unit, candidates));
}

export const nakedPairDetector: Detector = {
  technique: TECHNIQUE,
  find: findNakedPairs,
};
