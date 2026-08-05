/**
 * Material pedagógico de una detección.
 *
 * Una `Detection` dice QUÉ pasa (patrón y conclusión); esta capa dice POR QUÉ,
 * con todo lo que hace falta para redactar la explicación sin volver a mirar el
 * tablero. El LLM recibe datos, no razona: si el argumento no está aquí, no
 * está. Por eso se listan cosas que parecen redundantes —los dígitos que ya
 * ocupan la fila y la columna, la celda concreta que bloquea cada hueco—:
 * son las frases que el profesor tiene que poder decir.
 *
 * Todo lo que sale de aquí es o R#C# (celdas) o `UnitRef` (unidades), 1-based.
 * Función pura: mismo tablero y misma detección, mismo resultado.
 */

import { getCell } from './board';
import type { Detection, Placement } from './detectors/types';
import { requireRef, toRef, type CellRef } from './notation';
import type { Board, CellIndex, Digit } from './types';
import {
  ALL_UNITS,
  BOXES,
  COLUMNS,
  ROWS,
  boxOf,
  colOf,
  peersOf,
  rowOf,
  type Unit,
  type UnitKind,
} from './units';

/**
 * Una unidad como la nombra el jugador: "la fila 4", "la caja 6".
 * No es una celda, así que no cabe en R#C#; `index` es 1-based por lo mismo que
 * lo es R#C#: es lo que se lee en voz alta.
 */
export interface UnitRef {
  readonly kind: UnitKind;
  /** 1-9. Las cajas van de izquierda a derecha y de arriba abajo: la 1 tiene R1C1. */
  readonly index: number;
}

/**
 * Por qué un dígito no puede ir en una celda de la unidad.
 *
 * Son dos casos y no uno porque el argumento que se escribe es distinto: en
 * `occupied` la celda ya está ocupada por otro dígito y no hay nada más que
 * decir; en `peer` la celda está vacía y el motivo está FUERA de ella, en un
 * peer que ya lleva el dígito buscado. Aplanarlos a un solo caso obligaría al
 * LLM a adivinar cuál de las dos frases toca.
 */
export type Blocker =
  /** La celda ya tiene otro dígito: `digit` es ese otro dígito. */
  | { readonly reason: 'occupied'; readonly digit: Digit }
  /**
   * La celda está vacía, pero `at` ya lleva `digit`, el dígito buscado.
   * `via` es la unidad que las relaciona: sin ella el redactor sabe QUÉ celda
   * bloquea pero no POR QUÉ vía, y se inventa la geometría. `occupied` no la
   * lleva porque ahí no hay dos celdas que relacionar.
   */
  | {
      readonly reason: 'peer';
      readonly digit: Digit;
      readonly at: CellRef;
      readonly via: UnitRef;
    };

export interface BlockedCell {
  readonly cell: CellRef;
  readonly blockedBy: Blocker;
}

/** Los candidatos que la técnica descarta en una celda, ascendentes. */
export interface CellEliminations {
  readonly cell: CellRef;
  readonly digits: readonly Digit[];
}

export interface NakedSingleExplain {
  readonly technique: 'naked-single';
  readonly cell: CellRef;
  readonly place: Digit;
  /**
   * Los dígitos ya colocados en cada unidad de la celda, ascendentes. Un dígito
   * presente en dos unidades aparece en las dos: la redundancia es deliberada,
   * es el mismo argumento visto desde dos ángulos y el jugador agradece oír los dos.
   */
  readonly eliminatedBy: {
    readonly row: readonly Digit[];
    readonly col: readonly Digit[];
    readonly box: readonly Digit[];
  };
}

export interface HiddenSingleExplain {
  readonly technique: 'hidden-single';
  readonly digit: Digit;
  readonly unit: UnitRef;
  readonly cell: CellRef;
  /** Las otras 8 celdas de la unidad, cada una con su motivo de descarte. */
  readonly blockedCells: readonly BlockedCell[];
}

export interface NakedPairExplain {
  readonly technique: 'naked-pair';
  readonly pair: readonly [Digit, Digit];
  readonly cells: readonly CellRef[];
  readonly unit: UnitRef;
  readonly eliminations: readonly CellEliminations[];
}

