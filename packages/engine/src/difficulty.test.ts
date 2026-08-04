import { describe, expect, it } from 'vitest';
import { fromString, isSolved, toString } from './board';
import { classify, solveByTechniques, DIFFICULTIES } from './difficulty';
import { CLASSIC, CLASSIC_SOLUTION, EMPTY } from './fixtures/puzzles';
import { generate } from './generator';
import { TECHNIQUES } from './detectors/types';

/**
 * Semillas medidas con `classify` sobre las 100 primeras: de cada nivel hay de
 * sobra, pero encontrarlas cuesta generar, y un test no debe pagar eso cada vez.
 * El primer test comprueba que siguen siendo del nivel que dicen; si el
 * generador cambia, salta ahí y no en media suite.
 */
const SEEDS = Object.freeze({
  easy: [4, 5, 7],
  medium: [14, 63, 88],
  hard: [0, 24, 31],
});

describe('classify', () => {
  it('cada semilla conocida cae en su nivel', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS[difficulty]) {
        expect(classify(generate({ seed }).puzzle), `semilla ${seed}`).toBe(difficulty);
      }
    }
  });

  it('un tablero de un nivel no se resuelve con las técnicas del anterior', () => {
    for (const seed of SEEDS.medium) {
      expect(isSolved(solveByTechniques(generate({ seed }).puzzle, 'hidden-single'))).toBe(false);
    }
    for (const seed of SEEDS.hard) {
      expect(isSolved(solveByTechniques(generate({ seed }).puzzle, 'naked-pair'))).toBe(false);
    }
  });

  it('CLASSIC es fácil: se resuelve solo con singles', () => {
    expect(classify(fromString(CLASSIC))).toBe('easy');
  });

  it('devuelve null cuando ninguna técnica conocida basta', () => {
    expect(classify(fromString(EMPTY))).toBeNull();
  });

  it('un tablero ya resuelto es del nivel más fácil', () => {
    expect(classify(fromString(CLASSIC_SOLUTION))).toBe('easy');
  });
});

describe('solveByTechniques', () => {
  it('resuelve CLASSIC y coincide con su solución', () => {
    const solved = solveByTechniques(fromString(CLASSIC), 'naked-single');

    expect(isSolved(solved)).toBe(true);
    expect(toString(solved)).toBe(toString(fromString(CLASSIC_SOLUTION)));
  });

  it('se detiene sin inventar nada cuando se queda sin técnicas', () => {
    const { puzzle, solution } = generate({ seed: SEEDS.hard[0] });
    const stuck = solveByTechniques(puzzle, 'hidden-single');

    expect(isSolved(stuck)).toBe(false);
    // Lo que colocó es correcto: atascarse es legítimo, equivocarse no.
    for (const [cell, value] of [...toString(stuck)].entries()) {
      if (value !== '.') expect(value).toBe(String(solution.cells[cell].value));
    }
  });

  it('nunca coloca de más al subir de nivel: solo llega más lejos', () => {
    const { puzzle } = generate({ seed: SEEDS.hard[0] });
    const placed = (technique: (typeof TECHNIQUES)[number]) =>
      [...toString(solveByTechniques(puzzle, technique))].filter((char) => char !== '.').length;

    expect(placed('naked-single')).toBeLessThanOrEqual(placed('naked-pair'));
    expect(placed('naked-pair')).toBeLessThanOrEqual(placed('pointing-pair'));
  });
});
