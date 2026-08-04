/**
 * Registro de detectores y elección de la siguiente pista.
 *
 * Cada técnica es un fichero con su detector y su test; aquí solo se dan de
 * alta. Sumar una técnica nueva no obliga a tocar nada más de este módulo.
 *
 * `detectNext` da siempre la técnica más simple disponible, no la primera que
 * aparezca: enseñar un pointing pair cuando había un naked single a la vista
 * sería un mal profesor.
 */

import type { Board } from '../types';
import { candidateGrid, type CandidateGrid } from './candidates';
import { hiddenSingleDetector } from './hidden-single';
import { nakedPairDetector } from './naked-pair';
import { nakedSingleDetector } from './naked-single';
import { pointingPairDetector } from './pointing-pair';
import type { Detection, Detector } from './types';
import { rankOf } from './types';

/** Detectores activos, en orden de dificultad. */
export const DETECTORS: readonly Detector[] = Object.freeze([
  nakedSingleDetector,
  hiddenSingleDetector,
  nakedPairDetector,
  pointingPairDetector,
]);

function byDifficulty(detectors: readonly Detector[]): Detector[] {
  return [...detectors].sort((a, b) => rankOf(a.technique) - rankOf(b.technique));
}

/**
 * La detección más simple que hay en el tablero, o `null` si ninguna técnica
 * conocida encuentra nada. Para el motor del botón Hint (4.1).
 */
export function detectNext(
  board: Board,
  detectors: readonly Detector[] = DETECTORS,
  candidates: CandidateGrid = candidateGrid(board),
): Detection | null {
  for (const detector of byDifficulty(detectors)) {
    const found = detector.find(board, candidates);
    if (found.length > 0) return found[0];
  }
  return null;
}

/**
 * Todas las detecciones de todas las técnicas, de la más simple a la más
 * avanzada. Para 2.6, que necesita saber qué exige un tablero, no solo qué
 * mostrar a continuación.
 */
export function detectAll(
  board: Board,
  detectors: readonly Detector[] = DETECTORS,
  candidates: CandidateGrid = candidateGrid(board),
): readonly Detection[] {
  return byDifficulty(detectors).flatMap((detector) => detector.find(board, candidates));
}
