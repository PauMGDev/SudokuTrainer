'use client';

import { useCallback, useMemo, useReducer, type KeyboardEvent } from 'react';
import type { CellIndex, Digit } from 'engine';

import { copy } from '../copy';
import { findConflicts, gameReducer, initGame, keyToAction, peerHighlight } from '../lib/game';
import { Board } from './Board';
import { Keypad } from './Keypad';

/**
 * Única frontera cliente de la app: todo lo que cuelga de aquí es cliente por
 * herencia y no lleva directiva propia. El tablero llega como los 81 caracteres
 * que produce `toString` en el servidor, no como un `Board` serializado: es el
 * mismo formato de cable que necesitará /api/explain en la fase 5.
 */
export function Game({ puzzle }: { readonly puzzle: string }) {
  const [state, dispatch] = useReducer(gameReducer, puzzle, initGame);

  // 81 × 20 comparaciones, pero solo cuando cambia el tablero: mover la
  // selección no las repite.
  const conflicts = useMemo(() => findConflicts(state.board), [state.board]);

  const peers = useMemo(() => peerHighlight(state.selected), [state.selected]);

  const handleSelect = useCallback((index: CellIndex) => {
    dispatch({ type: 'select', index });
  }, []);

  const handleInput = useCallback((digit: Digit | null) => {
    dispatch({ type: 'input', digit });
  }, []);

  const handleToggleNotes = useCallback(() => {
    dispatch({ type: 'toggle-notes' });
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const action = keyToAction(event);
    if (action === null) return;
    // Sin esto las flechas hacen scroll de la página bajo el tablero.
    event.preventDefault();
    dispatch(action);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Board
        board={state.board}
        selected={state.selected}
        peers={peers}
        conflicts={conflicts}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
      />
      <Keypad
        onInput={handleInput}
        notes={state.notes}
        onToggleNotes={handleToggleNotes}
        onUndo={handleUndo}
        canUndo={state.past.length > 0}
        disabled={state.selected === null}
      />
      <p aria-hidden={state.selected !== null} className="text-center text-sm text-ink-faint">
        {state.selected === null ? copy.keypad.hint : ' '}
      </p>
    </div>
  );
}
