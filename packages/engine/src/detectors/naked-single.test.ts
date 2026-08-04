import { describe, expect, it } from 'vitest';
import { fromString } from '../board';
import { CLASSIC, CLASSIC_SOLUTION, EMPTY, HARD_23 } from '../fixtures/puzzles';
import { requireRef } from '../notation';
import { DETECTORS } from './registry';
import { findNakedSingles, nakedSingleDetector } from './naked-single';

/** "R5C5=5", el formato en el que se leen de un vistazo las colocaciones. */
function placements(board: string): string[] {
  return findNakedSingles(fromString(board)).map(
    (detection) => `${detection.cells[0]}=${detection.placements[0].digit}`,
  );
}

describe('naked single', () => {
  it('encuentra todas las celdas con un único candidato', () => {
    expect(placements(CLASSIC)).toEqual(['R5C5=5', 'R7C6=7', 'R7C9=4', 'R8C8=3']);
  });

  it('coloca el dígito que dice la solución', () => {
    const solution = fromString(CLASSIC_SOLUTION);

    for (const { placements: [placement] } of findNakedSingles(fromString(CLASSIC))) {
      const cell = requireRef(placement.cell);
      expect(placement.digit, `valor esperado en ${placement.cell}`).toBe(solution.cells[cell].value);
    }
  });

  it('el patrón es la celda colocada y nada más', () => {
    const [first] = findNakedSingles(fromString(CLASSIC));

    expect(first.technique).toBe('naked-single');
    expect(first.cells).toEqual(['R5C5']);
    expect(first.digits).toEqual([5]);
    expect(first.eliminations).toEqual([]);
  });

  it('no encuentra nada en un tablero donde ninguna celda está forzada', () => {
    expect(placements(HARD_23)).toEqual([]);
    expect(placements(EMPTY)).toEqual([]);
  });

  it('no encuentra nada en un tablero resuelto', () => {
    expect(placements(CLASSIC_SOLUTION)).toEqual([]);
  });

  it('está dado de alta en el registro', () => {
    expect(nakedSingleDetector.technique).toBe('naked-single');
    expect(DETECTORS).toContain(nakedSingleDetector);
  });
});
