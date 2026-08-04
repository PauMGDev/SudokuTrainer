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
  board: {
    label: 'Sudoku board',
    /** Lo que anuncia un lector de pantalla al entrar en una celda. */
    cell: (ref: string, value: number | null, given: boolean): string => {
      if (value === null) return `${ref}, empty`;
      return given ? `${ref}, ${value}, clue` : `${ref}, ${value}`;
    },
  },
} as const;
