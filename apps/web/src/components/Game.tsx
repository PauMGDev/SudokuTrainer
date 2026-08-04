'use client';

import { useCallback, useReducer, type KeyboardEvent } from 'react';
import type { CellIndex } from 'engine';

import { gameReducer, initGame } from '../lib/game';
import { Board } from './Board';

/** Flechas del teclado a desplazamiento de fila/columna. */
const ARROWS: Readonly<Record<string, { drow: number; dcol: number }>> = {
  ArrowUp: { drow: -1, dcol: 0 },
  ArrowDown: { drow: 1, dcol: 0 },
  ArrowLeft: { drow: 0, dcol: -1 },
  ArrowRight: { drow: 0, dcol: 1 },
};

/**
 * Única frontera cliente de la app: todo lo que cuelga de aquí es cliente por
 * herencia y no lleva directiva propia. El tablero llega como los 81 caracteres
 * que produce `toString` en el servidor, no como un `Board` serializado: es el
 * mismo formato de cable que necesitará /api/explain en la fase 5.
 */
export function Game({ puzzle }: { readonly puzzle: string }) {
  const [state, dispatch] = useReducer(gameReducer, puzzle, initGame);

  const handleSelect = useCallback((index: CellIndex) => {
    dispatch({ type: 'select', index });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = ARROWS[event.key];
    if (arrow) {
      // Sin esto las flechas hacen scroll de la página bajo el tablero.
      event.preventDefault();
      dispatch({ type: 'move', ...arrow });
      return;
    }
    // Tab no se intercepta a propósito: es la salida de la rejilla.
  }, []);

  return (
    <Board
      board={state.board}
      selected={state.selected}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
    />
  );
}
