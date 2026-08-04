/**
 * Normalización de detecciones.
 *
 * Los detectores trabajan con índices planos, que es lo cómodo para la
 * aritmética de unidades; una `Detection` habla en R#C#, que es la única
 * notación que sale del engine. Esta es la frontera entre las dos.
 *
 * La otra razón de que exista un único constructor: `patternKey`. Es la clave
 * de caché de las explicaciones, así que tiene que ser canónica —mismo patrón,
 * misma clave, venga del detector que venga y en el orden que venga—. Si cada
 * detector la construyera a su gusto, la caché se fragmentaría en silencio:
 * seguiría funcionando, solo que fallando el hit y pagando la llamada.
 */

import type { CellIndex, Digit } from '../types';
import { toRef } from '../notation';
import type { Detection, Elimination, Placement, TechniqueId } from './types';

/** Una consecuencia de la técnica, en índices: así la escriben los detectores. */
interface CellDigit {
  readonly cell: CellIndex;
  readonly digit: Digit;
}

export interface DetectionInput {
  readonly technique: TechniqueId;
  /** Celdas del patrón, en cualquier orden. */
  readonly cells: Iterable<CellIndex>;
  /** Candidatos implicados, en cualquier orden. */
  readonly digits: Iterable<Digit>;
  readonly placements?: Iterable<CellDigit>;
  readonly eliminations?: Iterable<CellDigit>;
}

/** Ordena y deduplica índices de celda. */
function normalizeCells(cells: Iterable<CellIndex>): CellIndex[] {
  return [...new Set(cells)].sort((a, b) => a - b);
}

/** Ordena y deduplica pares celda-dígito: por celda, y a igualdad por dígito. */
function normalizePairs(pairs: Iterable<CellDigit>): CellDigit[] {
  const unique = new Map<string, CellDigit>();
  for (const pair of pairs) unique.set(`${pair.cell}:${pair.digit}`, pair);
  return [...unique.values()].sort((a, b) => a.cell - b.cell || a.digit - b.digit);
}

/** "R1C1=5, R2C3=7" — el formato es el mismo en la clave y en los mensajes. */
function formatPairs(pairs: readonly CellDigit[], separator: string): string {
  return pairs.map((pair) => `${toRef(pair.cell)}${separator}${pair.digit}`).join(',');
}

/**
 * Construye la clave canónica a partir de datos ya normalizados.
 * Incluye las consecuencias, no solo el patrón: el mismo naked pair que elimina
 * candidatos distintos merece explicaciones distintas, y por tanto entradas de
 * caché distintas.
 */
function buildPatternKey(
  technique: TechniqueId,
  cells: readonly CellIndex[],
  digits: readonly Digit[],
  placements: readonly CellDigit[],
  eliminations: readonly CellDigit[],
): string {
  return [
    technique,
    `cells=${cells.map(toRef).join(',')}`,
    `digits=${digits.join(',')}`,
    `place=${formatPairs(placements, '=')}`,
    `elim=${formatPairs(eliminations, '-')}`,
  ].join('|');
}

/**
 * Normaliza una detección y le calcula la clave de patrón.
 *
 * Rechaza detecciones vacías: un patrón sin celdas no se puede resaltar, y una
 * detección que no coloca ni elimina nada no concluye nada. Ambas serían un bug
 * del detector, y es mejor que reviente en su test que llegue muda a la UI.
 */
export function createDetection(input: DetectionInput): Detection {
  const cells = normalizeCells(input.cells);
  const digits = [...new Set(input.digits)].sort((a, b) => a - b);
  const placements = normalizePairs(input.placements ?? []);
  const eliminations = normalizePairs(input.eliminations ?? []);

  if (cells.length === 0) {
    throw new Error(`Detección de ${input.technique} sin celdas de patrón`);
  }
  if (placements.length === 0 && eliminations.length === 0) {
    throw new Error(`Detección de ${input.technique} que no coloca ni elimina nada`);
  }

  const toPlacement = (pair: CellDigit): Placement =>
    Object.freeze({ cell: toRef(pair.cell), digit: pair.digit });
  const toElimination = (pair: CellDigit): Elimination =>
    Object.freeze({ cell: toRef(pair.cell), digit: pair.digit });

  return Object.freeze({
    technique: input.technique,
    cells: Object.freeze(cells.map(toRef)),
    digits: Object.freeze(digits),
    placements: Object.freeze(placements.map(toPlacement)),
    eliminations: Object.freeze(eliminations.map(toElimination)),
    patternKey: buildPatternKey(input.technique, cells, digits, placements, eliminations),
  });
}
