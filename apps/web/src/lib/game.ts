/**
 * Estado de la partida y todo lo que llama al engine.
 *
 * Regla del proyecto: los componentes importan del engine tipos y constantes,
 * nunca funciones. Cualquier llamada al engine vive en este archivo. Así hay un
 * solo sitio donde blindar las funciones que lanzan (`setCellValue` revienta si
 * la celda es una pista) y un solo sitio que revisar para saber qué del engine
 * cruza al bundle del cliente.
 */

import { BOARD_SIZE, fromString, toRef, type Board, type CellRef } from 'engine';

/** Refs R#C# de las 81 celdas por índice. Constante: se calcula una vez al cargar. */
export const CELL_REFS: readonly CellRef[] = Array.from({ length: BOARD_SIZE }, (_, index) =>
  toRef(index),
);

export interface GameState {
  readonly board: Board;
}

/** Reconstruye el tablero desde los 81 caracteres que envía el servidor. */
export function initGame(puzzle: string): GameState {
  return { board: fromString(puzzle) };
}
