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

import type { Detection } from 'engine';

export const MODEL = 'claude-haiku-4-5';

/** Suficiente para tres frases; si se pasa, es que se ha ido por las ramas. */
export const MAX_TOKENS = 400;

export const SYSTEM_PROMPT = [
  'You explain sudoku techniques to a player who is learning them.',
  '',
  'You are given a technique that has already been detected and verified on the',
  "player's board. Your only job is to explain why it works, in plain language.",
  '',
  'Rules:',
  '- Never solve the puzzle, look for other moves, or question the detection.',
  '  What you are given is true. Explain that, and nothing else.',
  '- Use only the cells and digits provided. Never mention a cell that is not',
  '  in the data.',
  '- Always name cells in R#C# notation (R1C1 is the top-left corner).',
  '- Two or three sentences. Say what the pattern is, why it forces the',
  '  conclusion, and what the player can do with it.',
  '- Address the player as "you". No greetings, no sign-off, no markdown.',
].join('\n');

/** Los datos de la detección, tal y como los ve el modelo. */
export function userPrompt(detection: Detection): string {
  const lines = [
    `Technique: ${detection.technique}`,
    `Pattern cells: ${detection.cells.join(', ')}`,
    `Digits involved: ${detection.digits.join(', ')}`,
  ];

  if (detection.placements.length > 0) {
    const placements = detection.placements.map((p) => `${p.cell} is ${p.digit}`);
    lines.push(`Conclusion: ${placements.join('; ')}`);
  }

  if (detection.eliminations.length > 0) {
    const eliminations = detection.eliminations.map((e) => `${e.digit} cannot go in ${e.cell}`);
    lines.push(`Conclusion: ${eliminations.join('; ')}`);
  }

  return lines.join('\n');
}
