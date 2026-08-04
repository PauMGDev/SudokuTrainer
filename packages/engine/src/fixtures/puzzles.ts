/**
 * Tableros con nombre para tests y demos.
 *
 * Se escriben en 9 líneas de 9 caracteres porque `fromString` ignora los espacios:
 * un fixture tiene que poder leerse de un vistazo, no descifrarse.
 */

/** El sudoku de ejemplo de siempre. Solución única, se resuelve con técnicas básicas. */
export const CLASSIC = `
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`;

export const CLASSIC_SOLUTION = `
  534678912
  672195348
  198342567
  859761423
  426853791
  713924856
  961537284
  287419635
  345286179
`;

/**
 * 23 pistas, solución única. Derivado de CLASSIC_SOLUTION quitando pistas
 * mientras la unicidad aguantaba, así que comparte solución con CLASSIC.
 * Con tan pocas pistas el árbol de búsqueda es lo bastante ancho como para
 * notar si el solver pierde la heurística MRV.
 */
export const HARD_23 = `
  ...6.8.12
  .7.1....8
  .9....5..
  .5.......
  ....5.7.1
  ....2.8..
  ..1......
  2.74...3.
  3....6.7.
`;

/** El CLASSIC sin sus dos últimas filas. Ya no tiene solución única. */
export const MULTIPLE_SOLUTIONS = `
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  .........
  .........
`;

/** Dos cincos en la primera fila: no hay ninguna solución posible. */
export const CONTRADICTORY = `
  55..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`;

export const EMPTY = '.'.repeat(81);