export interface PointingPairExplain {
  readonly technique: 'pointing-pair';
  readonly digit: Digit;
  readonly box: UnitRef;
  readonly patternCells: readonly CellRef[];
  /** La fila o columna que comparten las celdas del patrón. */
  readonly line: UnitRef;
  readonly eliminations: readonly CellEliminations[];
}

export type ExplainData =
  | NakedSingleExplain
  | HiddenSingleExplain
  | NakedPairExplain
  | PointingPairExplain;

function toUnitRef(unit: Unit): UnitRef {
  return { kind: unit.kind, index: unit.index + 1 };
}

function toIndices(cells: readonly CellRef[]): CellIndex[] {
  return cells.map(requireRef);
}

/** Los dígitos ya colocados en la unidad, ascendentes. */
function placedIn(board: Board, unit: Unit): Digit[] {
  const digits: Digit[] = [];
  for (const cell of unit.cells) {
    const value = getCell(board, cell).value;
    if (value !== null) digits.push(value);
  }
  return digits.sort((a, b) => a - b);
}

/** Agrupa las eliminaciones por celda, conservando el orden ya normalizado. */
function groupEliminations(detection: Detection): CellEliminations[] {
  const byCell = new Map<CellRef, Digit[]>();
  for (const elimination of detection.eliminations) {
    byCell.set(elimination.cell, [...(byCell.get(elimination.cell) ?? []), elimination.digit]);
  }
  return [...byCell].map(([cell, digits]) => ({ cell, digits }));
}

function requirePlacement(detection: Detection): Placement {
  if (detection.placements.length === 0) {
    throw new Error(`Detección de ${detection.technique} sin colocación: no hay nada que explicar`);
  }
  return detection.placements[0];
}

/** La primera unidad que contiene todas las celdas, en orden fila → columna → caja. */
function unitContaining(cells: readonly CellIndex[]): Unit | undefined {
  return ALL_UNITS.find((unit) => cells.every((cell) => unit.cells.includes(cell)));
}

function explainNakedSingle(board: Board, detection: Detection): NakedSingleExplain {
  const { cell, digit } = requirePlacement(detection);
  const index = toIndices([cell])[0];
  const eliminatedBy = {
    row: placedIn(board, ROWS[rowOf(index)]),
    col: placedIn(board, COLUMNS[colOf(index)]),
    box: placedIn(board, BOXES[boxOf(index)]),
  };

  // El contrato de la técnica: entre las tres unidades tienen que estar los ocho
  // dígitos que no son la colocación, ni uno menos ni el propio dígito. Si no
  // cuadra es un bug del detector, y más vale que reviente aquí que llegar mudo
  // al prompt y que el LLM rellene el hueco inventando.
  const seen = new Set([...eliminatedBy.row, ...eliminatedBy.col, ...eliminatedBy.box]);
  if (seen.size !== 8 || seen.has(digit)) {
    throw new Error(
      `Naked single incoherente en ${cell}: ${digit} no queda demostrado por ` +
        `los dígitos ya colocados (${[...seen].sort((a, b) => a - b).join(',')})`,
    );
  }

  return Object.freeze({ technique: 'naked-single', cell, place: digit, eliminatedBy });
}

/**
 * La unidad por la que dos celdas se ven.
 *
 * Pueden compartir dos: las de la misma banda comparten línea Y caja. Gana la
 * línea porque es la relación más específica y la que se narra sola ("está en
 * la misma columna"); la caja es el argumento de repuesto. Elegir es del
 * engine: si sale ambiguo de aquí, el que redacta acaba inventándose cuál era.
 */
function sharedUnit(a: CellIndex, b: CellIndex): Unit {
  if (rowOf(a) === rowOf(b)) return ROWS[rowOf(a)];
  if (colOf(a) === colOf(b)) return COLUMNS[colOf(a)];
  if (boxOf(a) === boxOf(b)) return BOXES[boxOf(a)];
  throw new Error(`${toRef(a)} y ${toRef(b)} no comparten fila, columna ni caja`);
}

