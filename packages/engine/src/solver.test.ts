import { describe, expect, it } from 'vitest';

import { fromString, toString } from './board';
import { countSolutions, hasUniqueSolution, solve } from './solver';
import { ALL_UNITS } from './units';
import { requireRef } from './notation';
import type { Board } from './types';
import {
  CLASSIC,
  CLASSIC_SOLUTION,
  CONTRADICTORY,
  EMPTY,
  HARD_23,
  MULTIPLE_SOLUTIONS,
} from './fixtures/puzzles';

/** Comprueba la solución contra las reglas, no contra un string esperado. */
function expectValidSolution(board: Board | null): asserts board is Board {
  expect(board).not.toBeNull();
  if (board === null) return;
  for (const unit of ALL_UNITS) {
    const values = unit.cells.map((cell) => board.cells[cell].value);
    expect(new Set(values).size, `${unit.kind} ${unit.index}`).toBe(9);
  }
}

/** Comprueba que la solución respeta todas las pistas del enunciado. */
function expectRespectsGivens(puzzle: Board, solution: Board): void {
  puzzle.cells.forEach((cell, index) => {
    if (cell.value !== null) expect(solution.cells[index].value).toBe(cell.value);
  });
}

describe('solve', () => {
  it('resuelve el sudoku clásico', () => {
    const solution = solve(fromString(CLASSIC));
    expectValidSolution(solution);
    expect(toString(solution)).toBe(toString(fromString(CLASSIC_SOLUTION)));
  });

  it('resuelve un tablero de 23 pistas', () => {
    const puzzle = fromString(HARD_23);
    const solution = solve(puzzle);
    expectValidSolution(solution);
    expectRespectsGivens(puzzle, solution);
  });

  it('resuelve el tablero vacío', () => {
    expectValidSolution(solve(fromString(EMPTY)));
  });

  it('devuelve igual un tablero ya resuelto', () => {
    const solved = fromString(CLASSIC_SOLUTION);
    const solution = solve(solved);
    expectValidSolution(solution);
    expect(toString(solution)).toBe(toString(solved));
  });

  it('devuelve null si el enunciado se contradice', () => {
    expect(solve(fromString(CONTRADICTORY))).toBeNull();
  });

  it('conserva las pistas y marca como no-pistas las celdas que rellena', () => {
    const puzzle = fromString(CLASSIC);
    const solution = solve(puzzle);
    expectValidSolution(solution);
    expect(solution.cells[requireRef('R1C1')].given).toBe(true);
    expect(solution.cells[requireRef('R1C3')].given).toBe(false);
  });

  it('no muta el tablero que recibe', () => {
    const puzzle = fromString(CLASSIC);
    const before = toString(puzzle);
    solve(puzzle);
    expect(toString(puzzle)).toBe(before);
  });
});

describe('countSolutions', () => {
  it('cuenta una sola solución en un sudoku bien planteado', () => {
    expect(countSolutions(fromString(CLASSIC))).toBe(1);
    expect(countSolutions(fromString(HARD_23))).toBe(1);
  });

  it('detecta que hay más de una solución y para en el tope', () => {
    expect(countSolutions(fromString(MULTIPLE_SOLUTIONS))).toBe(2);
    expect(countSolutions(fromString(MULTIPLE_SOLUTIONS), 5)).toBe(5);
  });

  it('trata el tablero vacío como multi-solución', () => {
    expect(countSolutions(fromString(EMPTY))).toBe(2);
  });

  it('no cuenta ninguna solución si el enunciado se contradice', () => {
    expect(countSolutions(fromString(CONTRADICTORY))).toBe(0);
  });

  it('cuenta una solución en un tablero ya resuelto', () => {
    expect(countSolutions(fromString(CLASSIC_SOLUTION))).toBe(1);
  });

  it('exige un tope de al menos 1', () => {
    expect(() => countSolutions(fromString(CLASSIC), 0)).toThrow(RangeError);
  });

  it('no muta el tablero que recibe', () => {
    const puzzle = fromString(MULTIPLE_SOLUTIONS);
    const before = toString(puzzle);
    countSolutions(puzzle, 10);
    expect(toString(puzzle)).toBe(before);
  });
});

describe('hasUniqueSolution', () => {
  it('distingue el sudoku bien planteado del que no lo está', () => {
    expect(hasUniqueSolution(fromString(CLASSIC))).toBe(true);
    expect(hasUniqueSolution(fromString(HARD_23))).toBe(true);
    expect(hasUniqueSolution(fromString(MULTIPLE_SOLUTIONS))).toBe(false);
    expect(hasUniqueSolution(fromString(CONTRADICTORY))).toBe(false);
    expect(hasUniqueSolution(fromString(EMPTY))).toBe(false);
  });
});
