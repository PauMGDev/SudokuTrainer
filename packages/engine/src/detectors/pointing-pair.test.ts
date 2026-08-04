import { describe, expect, it } from 'vitest';
import { fromString } from '../board';
import { CLASSIC, CLASSIC_SOLUTION, EMPTY } from '../fixtures/puzzles';
import { requireRef } from '../notation';
import { boxOf, colOf, rowOf } from '../units';
import { findPointingPairs, pointingPairDetector } from './pointing-pair';
import { DETECTORS } from './registry';

/** Las detecciones indexadas por su patrón, para pedir una concreta por nombre. */
function byPattern(board: string): Map<string, readonly { cell: string; digit: number }[]> {
  return new Map(
    findPointingPairs(fromString(board)).map((detection) => [
      `${detection.cells.join('+')}=${detection.digits[0]}`,
      detection.eliminations,
    ]),
  );
}

describe('pointing pair', () => {
  it('apunta a lo largo de la fila', () => {
    expect(byPattern(CLASSIC).get('R2C2+R2C3=7')).toEqual([
      { cell: 'R2C7', digit: 7 },
      { cell: 'R2C9', digit: 7 },
    ]);
  });

  it('apunta a lo largo de la columna', () => {
    expect(byPattern(CLASSIC).get('R4C6+R6C6=4')).toEqual([
      { cell: 'R1C6', digit: 4 },
      { cell: 'R3C6', digit: 4 },
    ]);
  });

  it('el patrón son dos celdas de la misma caja y la misma línea', () => {
    for (const detection of findPointingPairs(fromString(CLASSIC))) {
      const [a, b] = detection.cells.map(requireRef);

      expect(detection.cells).toHaveLength(2);
      expect(boxOf(a)).toBe(boxOf(b));
      expect(rowOf(a) === rowOf(b) || colOf(a) === colOf(b)).toBe(true);
    }
  });

  it('elimina siempre fuera de la caja del patrón', () => {
    for (const detection of findPointingPairs(fromString(CLASSIC))) {
      const box = boxOf(requireRef(detection.cells[0]));

      expect(detection.placements).toEqual([]);
      for (const elimination of detection.eliminations) {
        expect(boxOf(requireRef(elimination.cell))).not.toBe(box);
      }
    }
  });

  it('nunca elimina un dígito de la solución', () => {
    const solution = fromString(CLASSIC_SOLUTION);

    for (const detection of findPointingPairs(fromString(CLASSIC))) {
      for (const elimination of detection.eliminations) {
        expect(solution.cells[requireRef(elimination.cell)].value).not.toBe(elimination.digit);
      }
    }
  });

  it('no encuentra nada en un tablero vacío ni en uno resuelto', () => {
    expect(findPointingPairs(fromString(EMPTY))).toEqual([]);
    expect(findPointingPairs(fromString(CLASSIC_SOLUTION))).toEqual([]);
  });

  it('está dado de alta en el registro', () => {
    expect(pointingPairDetector.technique).toBe('pointing-pair');
    expect(DETECTORS).toContain(pointingPairDetector);
  });
});
