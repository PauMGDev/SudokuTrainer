/**
 * Tipos base del tablero.
 *
 * Convenciones de todo el engine:
 * - El tablero es un array plano de 81 celdas en orden fila mayor: el índice 0
 *   es R1C1 y el 80 es R9C9.
 * - Los índices internos (fila, columna, caja, celda) son 0-based porque se usan
 *   para aritmética. La notación pública es R#C# y es 1-based (ver `notation.ts`).
 */

/** Valor de una celda resuelta. Nunca 0: una celda vacía tiene `value: null`. */
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Posición de una celda en el array plano: entero de 0 a 80.
 *
 * Es un alias de `number` a propósito, no un tipo marcado: la aritmética de
 * unidades (`index % 9`, `Math.floor(index / 9)`) se lee mejor sin castings.
 * Usa `isCellIndex` en las fronteras donde el valor venga de fuera.
 */
export type CellIndex = number;

/** Índice 0-based de una fila, columna o caja: entero de 0 a 8. */
export type UnitIndex = number;

/** Notas de una celda: los dígitos que el jugador todavía considera posibles. */
export type CandidateSet = ReadonlySet<Digit>;

export interface Cell {
  /** Dígito colocado, o `null` si la celda está vacía. */
  readonly value: Digit | null;
  /** `true` si es una pista del enunciado, y por tanto no editable. */
  readonly given: boolean;
  /** Notas del jugador. Siempre vacío si la celda tiene valor. */
  readonly candidates: CandidateSet;
}

export interface Board {
  /** Exactamente 81 celdas, en orden fila mayor. */
  readonly cells: readonly Cell[];
}

/** Celdas por lado, y por tanto también dígitos y unidades por dimensión. */
export const UNIT_SIZE = 9;

/** Celdas por lado de una caja 3x3. */
export const BOX_SIZE = 3;

/** Número total de celdas del tablero. */
export const BOARD_SIZE = UNIT_SIZE * UNIT_SIZE;

export const DIGITS: readonly Digit[] = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

export function isDigit(value: unknown): value is Digit {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= UNIT_SIZE;
}

export function isCellIndex(value: unknown): value is CellIndex {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < BOARD_SIZE;
}

export function isUnitIndex(value: unknown): value is UnitIndex {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < UNIT_SIZE;
}
