import { describe, expect, it } from 'vitest';
import { candidatesFor, fromString } from '../board';
import { CLASSIC_SOLUTION, EMPTY, NAKED_PAIR } from '../fixtures/puzzles';
import { generate } from '../generator';
import { requireRef } from '../notation';
import { findNakedPairs, nakedPairDetector } from './naked-pair';
import { DETECTORS } from './registry';

describe('naked pair', () => {
  it('el fixture es el tablero que dice ser', () => {
    expect(fromString(NAKED_PAIR)).toEqual(generate({ seed: 3 }).puzzle);
  });

  it('ve el par desde la columna y desde la caja, con eliminaciones distintas', () => {
    const detections = findNakedPairs(fromString(NAKED_PAIR));

    expect(detections).toHaveLength(2);
    for (const detection of detections) {
      expect(detection.technique).toBe('naked-pair');
      expect(detection.cells).toEqual(['R8C1', 'R9C1']);
      expect(detection.digits).toEqual([7, 9]);
      expect(detection.placements).toEqual([]);
    }
    expect(detections[0].eliminations).toEqual([
      { cell: 'R4C1', digit: 9 },
      { cell: 'R6C1', digit: 7 },
      { cell: 'R6C1', digit: 9 },
    ]);
    expect(detections[1].eliminations).toEqual([
      { cell: 'R7C2', digit: 7 },
      { cell: 'R8C2', digit: 7 },
      { cell: 'R8C2', digit: 9 },
      { cell: 'R9C3', digit: 9 },
    ]);
  });

  it('solo elimina candidatos que la celda tenía', () => {
    const board = fromString(NAKED_PAIR);

    for (const detection of findNakedPairs(board)) {
      for (const elimination of detection.eliminations) {
        expect(candidatesFor(board, requireRef(elimination.cell)).has(elimination.digit)).toBe(true);
      }
    }
  });

  it('nunca elimina un dígito de la solución', () => {
    const { puzzle, solution } = generate({ seed: 3 });

    for (const detection of findNakedPairs(puzzle)) {
      for (const elimination of detection.eliminations) {
        expect(solution.cells[requireRef(elimination.cell)].value).not.toBe(elimination.digit);
      }
    }
  });

  it('no encuentra nada en un tablero vacío ni en uno resuelto', () => {
    expect(findNakedPairs(fromString(EMPTY))).toEqual([]);
    expect(findNakedPairs(fromString(CLASSIC_SOLUTION))).toEqual([]);
  });

  it('está dado de alta en el registro', () => {
    expect(nakedPairDetector.technique).toBe('naked-pair');
    expect(DETECTORS).toContain(nakedPairDetector);
  });
});
