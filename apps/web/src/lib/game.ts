/**
 * Estado de la partida y todo lo que llama al engine.
 *
 * Regla del proyecto: los componentes importan del engine tipos y constantes,
 * nunca funciones. Cualquier llamada al engine vive en este archivo. Así hay un
 * solo sitio donde blindar las funciones que lanzan (`setCellValue` revienta si
 * la celda es una pista) y un solo sitio que revisar para saber qué del engine
 * cruza al bundle del cliente.
 *
 * `gameReducer` es una función pura: no sabe que existe React.
 */

import {
  BOARD_SIZE,
  UNIT_SIZE,
  colOf,
  fromString,
  getCell,
  isDigit,
  peersOf,
  rowOf,
  setCellValue,
  toIndex,
  toRef,
  type Board,
  type CellIndex,
  type CellRef,
  type Digit,
} from 'engine';

/** Refs R#C# de las 81 celdas por índice. Constante: se calcula una vez al cargar. */
export const CELL_REFS: readonly CellRef[] = Array.from({ length: BOARD_SIZE }, (_, index) =>
  toRef(index),
);

export interface GameState {
  readonly board: Board;
  /** `null` hasta que el jugador toca la rejilla por primera vez. */
  readonly selected: CellIndex | null;
}

export type GameAction =
  | { readonly type: 'select'; readonly index: CellIndex }
  | { readonly type: 'move'; readonly drow: number; readonly dcol: number }
  /** `digit: null` borra la celda. */
  | { readonly type: 'input'; readonly digit: Digit | null };

/** Reconstruye el tablero desde los 81 caracteres que envía el servidor. */
export function initGame(puzzle: string): GameState {
  return { board: fromString(puzzle), selected: null };
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), UNIT_SIZE - 1);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'select': {
      if (state.selected === action.index) return state;
      return { ...state, selected: action.index };
    }

    case 'move': {
      // La primera flecha entra en la rejilla por R1C1 en vez de saltar desde ella.
      if (state.selected === null) return { ...state, selected: 0 };
      // Sin envolver en los bordes: envolver desorienta, y mantener una flecha
      // pulsada teletransportaría al extremo contrario del tablero.
      const row = clamp(rowOf(state.selected) + action.drow);
      const col = clamp(colOf(state.selected) + action.dcol);
      return gameReducer(state, { type: 'select', index: toIndex(row, col) });
    }

    case 'input': {
      if (state.selected === null) return state;
      // `setCellValue` lanza sobre una pista, no devuelve error: el guard va
      // aquí, una vez, y no en cada handler que pueda escribir.
      if (getCell(state.board, state.selected).given) return state;
      const board = setCellValue(state.board, state.selected, action.digit);
      // El engine devuelve el mismo board si el valor no cambia. Cortar aquí
      // ahorra un render, y en 3.2 evitará ensuciar el historial de deshacer.
      if (board === state.board) return state;
      return { ...state, board };
    }
  }
}

/**
 * Celdas que repiten valor con alguna de sus 20 compañeras de fila, columna o
 * caja. El engine no exporta validador a propósito (una detección es cierta
 * sobre el tablero tal cual), así que el conflicto es lectura de la UI.
 *
 * Se marcan las dos celdas implicadas, incluida la pista: ver qué pista estás
 * violando es la mitad de la información.
 */
export function findConflicts(board: Board): ReadonlySet<CellIndex> {
  const conflicts = new Set<CellIndex>();
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const { value } = board.cells[index];
    if (value === null) continue;
    if (peersOf(index).some((peer) => board.cells[peer].value === value)) conflicts.add(index);
  }
  return conflicts;
}

const NO_CELLS: ReadonlySet<CellIndex> = new Set();

/**
 * Las 20 compañeras de fila, columna y caja de la celda seleccionada: las que
 * comparten unidad con ella y por tanto no pueden repetir su valor. Es la ayuda
 * visual que sustituye a recorrer la rejilla con el dedo.
 */
export function peerHighlight(selected: CellIndex | null): ReadonlySet<CellIndex> {
  if (selected === null) return NO_CELLS;
  return new Set(peersOf(selected));
}

const ARROWS: Readonly<Record<string, { drow: number; dcol: number }>> = {
  ArrowUp: { drow: -1, dcol: 0 },
  ArrowDown: { drow: 1, dcol: 0 },
  ArrowLeft: { drow: 0, dcol: -1 },
  ArrowRight: { drow: 0, dcol: 1 },
};

const ERASE_KEYS: readonly string[] = ['0', 'Backspace', 'Delete'];

/**
 * Teclado a acción. Devuelve `null` para todo lo que la rejilla no reclama —
 * Tab incluido, que es la salida y no se intercepta jamás.
 */
export function keyToAction(key: string): GameAction | null {
  const arrow = ARROWS[key];
  if (arrow) return { type: 'move', ...arrow };

  const digit = Number(key);
  if (key.length === 1 && isDigit(digit)) return { type: 'input', digit };
  if (ERASE_KEYS.includes(key)) return { type: 'input', digit: null };

  return null;
}
