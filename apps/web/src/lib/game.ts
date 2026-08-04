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
  rowOf,
  toIndex,
  toRef,
  type Board,
  type CellIndex,
  type CellRef,
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
  | { readonly type: 'move'; readonly drow: number; readonly dcol: number };

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
  }
}
