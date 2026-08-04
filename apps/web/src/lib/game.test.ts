/**
 * Tests del estado de la partida. `gameReducer` es puro y no sabe que existe
 * React, así que se prueba llamándolo, sin montar nada ni renderizar.
 *
 * El tablero no se escribe a mano: sale del generador con su solución, que es
 * la única forma de comprobar la victoria sin resolver un sudoku a mano.
 */

import { describe, expect, test } from 'vitest';
import {
  BOARD_SIZE,
  detectNext,
  generate,
  peersOf,
  toString as boardToString,
  type Digit,
} from 'engine';

import { copy } from '../copy';

import {
  findConflicts,
  gameReducer,
  hintMessage,
  initGame,
  isWon,
  keyToAction,
  type GameState,
} from './game';

const KEY = { ctrlKey: false, metaKey: false };

/** Semilla medida: `easy` con la 0 sale a la primera y el test no busca nada. */
const { puzzle, solution } = generate({ seed: 0, difficulty: 'easy' });

function start(): GameState {
  return initGame(boardToString(puzzle));
}

/** Escribe un dígito en una celda concreta, como haría el jugador. */
function play(state: GameState, index: number, digit: Digit | null): GameState {
  const selected = gameReducer(state, { type: 'select', index });
  return gameReducer(selected, { type: 'input', digit });
}

/** Índice de la primera celda vacía del enunciado. */
const FIRST_EMPTY = puzzle.cells.findIndex((cell) => cell.value === null);

describe('partida completa', () => {
  test('rellenar el tablero con la solución la da por ganada', () => {
    let state = start();
    expect(isWon(state.board, findConflicts(state.board))).toBe(false);

    for (let index = 0; index < BOARD_SIZE; index += 1) {
      if (state.board.cells[index].given) continue;
      state = play(state, index, solution.cells[index].value);
    }

    expect(isWon(state.board, findConflicts(state.board))).toBe(true);
  });

  test('un tablero lleno con un dígito mal no está ganado', () => {
    let state = start();
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      if (state.board.cells[index].given) continue;
      const correct = solution.cells[index].value as Digit;
      // Un solo dígito cambiado: el tablero queda lleno pero con conflicto.
      const digit = index === FIRST_EMPTY ? (((correct % 9) + 1) as Digit) : correct;
      state = play(state, index, digit);
    }

    expect(state.board.cells.every((cell) => cell.value !== null)).toBe(true);
    expect(isWon(state.board, findConflicts(state.board))).toBe(false);
  });

  test('no se puede escribir sobre una pista', () => {
    const given = puzzle.cells.findIndex((cell) => cell.given);
    const initial = start();
    const state = play(initial, given, 1);
    expect(state.board).toBe(initial.board);
    expect(state.past).toHaveLength(0);
  });
});

describe('modo notas', () => {
  test('con notas activas el dígito se apunta, no se coloca', () => {
    const notes = gameReducer(start(), { type: 'toggle-notes' });
    const state = play(notes, FIRST_EMPTY, 5);

    expect(state.board.cells[FIRST_EMPTY].value).toBeNull();
    expect([...state.board.cells[FIRST_EMPTY].candidates]).toEqual([5]);
  });

  test('el mismo dígito dos veces quita la nota', () => {
    const notes = gameReducer(start(), { type: 'toggle-notes' });
    const state = play(play(notes, FIRST_EMPTY, 5), FIRST_EMPTY, 5);

    expect(state.board.cells[FIRST_EMPTY].candidates.size).toBe(0);
  });

  test('colocar un valor borra las notas de la celda', () => {
    const notes = gameReducer(start(), { type: 'toggle-notes' });
    const noted = play(notes, FIRST_EMPTY, 5);
    const placed = play(gameReducer(noted, { type: 'toggle-notes' }), FIRST_EMPTY, 7);

    expect(placed.board.cells[FIRST_EMPTY].value).toBe(7);
    expect(placed.board.cells[FIRST_EMPTY].candidates.size).toBe(0);
  });
});

