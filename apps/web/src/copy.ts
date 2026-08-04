/**
 * Todos los textos visibles y las etiquetas de accesibilidad de la app.
 *
 * Algunos son funciones y no constantes a propósito: las etiquetas ARIA de las
 * celdas son paramétricas, y construirlas en el componente sería un string
 * hardcodeado disfrazado.
 */

import type { TechniqueId } from 'engine';

/**
 * Una entrada por técnica que el engine sabe detectar. El tipo `Record` sobre
 * `TechniqueId` es lo que hace que sumar una técnica en el engine rompa aquí en
 * compilación en vez de renderizar un panel vacío.
 *
 * Los textos son provisionales: en 5.4 los escribe Claude sobre la detección
 * concreta. Estos hablan de la técnica en abstracto y no nombran ningún dígito,
 * que es justo lo que el trainer no quiere regalar.
 */
const techniques: Readonly<Record<TechniqueId, { readonly name: string; readonly body: string }>> = {
  'naked-single': {
    name: 'Naked single',
    body:
      "Every other digit already appears in this cell's row, column or box. " +
      'A single candidate survives, so it is the only thing that fits here.',
  },
  'hidden-single': {
    name: 'Hidden single',
    body:
      'Within this unit only one cell can still take that digit: the rest are blocked ' +
      'by their own row, column or box. The digit belongs to the cell left standing.',
  },
  'naked-pair': {
    name: 'Naked pair',
    body:
      'These two cells share a unit and hold the same two candidates, nothing else. ' +
      'Between them they use both digits up, so no other cell in the unit can take either.',
  },
  'pointing-pair': {
    name: 'Pointing pair',
    body:
      'Inside this box the digit only fits in cells that sit on the same line. ' +
      'Wherever it lands it stays on that line, so it is ruled out of the rest of it.',
  },
};

export const copy = {
  meta: {
    title: 'Sudoku Trainer',
    description: 'A sudoku that names the technique unlocking your next move, and explains it.',
  },
  app: {
    /** La línea en versalitas sobre el título, como en paumiquel.com. */
    eyebrow: 'Sudoku · engine + Claude',
    title: 'Sudoku Trainer',
    tagline: 'Learn the technique, not the answer.',
  },
  game: {
    difficultyLabel: 'Difficulty',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    newGame: 'New game',
    /** Se anuncia solo cuando el tablero está lleno y sin conflictos. */
    won: 'Solved. Every cell checks out.',
  },
  hint: {
    action: 'Hint',
    /**
     * Dice dónde mirar, nunca qué poner: 4.1 resalta el patrón y calla el valor.
     * La técnica se nombra y se explica en el panel de 4.2.
     */
    found: (refs: string): string => `Look at ${refs}.`,
    conflict: 'Two cells clash. Fix that first.',
    none: 'No technique I know applies here yet.',
  },
  explanation: {
    /** Segundo paso del flujo: el que en 5.4 gasta una llamada a la API. */
    action: 'Explain',
    label: 'Explanation',
    loading: 'Writing the explanation…',
    pattern: (refs: string): string => `Pattern: ${refs}`,
    /** 429: el límite es de explicaciones, no de partidas — eso hay que decirlo. */
    limit: (limit: number): string =>
      `That is ${limit} explanations for today. The board is still yours: keep solving, ` +
      'and the counter resets at midnight UTC.',
    techniques,
  },
  board: {
    label: 'Sudoku board',
    /** Lo que anuncia un lector de pantalla al entrar en una celda. */
    cell: (ref: string, value: number | null, given: boolean, notes: readonly number[]): string => {
      if (value !== null) return given ? `${ref}, ${value}, clue` : `${ref}, ${value}`;
      if (notes.length > 0) return `${ref}, notes ${notes.join(' ')}`;
      return `${ref}, empty`;
    },
  },
  keypad: {
    label: 'Number pad',
    digit: (digit: number): string => `Enter ${digit}`,
    eraseGlyph: '⌫',
    erase: 'Erase cell',
    hint: 'Pick a cell to start.',
    notes: 'Notes',
    /** La tecla que hace lo mismo que el botón, para quien juega con teclado. */
    notesKey: 'N',
    undo: 'Undo',
    undoGlyph: '↶',
  },
} as const;
