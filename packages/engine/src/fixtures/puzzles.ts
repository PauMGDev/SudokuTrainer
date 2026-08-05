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

/**
 * Su único naked single es el 2 de R2C4, elegido porque el testigo del 1 está
 * empatado: R1C6 solo comparte caja con R2C4, R2C3 comparte fila, y R1C6 va
 * antes en orden de lectura. Así el tablero separa el desempate por unidad del
 * desempate por orden, cosa que ningún otro fixture hace. Es
 * `generate({ seed: 0, difficulty: 'easy' }).puzzle`, o sea el primer tablero
 * fácil del generador (sale de la semilla 4): un tablero real, no escrito a mano.
 */
export const NAKED_SINGLE = `
  4..8.1...
  ..1....56
  .3.4.6...
  .6.1.8..7
  ...9.....
  ...7.3.4.
  .42...9..
  .853...6.
  9........
`;

/**
 * Contiene un naked pair {7,9} en R8C1 y R9C1, que además comparten caja:
 * el mismo par se ve desde la columna y desde la caja, con eliminaciones
 * distintas en cada una. Es `generate({ seed: 3 }).puzzle`, así que es un
 * tablero real con solución única, no uno escrito a mano.
 */
export const NAKED_PAIR = `
  3..2..4..
  2...1.3.5
  ..7..5.9.
  ....4..7.
  1.......2
  ..2.5....
  5.4..9...
  ..6..48..
  .8......6
`;

/**
 * Contiene un pointing pair del 1 en la caja 6: dentro de la caja el 1 solo cabe
 * en R4C7 y R4C9, que comparten fila, así que queda descartado en el resto de la
 * fila 4. Es `generate({ seed: 0, difficulty: 'hard' }).puzzle`, es decir el
 * primer tablero difícil que da el generador: un tablero real, no escrito a mano.
 */
export const POINTING_PAIR = `
  .....8.13
  5.8....4.
  .1.6.....
  ..6.2..3.
  1...6...5
  ...9..4.2
  76.......
  ..4..28..
  3........
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
