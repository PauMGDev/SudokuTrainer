/**
 * Contrato de los detectores de técnicas.
 *
 * Un detector mira un tablero y devuelve las ocurrencias de UNA técnica. No
 * decide cuál conviene mostrar ni aplica nada: eso es del registry y de quien
 * llama. Un detector que no sabe de los demás se puede escribir, testear y leer
 * por separado, que es lo que permite ir sumando técnicas de una en una.
 *
 * Una detección separa dos cosas que la UI necesita por separado:
 * - `cells`: el patrón, lo que el hint resalta sin revelar la respuesta (4.1).
 * - `placements` / `eliminations`: la conclusión, lo que el jugador aplica.
 */

import type { Board, Digit } from '../types';
import type { CellRef } from '../notation';
import type { CandidateGrid } from './candidates';

/**
 * Técnicas que el engine sabe nombrar, de la más simple a la más avanzada.
 * El orden del array ES el orden de dificultad: lo usa `detectNext` para dar
 * siempre la pista más sencilla disponible, y lo usará 2.6 para clasificar
 * un tablero por la técnica más avanzada que exige.
 */
export const TECHNIQUES = Object.freeze([
  'naked-single',
  'hidden-single',
  'naked-pair',
  'pointing-pair',
] as const);

export type TechniqueId = (typeof TECHNIQUES)[number];

/** Posición de una técnica en la escala de dificultad. Menor es más fácil. */
export function rankOf(technique: TechniqueId): number {
  return TECHNIQUES.indexOf(technique);
}

/** Un dígito que la técnica demuestra que va en esa celda. */
export interface Placement {
  readonly cell: CellRef;
  readonly digit: Digit;
}

/** Un candidato que la técnica descarta en esa celda. */
export interface Elimination {
  readonly cell: CellRef;
  readonly digit: Digit;
}

/**
 * Una ocurrencia concreta de una técnica sobre un tablero concreto.
 *
 * Se construye siempre con `createDetection`, nunca a mano: la normalización
 * (orden, deduplicación, `patternKey`) es lo que hace comparables las
 * detecciones de detectores distintos.
 */
export interface Detection {
  readonly technique: TechniqueId;
  /** Celdas que forman el patrón, ordenadas. Lo que la UI resalta. */
  readonly cells: readonly CellRef[];
  /** Candidatos implicados en el razonamiento, ascendentes. */
  readonly digits: readonly Digit[];
  readonly placements: readonly Placement[];
  readonly eliminations: readonly Elimination[];
  /**
   * Clave canónica de la detección. Dos detecciones equivalentes la comparten,
   * aunque vengan de tableros distintos: es la clave de caché de la explicación
   * (5.2) y lo que el servidor re-verifica antes de llamar a la API (5.1).
   */
  readonly patternKey: string;
}

export interface Detector {
  readonly technique: TechniqueId;
  /**
   * Todas las ocurrencias de la técnica en el tablero. Vacío si no hay ninguna.
   *
   * `candidates` permite pasar una rejilla ya calculada, y sobre todo una que
   * arrastre eliminaciones anteriores: encadenar técnicas necesita que lo que
   * descartó un naked pair siga descartado cuando mira el siguiente detector.
   * Omitida, se calcula de los valores del tablero.
   */
  find(board: Board, candidates?: CandidateGrid): readonly Detection[];
}
