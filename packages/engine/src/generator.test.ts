import { describe, expect, it } from 'vitest';

import { BOARD_SIZE, type Board } from './types';
import { fromString, isSolved, toString } from './board';
import { DIFFICULTIES, classify, solveByTechniques, type Difficulty } from './difficulty';
import type { TechniqueId } from './detectors/types';
import { countClues, generate, generateSolution } from './generator';
import { createRandom } from './random';
import { hasUniqueSolution, solve } from './solver';
import { ALL_UNITS } from './units';

/** Las semillas del test de unicidad. Fijas: un fallo tiene que ser reproducible. */
const SEEDS = Array.from({ length: 20 }, (_unused, i) => i + 1);

function expectValidSolution(board: Board): void {
  for (const unit of ALL_UNITS) {
    const values = unit.cells.map((cell) => board.cells[cell].value);
    expect(new Set(values).size, `${unit.kind} ${unit.index}`).toBe(9);
  }
}

describe('generateSolution', () => {
  it('devuelve una rejilla completa y válida', () => {
    const solution = generateSolution(createRandom(1));
    expect(countClues(solution)).toBe(BOARD_SIZE);
    expectValidSolution(solution);
  });

  it('da rejillas distintas con semillas distintas', () => {
    const grids = new Set(SEEDS.map((seed) => toString(generateSolution(createRandom(seed)))));
    expect(grids.size).toBe(SEEDS.length);
  });
});

describe('generate', () => {
  it.each(SEEDS)('produce un puzzle con solución única (semilla %i)', (seed) => {
    const { puzzle, solution, clues } = generate({ seed });

    expect(hasUniqueSolution(puzzle)).toBe(true);
    expectValidSolution(solution);

    // La solución que devuelve es la del puzzle, no otra cualquiera.
    expect(toString(solve(puzzle)!)).toBe(toString(solution));

    // Todas las pistas del enunciado coinciden con la solución.
    puzzle.cells.forEach((cell, index) => {
      if (cell.value !== null) {
        expect(cell.given).toBe(true);
        expect(solution.cells[index].value).toBe(cell.value);
      }
    });

    // Un tablero, no la rejilla entera ni un tablero imposible de plantear.
    expect(clues).toBe(countClues(puzzle));
    expect(clues).toBeGreaterThanOrEqual(17);
    expect(clues).toBeLessThan(BOARD_SIZE);
  });

  it('devuelve el mismo tablero para la misma semilla', () => {
    expect(toString(generate({ seed: 12 }).puzzle)).toBe(toString(generate({ seed: 12 }).puzzle));
  });

  it('devuelve tableros distintos para semillas distintas', () => {
    const puzzles = new Set(SEEDS.map((seed) => toString(generate({ seed }).puzzle)));
    expect(puzzles.size).toBe(SEEDS.length);
  });

  it('usa la semilla 0 por defecto, sin aleatoriedad oculta', () => {
    expect(toString(generate().puzzle)).toBe(toString(generate({ seed: 0 }).puzzle));
  });

  it('no deja ninguna pista de sobra: quitar cualquiera rompe la unicidad', () => {
    // Sobre un solo tablero: son 81 comprobaciones de unicidad, una por celda.
    const { puzzle } = generate({ seed: 1 });
    const cells = [...toString(puzzle)];

    cells.forEach((value, index) => {
      if (value === '.') return;
      const without = [...cells];
      without[index] = '.';
      expect(hasUniqueSolution(fromString(without.join(''))), `sobra la pista ${index}`).toBe(false);
    });
  });
});

describe('generate por dificultad', () => {
  /**
   * Tres tableros por nivel: suficiente para que un fallo de clasificación se
   * vea, y barato porque las semillas son consecutivas y el generador va rápido.
   */
  const PER_DIFFICULTY = 3;

  /** El nivel inmediatamente anterior, o `null` para el más fácil. */
  const PREVIOUS: Readonly<Record<Difficulty, TechniqueId | null>> = {
    easy: null,
    medium: 'hidden-single',
    hard: 'naked-pair',
  };

  it.each([...DIFFICULTIES])('devuelve %s tableros del nivel pedido', (difficulty) => {
    let seed = 0;
    for (let found = 0; found < PER_DIFFICULTY; found += 1) {
      const generated = generate({ seed, difficulty });

      expect(generated.difficulty).toBe(difficulty);
      expect(hasUniqueSolution(generated.puzzle)).toBe(true);
      // ...y no lo resuelven las técnicas del nivel anterior: si lo hicieran,
      // sería un tablero de ese nivel mal etiquetado.
      const previous = PREVIOUS[difficulty];
      if (previous !== null) {
        expect(isSolved(solveByTechniques(generated.puzzle, previous))).toBe(false);
      }
      seed = generated.seed + 1;
    }
  });

  it('es reproducible: misma semilla y nivel, mismo tablero', () => {
    const first = generate({ seed: 7, difficulty: 'hard' });
    const again = generate({ seed: 7, difficulty: 'hard' });

    expect(toString(again.puzzle)).toBe(toString(first.puzzle));
    expect(again.seed).toBe(first.seed);
  });

  it('sin dificultad pedida devuelve la semilla tal cual, clasificada', () => {
    const generated = generate({ seed: 0 });

    expect(generated.seed).toBe(0);
    expect(generated.difficulty).toBe(classify(generated.puzzle));
  });
});
