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
import { DIGITS, type Board, type CellIndex, type Digit } from './types';
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
   * Los ocho dígitos que no caben en la celda, ascendentes, cada uno con su
   * prueba: `at` es la celda que ya lleva ese dígito y `via` la unidad por la
   * que la celda objetivo la ve. Un dígito suelto no es evidencia —dice QUÉ se
   * descarta pero no DÓNDE está—, y quien redacta acaba inventándose la
   * ubicación con tal de escribir la frase.
   */
  readonly eliminatedBy: readonly {
    readonly digit: Digit;
    readonly at: CellRef;
    readonly via: UnitRef;
  }[];
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

/**
 * El peer que prueba que `digit` no cabe en `cell`, o `undefined` si no lo hay.
 *
 * El mismo dígito puede estar en varios peers y solo se nombra uno, así que la
 * elección la fija el engine y tiene que salir igual en cada llamada: si
 * dependiera del que redacta, la misma jugada se explicaría distinto dos veces.
 * Primero gana quien comparte línea, por lo mismo que en `sharedUnit`: "está en
 * la misma fila" se narra solo y la caja es el argumento de repuesto. Entre dos
 * de la misma clase gana el de menor índice, que es orden de lectura y el orden
 * en el que ya viene `peersOf`.
 */
function witnessFor(
  board: Board,
  cell: CellIndex,
  digit: Digit,
): { readonly at: CellIndex; readonly via: Unit } | undefined {
  let best: { at: CellIndex; via: Unit } | undefined;
  for (const peer of peersOf(cell)) {
    if (getCell(board, peer).value !== digit) continue;
    const via = sharedUnit(cell, peer);
    if (best === undefined || (best.via.kind === 'box' && via.kind !== 'box')) {
      best = { at: peer, via };
    }
  }
  return best;
}

function explainNakedSingle(board: Board, detection: Detection): NakedSingleExplain {
  const { cell, digit } = requirePlacement(detection);
  const index = toIndices([cell])[0];

  // Ascendente por dígito porque es como se lee la celda: `DIGITS` ya viene así.
  const eliminatedBy: NakedSingleExplain['eliminatedBy'][number][] = [];
  for (const eliminated of DIGITS) {
    if (eliminated === digit) continue;
    const witness = witnessFor(board, index, eliminated);
    // Sin testigo el dígito no está descartado. No se lista a medias: se omite
    // y lo caza la comprobación de abajo.
    if (witness === undefined) continue;
    eliminatedBy.push({
      digit: eliminated,
      at: toRef(witness.at),
      via: toUnitRef(witness.via),
    });
  }

  // El contrato de la técnica: los ocho dígitos que no son la colocación tienen
  // que quedar descartados, cada uno por su testigo. Como el bucle salta el
  // propio `digit` y recorre `DIGITS` una vez, contar basta para saber que están
  // todos. Si falta alguno es un bug del detector, y más vale que reviente aquí
  // que llegar a medias al prompt y que el LLM rellene el hueco inventando.
  if (eliminatedBy.length !== DIGITS.length - 1) {
    throw new Error(
      `Naked single incoherente en ${cell}: ${digit} no queda demostrado por ` +
        `los dígitos ya colocados (${eliminatedBy.map((e) => e.digit).join(',')})`,
    );
  }

  return Object.freeze({ technique: 'naked-single', cell, place: digit, eliminatedBy });
}

/** Por qué el dígito no cabe en esta celda de la unidad. */
function blockerFor(board: Board, index: CellIndex, digit: Digit): Blocker {
  const value = getCell(board, index).value;
  if (value !== null) return { reason: 'occupied', digit: value };
  // Mismo criterio de testigo que el naked single, a propósito: la afirmación
  // que se escribe es la misma ("ese dígito ya está ahí, por esta unidad"), y
  // dos técnicas que la elijan con reglas distintas explicarían el mismo
  // tablero de dos maneras según por dónde se pregunte.
  const witness = witnessFor(board, index, digit);
  if (witness === undefined) {
    throw new Error(`Hidden single incoherente: ${digit} sí cabe en ${toRef(index)}`);
  }
  return { reason: 'peer', digit, at: toRef(witness.at), via: toUnitRef(witness.via) };
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
