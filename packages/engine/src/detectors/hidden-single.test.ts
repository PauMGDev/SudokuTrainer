import { describe, expect, it } from 'vitest';
import { fromString } from '../board';
import { CLASSIC, CLASSIC_SOLUTION, EMPTY, HARD_23 } from '../fixtures/puzzles';
import { requireRef } from '../notation';
import { findHiddenSingles, hiddenSingleDetector } from './hidden-single';
import { findNakedSingles } from './naked-single';
import { DETECTORS } from './registry';

describe('hidden single', () => {
  it('todas sus colocaciones coinciden con la solución', () => {
    const solution = fromString(CLASSIC_SOLUTION);
    const detections = findHiddenSingles(fromString(CLASSIC));

    expect(detections.length).toBeGreaterThan(0);
    for (const { placements: [placement] } of detections) {
      expect(placement.digit, `valor esperado en ${placement.cell}`).toBe(
        solution.cells[requireRef(placement.cell)].value,
      );
    }
  });

  it('el patrón es la unidad entera, no solo la celda', () => {
    const detection = findHiddenSingles(fromString(CLASSIC))[0];

    expect(detection.technique).toBe('hidden-single');
    expect(detection.placements).toEqual([{ cell: 'R3C7', digit: 5 }]);
    expect(detection.cells).toEqual([
      'R3C1', 'R3C2', 'R3C3', 'R3C4', 'R3C5', 'R3C6', 'R3C7', 'R3C8', 'R3C9',
    ]);
    expect(detection.digits).toEqual([5]);
  });

  it('ve colocaciones donde el naked single no llega', () => {
    const board = fromString(HARD_23);

    expect(findNakedSingles(board)).toEqual([]);
    expect(findHiddenSingles(board).length).toBeGreaterThan(0);
  });

  it('no repite lo que ya es un naked single', () => {
    const nakedCells = new Set(
      findNakedSingles(fromString(CLASSIC)).map((detection) => detection.placements[0].cell),
    );
    const hiddenCells = findHiddenSingles(fromString(CLASSIC)).map(
      (detection) => detection.placements[0].cell,
    );

    expect(hiddenCells.filter((cell) => nakedCells.has(cell))).toEqual([]);
  });

  it('la misma colocación por fila, columna y caja son detecciones distintas', () => {
    const keys = findHiddenSingles(fromString(CLASSIC)).map((detection) => detection.patternKey);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('no encuentra nada en un tablero vacío ni en uno resuelto', () => {
    expect(findHiddenSingles(fromString(EMPTY))).toEqual([]);
    expect(findHiddenSingles(fromString(CLASSIC_SOLUTION))).toEqual([]);
  });

  it('está dado de alta en el registro', () => {
    expect(hiddenSingleDetector.technique).toBe('hidden-single');
    expect(DETECTORS).toContain(hiddenSingleDetector);
  });
});
