import { describe, expect, it } from 'vitest';
import { candidatesFor, fromString } from '../board';
import { CLASSIC } from '../fixtures/puzzles';
import { requireRef } from '../notation';
import { BOARD_SIZE } from '../types';
import { candidateGrid } from './candidates';
import { findNakedSingles } from './naked-single';

describe('candidateGrid', () => {
  it('coincide celda a celda con candidatesFor', () => {
    const board = fromString(CLASSIC);
    const grid = candidateGrid(board);

    expect(grid).toHaveLength(BOARD_SIZE);
    for (let cell = 0; cell < BOARD_SIZE; cell += 1) {
      expect([...grid[cell]], `candidatos de la celda ${cell}`).toEqual([
        ...candidatesFor(board, cell),
      ]);
    }
  });

  it('los detectores usan la rejilla que se les pasa, no la del tablero', () => {
    const board = fromString(CLASSIC);
    const grid = [...candidateGrid(board)];
    // R5C5 es un naked single del tablero: si su candidato desaparece de la
    // rejilla, el detector deja de verlo aunque el tablero no haya cambiado.
    grid[requireRef('R5C5')] = new Set();

    expect(findNakedSingles(board, grid).map((detection) => detection.cells[0])).not.toContain(
      'R5C5',
    );
  });
});