/** Por qué el dígito no cabe en esta celda de la unidad. */
function blockerFor(board: Board, index: CellIndex, digit: Digit): Blocker {
  const value = getCell(board, index).value;
  if (value !== null) return { reason: 'occupied', digit: value };
  // `peersOf` viene ascendente, así que ante varios bloqueos gana el de menor
  // índice: la explicación tiene que ser la misma en cada llamada.
  const at = peersOf(index).find((peer) => getCell(board, peer).value === digit);
  if (at === undefined) {
    throw new Error(`Hidden single incoherente: ${digit} sí cabe en ${toRef(index)}`);
  }
  return { reason: 'peer', digit, at: toRef(at), via: toUnitRef(sharedUnit(index, at)) };
}

function explainHiddenSingle(board: Board, detection: Detection): HiddenSingleExplain {
  const { cell, digit } = requirePlacement(detection);
  // El patrón de un hidden single son las 9 celdas de su unidad, así que la
  // unidad se identifica exacta en vez de deducirse.
  const unit = unitContaining(toIndices(detection.cells));
  if (unit === undefined) {
    throw new Error(`Hidden single sin unidad: ${detection.cells.join(', ')} no forman una unidad`);
  }

  const blockedCells = unit.cells
    .filter((index) => toRef(index) !== cell)
    .map((index) => ({ cell: toRef(index), blockedBy: blockerFor(board, index, digit) }));

  return Object.freeze({ technique: 'hidden-single', digit, unit: toUnitRef(unit), cell, blockedCells });
}

function explainNakedPair(detection: Detection): NakedPairExplain {
  const eliminations = groupEliminations(detection);
  const [first, second] = detection.digits;

  // La unidad no viaja en la detección: es la que contiene el par Y todo lo que
  // el par elimina. Si encajan varias —dos celdas que comparten fila y caja—, la
  // ambigüedad es sobredeterminación pedagógica, no un error: el mismo argumento
  // vale en las dos, y se elige la primera por orden fila → columna → caja.
  const unit = unitContaining(toIndices([...detection.cells, ...eliminations.map((e) => e.cell)]));
  // Ninguna unidad, en cambio, sí es una detección corrupta: el fallback resuelve
  // empates, no imposibles.
  if (unit === undefined) {
    throw new Error(
      `Naked pair sin unidad: ${detection.cells.join(', ')} y sus eliminaciones ` +
        `no caben en ninguna fila, columna ni caja`,
    );
  }

  return Object.freeze({
    technique: 'naked-pair',
    pair: [first, second] as const,
    cells: detection.cells,
    unit: toUnitRef(unit),
    eliminations,
  });
}

function explainPointingPair(detection: Detection): PointingPairExplain {
  const [digit] = detection.digits;
  const [first, second] = toIndices(detection.cells);
  // Caja y línea salen de las propias celdas del patrón: por definición de la
  // técnica las dos comparten caja y comparten fila o columna.
  if (rowOf(first) !== rowOf(second) && colOf(first) !== colOf(second)) {
    throw new Error(
      `Pointing pair sin línea: ${detection.cells.join(', ')} no comparten fila ni columna`,
    );
  }
  const line = rowOf(first) === rowOf(second) ? ROWS[rowOf(first)] : COLUMNS[colOf(first)];

  return Object.freeze({
    technique: 'pointing-pair',
    digit,
    box: toUnitRef(BOXES[boxOf(first)]),
    patternCells: detection.cells,
    line: toUnitRef(line),
    eliminations: groupEliminations(detection),
  });
}

/**
 * El porqué de una detección, listo para redactar.
 * Lanza si la detección no es coherente con el tablero: una explicación a medias
 * es peor que ninguna, porque el jugador no puede distinguirlas.
 */
export function explainData(board: Board, detection: Detection): ExplainData {
  switch (detection.technique) {
    case 'naked-single':
      return explainNakedSingle(board, detection);
    case 'hidden-single':
      return explainHiddenSingle(board, detection);
    case 'naked-pair':
      return explainNakedPair(detection);
    case 'pointing-pair':
      return explainPointingPair(detection);
  }
}
