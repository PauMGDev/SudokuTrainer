/**
 * Todos los textos visibles y las etiquetas de accesibilidad de la app.
 *
 * Algunos son funciones y no constantes a propósito: las etiquetas ARIA de las
 * celdas son paramétricas, y construirlas en el componente sería un string
 * hardcodeado disfrazado.
 */

export const copy = {
  meta: {
    title: 'Sudoku Trainer',
    description: 'A sudoku that names the technique unlocking your next move, and explains it.',
  },
  app: {
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
