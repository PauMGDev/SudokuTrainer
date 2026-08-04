'use client';

import { useState } from 'react';

import { initGame } from '../lib/game';
import { Board } from './Board';

/**
 * Única frontera cliente de la app: todo lo que cuelga de aquí es cliente por
 * herencia y no lleva directiva propia. El tablero llega como los 81 caracteres
 * que produce `toString` en el servidor, no como un `Board` serializado: es el
 * mismo formato de cable que necesitará /api/explain en la fase 5.
 */
export function Game({ puzzle }: { readonly puzzle: string }) {
  const [state] = useState(() => initGame(puzzle));

  return <Board board={state.board} />;
}
