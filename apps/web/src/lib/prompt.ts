/**
 * El prompt de la explicación.
 *
 * Regla del proyecto, aquí es donde se cumple: el LLM no resuelve, no valida y
 * no decide. Recibe una detección que el engine ya encontró y el servidor ya
 * re-verificó (5.1), y su único trabajo es redactarla. Por eso el mensaje NO
 * lleva el tablero: sin los 81 caracteres delante no hay nada que deducir, y
 * cualquier cosa que se invente se nota porque no cuadra con los datos dados.
 *
 * Sí nombra dígitos. Explicar un naked single sin decir qué número es no
 * enseña la técnica, solo la esconde: el que calla el valor es el Hint (4.1),
 * que resalta celdas; el panel es el paso en que el jugador pide el porqué.
 */

import type { ExplainData, UnitRef } from 'engine';

export const MODEL = 'claude-haiku-4-5';

/**
 * Sube cada vez que cambien el payload o el prompt. Forma parte de la clave de
 * caché: una explicación redactada con la versión anterior describe otros datos
 * —la v2 inventaba la geometría de los bloqueos, la v3 inventaba las celdas de
 * los dígitos eliminados, la v4 enumeraba ocho bloqueos seguidos y no había
 * quien la leyera— y servirla después de arreglar el prompt sería seguir
 * sirviendo el problema desde disco.
 */
export const PROMPT_VERSION = 5;

/** Suficiente para tres frases; si se pasa, es que se ha ido por las ramas. */
export const MAX_TOKENS = 400;

export const SYSTEM_PROMPT = [
  'You explain sudoku techniques to a player who is learning them.',
  '',
  'The user message is JSON: a technique that has already been detected and',
  "verified on the player's board, plus every fact needed to justify it. Your",
  'only job is to turn that into an explanation in plain language.',
  '',
  'Rules:',
  '- Never solve the puzzle, look for other moves, or question the detection.',
  '  What you are given is true. Explain that, and nothing else.',
  '- Use only what the JSON contains. Never mention a cell, digit or unit that',
  '  is not in it, and never claim a reason the data does not state.',
  '- Cells are R#C# (R1C1 is the top-left corner). Units read as "row 4",',
  '  "column 7", "box 6" — the index is 1-based, boxes go left to right and top',
  '  to bottom.',
  '- Cite the specific evidence: which digits already rule the cell out, which',
  '  cell blocks a candidate. That evidence is why the player learns anything.',
  '- Group that evidence by unit instead of listing it digit by digit. "Row 7',
  '  already has 2, 4, 5 and 9 (R7C3, R7C2, R7C4, R7C7)" reads; eight separate',
  '  clauses do not. Keep every cell reference — just gather them.',
  '- When citing why a cell is blocked, use the via relation verbatim — never',
  '  infer geometry from coordinates.',
  '- If the payload states a digit without a location, never attach one.',
  '  Locations and units come only from `at` and `via`, verbatim.',
  '- Two or three sentences. Say what the pattern is, why it forces the',
  '  conclusion, and what the player can do with it.',
  '- Address the player as "you". No greetings, no sign-off, no markdown.',
].join('\n');

/** "row 2", "column 6", "box 3" — como se leen en voz alta, 1-based. */
function unitLabel(unit: UnitRef): string {
  return `${unit.kind} ${unit.index}`;
}

function isUnitRef(value: unknown): value is UnitRef {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, index } = value as Record<string, unknown>;
  return (kind === 'row' || kind === 'column' || kind === 'box') && typeof index === 'number';
}

/**
 * Los datos de la detección, tal y como los ve el modelo.
 *
 * Las unidades se aplanan a texto ("column 6") en vez de viajar como objeto:
 * es la frase que el modelo tiene que escribir, y dársela hecha le quita la
 * tentación de recomponerla —mal— desde las coordenadas. El resto va tal cual,
 * en JSON compacto: cada salto de línea son tokens que se pagan en cada
 * explicación nueva.
 */
export function userPrompt(data: ExplainData): string {
  return JSON.stringify(data, (_key, value: unknown) =>
    isUnitRef(value) ? unitLabel(value) : value,
  );
}
