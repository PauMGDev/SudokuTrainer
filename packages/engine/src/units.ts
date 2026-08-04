/**
 * Unidades del tablero: las 9 filas, 9 columnas y 9 cajas.
 *
 * Todo se precalcula una vez al cargar el módulo. Los detectores de la fase 2
 * recorren estas tablas en bucles calientes: no deben recalcular nada por llamada.
 */

import {
  BOARD_SIZE,
  BOX_SIZE,
  UNIT_SIZE,
  type CellIndex,
  type UnitIndex,
} from './types';

export type UnitKind = 'row' | 'column' | 'box';

export interface Unit {
  readonly kind: UnitKind;
  /** Índice 0-based de la unidad dentro de su tipo. */
  readonly index: UnitIndex;
  /** Las 9 celdas de la unidad, en orden ascendente de índice. */
  readonly cells: readonly CellIndex[];
}

export function rowOf(index: CellIndex): UnitIndex {
  return Math.floor(index / UNIT_SIZE);
}

export function colOf(index: CellIndex): UnitIndex {
  return index % UNIT_SIZE;
}

/** Cajas numeradas de izquierda a derecha y de arriba abajo: la 0 contiene R1C1. */
export function boxOf(index: CellIndex): UnitIndex {
  const bandRow = Math.floor(rowOf(index) / BOX_SIZE);
  const bandCol = Math.floor(colOf(index) / BOX_SIZE);
  return bandRow * BOX_SIZE + bandCol;
}

function buildUnits(kind: UnitKind, belongsTo: (index: CellIndex) => UnitIndex): readonly Unit[] {
  const cells: CellIndex[][] = Array.from({ length: UNIT_SIZE }, () => []);
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    cells[belongsTo(index)].push(index);
  }
  return Object.freeze(
    cells.map((unitCells, index) =>
      Object.freeze({ kind, index, cells: Object.freeze(unitCells) }),
    ),
  );
}

export const ROWS: readonly Unit[] = buildUnits('row', rowOf);
export const COLUMNS: readonly Unit[] = buildUnits('column', colOf);
export const BOXES: readonly Unit[] = buildUnits('box', boxOf);

/** Las 27 unidades del tablero: primero filas, luego columnas, luego cajas. */
export const ALL_UNITS: readonly Unit[] = Object.freeze([...ROWS, ...COLUMNS, ...BOXES]);

const UNITS_BY_CELL: readonly (readonly Unit[])[] = Object.freeze(
  Array.from({ length: BOARD_SIZE }, (_unused, index) =>
    Object.freeze([ROWS[rowOf(index)], COLUMNS[colOf(index)], BOXES[boxOf(index)]]),
  ),
);

const PEERS_BY_CELL: readonly (readonly CellIndex[])[] = Object.freeze(
  Array.from({ length: BOARD_SIZE }, (_unused, index) => {
    const peers = new Set<CellIndex>();
    for (const unit of UNITS_BY_CELL[index]) {
      for (const cell of unit.cells) {
        if (cell !== index) peers.add(cell);
      }
    }
    return Object.freeze([...peers].sort((a, b) => a - b));
  }),
);

function assertCellIndex(index: CellIndex): void {
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
    throw new RangeError(`Índice de celda fuera de rango: ${index}`);
  }
}

/** Las tres unidades a las que pertenece una celda: su fila, su columna y su caja. */
export function unitsOf(index: CellIndex): readonly Unit[] {
  assertCellIndex(index);
  return UNITS_BY_CELL[index];
}

/**
 * Las 20 celdas que comparten fila, columna o caja con esta, excluida ella misma.
 * Son las celdas de las que una colocación elimina el candidato.
 */
export function peersOf(index: CellIndex): readonly CellIndex[] {
  assertCellIndex(index);
  return PEERS_BY_CELL[index];
}

/** `true` si las dos celdas comparten alguna unidad. Celdas iguales no son peers. */
export function arePeers(a: CellIndex, b: CellIndex): boolean {
  return a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));
}
