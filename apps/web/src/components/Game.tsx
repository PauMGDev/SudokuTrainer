'use client';

import { useCallback, useMemo, useReducer, type KeyboardEvent } from 'react';
import type { CellIndex, Digit } from 'engine';

import { copy } from '../copy';
import {
  explanationFor,
  findConflicts,
  gameReducer,
  hintMessage,
  initGame,
  isWon,
  keyToAction,
  peerHighlight,
} from '../lib/game';
import { Board } from './Board';
import { BUTTON } from './button';
import { Explanation } from './Explanation';
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

  const won = isWon(state.board, conflicts);

  const explanation = explanationFor(state.hint);

  const hinted = useMemo(
    () => new Set(state.hint?.kind === 'found' ? state.hint.cells : []),
    [state.hint],
  );

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

  const handleHint = useCallback(() => {
    dispatch({ type: 'hint' });
  }, []);

  const handleExplain = useCallback(() => {
    dispatch({ type: 'explain' });
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
      {/* La región existe siempre, vacía hasta ganar: un contenedor que aparece
          de golpe no lo anuncian todos los lectores de pantalla. */}
      <p
        role="status"
        // `sr-only` y no `hidden`: display:none saca la región del árbol de
        // accesibilidad y entonces el anuncio no llega.
        className={
          won
            ? 'rounded-sm border border-accent bg-accent/10 px-3 py-2 text-center text-sm text-accent'
            : 'sr-only'
        }
      >
        {won ? copy.game.won : ''}
      </p>
      <Board
        board={state.board}
        selected={state.selected}
        peers={peers}
        hinted={hinted}
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
        onHint={handleHint}
        disabled={state.selected === null}
      />
      {/* Una sola línea para lo que la partida tiene que decir: la pista manda
          sobre el aviso inicial, que solo existe mientras no has tocado nada. */}
      <p role="status" className="min-h-5 text-center text-sm text-ink-faint">
        {hintMessage(state.hint) ?? (state.selected === null ? copy.keypad.hint : '')}
      </p>
      {/* Dos pasos, no uno: la pista dice dónde mirar y solo si el jugador
          insiste se le explica por qué. En 5.4 este clic es el que cuesta. */}
      {explanation !== null &&
        (state.explain ? (
          <Explanation explanation={explanation} loading={false} />
        ) : (
          <button type="button" onClick={handleExplain} className={`${BUTTON} text-base`}>
            {copy.explanation.action}
          </button>
        ))}
    </div>
  );
}
