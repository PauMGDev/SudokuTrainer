/**
 * Construcción y actualización de tableros.
 *
 * Los tableros son inmutables: cada operación devuelve uno nuevo y comparte las
 * celdas no tocadas. Copiar un array de 81 punteros es barato, y así el historial
 * de deshacer de la web y el cacheado de detecciones salen gratis. El solver de
 * la fase 2 usará internamente su propia estructura mutable si necesita más.
 */

import {
  BOARD_SIZE,
  DIGITS,
  isDigit,
  type Board,
  type CandidateSet,
  type Cell,
  type CellIndex,
  type Digit,
} from './types';
import { toRef } from './notation';
import { peersOf } from './units';

/** Caracteres admitidos para una celda vacía al leer un tablero de texto. */
const EMPTY_CHARS = new Set(['.', '0', '-']);

const NO_CANDIDATES: CandidateSet = Object.freeze(new Set<Digit>());

const EMPTY_CELL: Cell = Object.freeze({
  value: null,
  given: false,
  candidates: NO_CANDIDATES,
});

export function emptyBoard(): Board {
  return Object.freeze({ cells: Object.freeze(Array.from({ length: BOARD_SIZE }, () => EMPTY_CELL)) });
}

export function getCell(board: Board, index: CellIndex): Cell {
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
    throw new RangeError(`Índice de celda fuera de rango: ${index}`);
  }
  return board.cells[index];
}

function replaceCell(board: Board, index: CellIndex, cell: Cell): Board {
  const cells = [...board.cells];
  cells[index] = Object.freeze(cell);
  return Object.freeze({ cells: Object.freeze(cells) });
}

/**
 * Coloca (o borra, con `null`) el valor de una celda.
 * Al colocar un valor se limpian las notas de la celda: ya no son relevantes.
 * Lanza si la celda es una pista del enunciado.
 */
export function setCellValue(board: Board, index: CellIndex, value: Digit | null): Board {
  const cell = getCell(board, index);
  if (cell.given) throw new Error(`${toRef(index)} es una pista y no se puede modificar`);
  if (cell.value === value) return board;
  return replaceCell(board, index, {
    value,
    given: false,
    candidates: value === null ? cell.candidates : NO_CANDIDATES,
  });
}

/** Reemplaza las notas de una celda. Una celda con valor no admite notas. */
export function setCandidates(board: Board, index: CellIndex, candidates: Iterable<Digit>): Board {
  const cell = getCell(board, index);
  if (cell.given || cell.value !== null) {
    throw new Error(`${toRef(index)} tiene valor: no admite notas`);
  }
  return replaceCell(board, index, {
    ...cell,
    candidates: Object.freeze(new Set(candidates)),
  });
}

/** Añade la nota si falta, la quita si está. */
export function toggleCandidate(board: Board, index: CellIndex, digit: Digit): Board {
  const cell = getCell(board, index);
  const next = new Set(cell.candidates);
  if (!next.delete(digit)) next.add(digit);
  return setCandidates(board, index, next);
}

/**
 * Los candidatos que la celda admite según las reglas del sudoku, ignorando las
 * notas del jugador. Es la base de los detectores de la fase 2.
 */
export function candidatesFor(board: Board, index: CellIndex): CandidateSet {
  if (getCell(board, index).value !== null) return NO_CANDIDATES;
  const taken = new Set<Digit>();
  for (const peer of peersOf(index)) {
    const value = board.cells[peer].value;
    if (value !== null) taken.add(value);
  }
  return Object.freeze(new Set(DIGITS.filter((digit) => !taken.has(digit))));
}

export function isSolved(board: Board): boolean {
  return board.cells.every((cell) => cell.value !== null);
}

/**
 * Lee un tablero de una cadena de 81 caracteres en orden fila mayor, donde
 * `.`, `0` o `-` son celdas vacías. Se ignoran los espacios y saltos de línea,
 * así que un fixture puede escribirse en 9 líneas de 9 caracteres.
 * Las celdas rellenas se marcan como pistas del enunciado.
 */
export function fromString(puzzle: string): Board {
  const chars = [...puzzle.replace(/\s/g, '')];
  if (chars.length !== BOARD_SIZE) {
    throw new SyntaxError(`Un tablero necesita ${BOARD_SIZE} caracteres, recibidos ${chars.length}`);
  }
  const cells = chars.map((char, index): Cell => {
    if (EMPTY_CHARS.has(char)) return EMPTY_CELL;
    const value = Number(char);
    if (!isDigit(value)) {
      throw new SyntaxError(`Carácter inválido "${char}" en ${toRef(index)}`);
    }
    return Object.freeze({ value, given: true, candidates: NO_CANDIDATES });
  });
  return Object.freeze({ cells: Object.freeze(cells) });
}

/** Serializa el tablero a 81 caracteres, con `.` para las celdas vacías. */
export function toString(board: Board): string {
  return board.cells.map((cell) => cell.value ?? '.').join('');
}

/** Serializa en 9 líneas de 9 caracteres. Para mensajes de test legibles. */
export function toGrid(board: Board): string {
  return (toString(board).match(/.{9}/g) ?? []).join('\n');
}