describe('deshacer', () => {
  test('devuelve el tablero anterior sin mover la selección', () => {
    const placed = play(start(), FIRST_EMPTY, 5);
    const undone = gameReducer(placed, { type: 'undo' });

    expect(undone.board.cells[FIRST_EMPTY].value).toBeNull();
    expect(undone.selected).toBe(FIRST_EMPTY);
    expect(undone.past).toHaveLength(0);
  });

  test('deshace también una nota', () => {
    const notes = gameReducer(start(), { type: 'toggle-notes' });
    const undone = gameReducer(play(notes, FIRST_EMPTY, 5), { type: 'undo' });

    expect(undone.board.cells[FIRST_EMPTY].candidates.size).toBe(0);
  });

  test('sin historial no hace nada', () => {
    const state = start();
    expect(gameReducer(state, { type: 'undo' })).toBe(state);
  });
});

describe('pista', () => {
  test('señala celdas vacías del tablero y no revela ningún valor', () => {
    const state = gameReducer(start(), { type: 'hint' });

    expect(state.hint?.kind).toBe('found');
    if (state.hint?.kind !== 'found') return;
    expect(state.hint.cells.length).toBeGreaterThan(0);
    for (const cell of state.hint.cells) {
      expect(state.board.cells[cell].value).toBeNull();
    }
    // El mensaje nombra celdas, nunca dígitos: "Look at R1C3, R5C3."
    expect(hintMessage(state.hint)).toMatch(/^Look at R\dC\d(, R\dC\d)*\.$/);
  });

  test('la técnica detectada es la que el engine da como siguiente', () => {
    const state = gameReducer(start(), { type: 'hint' });
    if (state.hint?.kind !== 'found') throw new Error('se esperaba una detección');

    expect(state.hint.detection).toEqual(detectNext(state.board));
  });

  test('con un conflicto en el tablero no se detecta nada', () => {
    // Un dígito repetido con un peer: los candidatos que vería el detector
    // serían falsos, así que la pista se niega en vez de mentir.
    const clash = peersOf(FIRST_EMPTY).flatMap((cell) => puzzle.cells[cell].value ?? [])[0];
    const state = gameReducer(play(start(), FIRST_EMPTY, clash), { type: 'hint' });

    expect(state.hint).toEqual({ kind: 'conflict' });
    expect(hintMessage(state.hint)).toBe(copy.hint.conflict);
  });

  test('escribir borra la pista, porque el patrón deja de ser cierto', () => {
    const hinted = gameReducer(start(), { type: 'hint' });
    const written = play(hinted, FIRST_EMPTY, 5);

    expect(written.hint).toBeNull();
    expect(gameReducer(written, { type: 'undo' }).hint).toBeNull();
  });

  test('sin pista pedida la línea de estado calla', () => {
    expect(hintMessage(null)).toBeNull();
  });
});

describe('teclado', () => {
  test('Cmd+Z y Ctrl+Z deshacen', () => {
    expect(keyToAction({ key: 'z', ctrlKey: false, metaKey: true })).toEqual({ type: 'undo' });
    expect(keyToAction({ key: 'Z', ctrlKey: true, metaKey: false })).toEqual({ type: 'undo' });
  });

  test('el resto de atajos del navegador no se tocan', () => {
    expect(keyToAction({ key: 'r', ctrlKey: true, metaKey: false })).toBeNull();
    expect(keyToAction({ key: '5', ctrlKey: false, metaKey: true })).toBeNull();
  });

  test('dígitos, borrado, flechas y notas', () => {
    expect(keyToAction({ key: '5', ...KEY })).toEqual({ type: 'input', digit: 5 });
    expect(keyToAction({ key: 'Backspace', ...KEY })).toEqual({ type: 'input', digit: null });
    expect(keyToAction({ key: 'ArrowUp', ...KEY })).toEqual({ type: 'move', drow: -1, dcol: 0 });
    expect(keyToAction({ key: 'N', ...KEY })).toEqual({ type: 'toggle-notes' });
    expect(keyToAction({ key: 'Tab', ...KEY })).toBeNull();
  });
});
