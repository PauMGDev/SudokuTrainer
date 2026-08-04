/**
 * Solver por backtracking.
 *
 * El `Board` inmutable es la frontera: aquí dentro se trabaja con arrays
 * tipados y máscaras de bits, que es lo que hace viable resolver un 17-pistas.
 * Nada de esta representación interna se escapa fuera del módulo.
 *
 * Dos decisiones que hacen el trabajo:
 * - Máscaras por fila, columna y caja: colocar o retirar un dígito son tres
 *   operaciones de bits, sin recorrer los 20 peers de la celda.
 * - MRV (minimum remaining values): se ramifica siempre por la celda vacía con
 *   menos candidatos. Sin esta heurística un 17-pistas explota a millones de nodos.
 *
 * El recorrido es determinista —dígitos en orden ascendente, empates de MRV por
 * índice menor—, así que el mismo tablero devuelve siempre la misma solución.
 */

import {
  BOARD_SIZE,
  UNIT_SIZE,
  type Board,
  type Cell,
  type Digit,
} from './types';
import { boxOf, colOf, rowOf } from './units';

/** Bit `d - 1` encendido = el dígito `d` ya está usado. */
type DigitMask = number;

const ALL_DIGITS_MASK = 0b1_1111_1111;

const EMPTY = 0;

interface SolverState {
  /** Valor de cada celda, o `EMPTY`. Índices planos, como en `Board`. */
  readonly values: Uint8Array;
  readonly rows: Uint16Array;
  readonly cols: Uint16Array;
  readonly boxes: Uint16Array;
}

function bit(digit: number): DigitMask {
  return 1 << (digit - 1);
}

/**
 * Vuelca el tablero a la representación interna.
 * Devuelve `null` si el enunciado ya se contradice a sí mismo (un dígito repetido
 * en una fila, columna o caja): ese tablero no tiene ninguna solución.
 */
function toState(board: Board): SolverState | null {
  const state: SolverState = {
    values: new Uint8Array(BOARD_SIZE),
    rows: new Uint16Array(UNIT_SIZE),
    cols: new Uint16Array(UNIT_SIZE),
    boxes: new Uint16Array(UNIT_SIZE),
  };

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const value = board.cells[index].value;
    if (value === null) continue;

    const mask = bit(value);
    const row = rowOf(index);
    const col = colOf(index);
    const box = boxOf(index);
    if ((state.rows[row] & mask) !== 0) return null;
    if ((state.cols[col] & mask) !== 0) return null;
    if ((state.boxes[box] & mask) !== 0) return null;

    state.values[index] = value;
    state.rows[row] |= mask;
    state.cols[col] |= mask;
    state.boxes[box] |= mask;
  }

  return state;
}

/** Los dígitos que la celda todavía admite, como máscara de bits. */
function candidateMask(state: SolverState, index: number): DigitMask {
  const used = state.rows[rowOf(index)] | state.cols[colOf(index)] | state.boxes[boxOf(index)];
  return ALL_DIGITS_MASK & ~used;
}

function place(state: SolverState, index: number, digit: number): void {
  const mask = bit(digit);
  state.values[index] = digit;
  state.rows[rowOf(index)] |= mask;
  state.cols[colOf(index)] |= mask;
  state.boxes[boxOf(index)] |= mask;
}

function undo(state: SolverState, index: number, digit: number): void {
  const mask = bit(digit);
  state.values[index] = EMPTY;
  state.rows[rowOf(index)] &= ~mask;
  state.cols[colOf(index)] &= ~mask;
  state.boxes[boxOf(index)] &= ~mask;
}

/**
 * La celda vacía con menos candidatos, o -1 si no queda ninguna vacía.
 * Si alguna celda vacía se ha quedado sin candidatos, la devuelve igualmente:
 * quien ramifique encontrará cero opciones y retrocederá de inmediato.
 */
function selectCell(state: SolverState): number {
  let best = -1;
  let bestCount = UNIT_SIZE + 1;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    if (state.values[index] !== EMPTY) continue;
    const count = popCount(candidateMask(state, index));
    if (count < bestCount) {
      if (count === 0) return index;
      bestCount = count;
      best = index;
    }
  }

  return best;
}

function popCount(mask: DigitMask): number {
  let count = 0;
  for (let remaining = mask; remaining !== 0; remaining &= remaining - 1) count += 1;
  return count;
}

/**
 * Explora el árbol de soluciones y devuelve cuántas ha encontrado, parando en
 * `limit`. Con `limit = 1` es "resuelve"; con `limit = 2`, "¿es única?".
 * Al alcanzar el tope, `state.values` conserva la última solución hallada.
 */
function search(state: SolverState, limit: number, found: number): number {
  const index = selectCell(state);
  if (index === -1) return found + 1;

  let total = found;
  const candidates = candidateMask(state, index);
  for (let digit = 1; digit <= UNIT_SIZE; digit += 1) {
    if ((candidates & bit(digit)) === 0) continue;

    place(state, index, digit);
    total = search(state, limit, total);
    if (total >= limit) return total;
    undo(state, index, digit);
  }

  return total;
}

function toBoard(board: Board, state: SolverState): Board {
  const cells = board.cells.map((cell, index): Cell => {
    if (cell.value !== null) return cell;
    return Object.freeze({
      value: state.values[index] as Digit,
      given: false,
      candidates: cell.candidates,
    });
  });
  return Object.freeze({ cells: Object.freeze(cells) });
}

/**
 * La primera solución del tablero, o `null` si no tiene ninguna.
 * Las celdas que rellena el solver quedan como no-pistas; las pistas del
 * enunciado se conservan tal cual. No muta el tablero recibido.
 */
export function solve(board: Board): Board | null {
  const state = toState(board);
  if (state === null) return null;
  if (search(state, 1, 0) === 0) return null;
  return toBoard(board, state);
}

/**
 * Cuántas soluciones tiene el tablero, contando como mucho hasta `limit`.
 * El tope existe porque contarlas todas sobre un tablero casi vacío no termina
 * en tiempo humano, y para decidir unicidad basta con saber si hay más de una.
 */
export function countSolutions(board: Board, limit = 2): number {
  if (limit < 1) throw new RangeError(`El tope de soluciones debe ser al menos 1: ${limit}`);
  const state = toState(board);
  if (state === null) return 0;
  return search(state, limit, 0);
}

/** `true` si el tablero tiene exactamente una solución. Es lo que exige un sudoku. */
export function hasUniqueSolution(board: Board): boolean {
  return countSolutions(board, 2) === 1;
}
