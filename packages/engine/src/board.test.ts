import { describe, expect, it } from 'vitest';

import { BOARD_SIZE } from './types';
import { requireRef } from './notation';
import {
  candidatesFor,
  emptyBoard,
  fromString,
  getCell,
  isSolved,
  setCandidates,
  setCellValue,
  toGrid,
  toString,
  toggleCandidate,
} from './board';

/** Sudoku clásico de referencia, escrito en 9 líneas para poder leerlo. */
const PUZZLE = `
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`;

describe('board', () => {
  it('crea un tablero vacío de 81 celdas', () => {
    const board = emptyBoard();
    expect(board.cells).toHaveLength(BOARD_SIZE);
    expect(toString(board)).toBe('.'.repeat(BOARD_SIZE));
    expect(isSolved(board)).toBe(false);
  });

  it('lee un tablero de texto ignorando espacios y saltos de línea', () => {
    const board = fromString(PUZZLE);
    expect(getCell(board, requireRef('R1C1')).value).toBe(5);
    expect(getCell(board, requireRef('R9C9')).value).toBe(9);
    expect(getCell(board, requireRef('R1C3')).value).toBeNull();
  });

  it('marca como pistas las celdas rellenas del enunciado', () => {
    const board = fromString(PUZZLE);
    expect(getCell(board, requireRef('R1C1')).given).toBe(true);
    expect(getCell(board, requireRef('R1C3')).given).toBe(false);
  });

  it('hace ida y vuelta entre texto y tablero', () => {
    const board = fromString(PUZZLE);
    expect(toGrid(board)).toBe(PUZZLE.trim().replace(/[ \t]/g, ''));
    expect(toString(board)).toHaveLength(BOARD_SIZE);
  });

  it('acepta 0 y - como celda vacía', () => {
    expect(toString(fromString('0'.repeat(BOARD_SIZE)))).toBe('.'.repeat(BOARD_SIZE));
    expect(toString(fromString('-'.repeat(BOARD_SIZE)))).toBe('.'.repeat(BOARD_SIZE));
  });

  it('rechaza cadenas de longitud incorrecta o con caracteres inválidos', () => {
    expect(() => fromString('.'.repeat(80))).toThrow(SyntaxError);
    expect(() => fromString('.'.repeat(82))).toThrow(SyntaxError);
    expect(() => fromString('x' + '.'.repeat(80))).toThrow(/R1C1/);
  });

  it('coloca y borra valores sin mutar el tablero original', () => {
    const board = fromString(PUZZLE);
    const r1c3 = requireRef('R1C3');
    const placed = setCellValue(board, r1c3, 4);

    expect(getCell(placed, r1c3).value).toBe(4);
    expect(getCell(board, r1c3).value).toBeNull();
    expect(getCell(setCellValue(placed, r1c3, null), r1c3).value).toBeNull();
  });

  it('no deja modificar una pista del enunciado', () => {
    const board = fromString(PUZZLE);
    expect(() => setCellValue(board, requireRef('R1C1'), 4)).toThrow(/R1C1/);
  });

  it('limpia las notas al colocar un valor', () => {
    const board = fromString(PUZZLE);
    const r1c3 = requireRef('R1C3');
    const noted = setCandidates(board, r1c3, [1, 2, 4]);

    expect([...getCell(noted, r1c3).candidates]).toEqual([1, 2, 4]);
    expect(getCell(setCellValue(noted, r1c3, 4), r1c3).candidates.size).toBe(0);
  });

  it('alterna una nota: la añade si falta y la quita si está', () => {
    const board = fromString(PUZZLE);
    const r1c3 = requireRef('R1C3');
    const added = toggleCandidate(board, r1c3, 7);

    expect(getCell(added, r1c3).candidates.has(7)).toBe(true);
    expect(getCell(toggleCandidate(added, r1c3, 7), r1c3).candidates.has(7)).toBe(false);
  });

  it('no admite notas en una celda con valor', () => {
    const board = fromString(PUZZLE);
    expect(() => setCandidates(board, requireRef('R1C1'), [3])).toThrow(/R1C1/);
  });

  it('calcula los candidatos legales descartando los de sus peers', () => {
    const board = fromString(PUZZLE);
    // R1C3 comparte fila con 5,3,7; caja con 6,9,8; y columna con 8.
    expect([...candidatesFor(board, requireRef('R1C3'))]).toEqual([1, 2, 4]);
  });

  it('no da candidatos para una celda que ya tiene valor', () => {
    const board = fromString(PUZZLE);
    expect(candidatesFor(board, requireRef('R1C1')).size).toBe(0);
  });

  it('detecta un tablero completo', () => {
    // La solución del PUZZLE de arriba.
    const solved = fromString(`
      534678912
      672195348
      198342567
      859761423
      426853791
      713924856
      961537284
      287419635
      345286179
    `);
    expect(isSolved(solved)).toBe(true);
    expect(isSolved(fromString(PUZZLE))).toBe(false);
  });

  it('rechaza índices fuera del tablero', () => {
    expect(() => getCell(emptyBoard(), -1)).toThrow(RangeError);
    expect(() => getCell(emptyBoard(), BOARD_SIZE)).toThrow(RangeError);
  });
});
