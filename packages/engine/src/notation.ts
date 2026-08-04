/**
 * Notación R#C#: R1C1 es la esquina superior izquierda, R9C9 la inferior derecha.
 *
 * Es la única forma de nombrar una celda fuera del engine: API pública, mensajes
 * de UI y prompts del LLM. Los índices planos son un detalle de implementación.
 */

import { BOARD_SIZE, UNIT_SIZE, type CellIndex, type UnitIndex } from './types';

/** Fila o columna tal y como se muestra al jugador: 1-based. */
type DisplayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CellRef = `R${DisplayNumber}C${DisplayNumber}`;

const REF_PATTERN = /^R([1-9])C([1-9])$/;

/** Índice plano de la celda en la fila `row` y la columna `col` (ambas 0-based). */
export function toIndex(row: UnitIndex, col: UnitIndex): CellIndex {
  return row * UNIT_SIZE + col;
}

export function toRef(index: CellIndex): CellRef {
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
    throw new RangeError(`Índice de celda fuera de rango: ${index}`);
  }
  const row = Math.floor(index / UNIT_SIZE) + 1;
  const col = (index % UNIT_SIZE) + 1;
  return `R${row}C${col}` as CellRef;
}

export function isCellRef(value: unknown): value is CellRef {
  return typeof value === 'string' && REF_PATTERN.test(value);
}

/** Índice plano de una referencia R#C#, o `null` si no es una referencia válida. */
export function parseRef(ref: string): CellIndex | null {
  const match = REF_PATTERN.exec(ref);
  if (match === null) return null;
  // El patrón garantiza dos grupos de un dígito 1-9.
  const row = Number(match[1]) - 1;
  const col = Number(match[2]) - 1;
  return toIndex(row, col);
}

/** Como `parseRef`, pero falla en vez de devolver `null`. Para fixtures y tests. */
export function requireRef(ref: string): CellIndex {
  const index = parseRef(ref);
  if (index === null) throw new SyntaxError(`Referencia de celda inválida: ${ref}`);
  return index;
}

/** Referencias ordenadas, para mensajes legibles: "R1C2, R4C2, R7C2". */
export function formatRefs(indices: readonly CellIndex[]): string {
  return indices.map(toRef).join(', ');
}
