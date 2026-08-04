/**
 * Aleatoriedad con semilla.
 *
 * El engine no usa `Math.random`: sin reproducibilidad no se puede afirmar nada
 * sobre un tablero generado —ni en un test ni en un informe de bug—, porque el
 * tablero cambiaría en cada ejecución. Con semilla, "el puzzle de la semilla 7"
 * es una referencia estable.
 *
 * El algoritmo es mulberry32: 32 bits de estado, distribución suficiente para
 * barajar celdas y dígitos. No es criptográfico y no pretende serlo.
 */

export interface Random {
  /** Real en [0, 1). */
  next(): number;
  /** Entero en [0, max). */
  nextInt(max: number): number;
  /** Copia barajada, sin tocar el array recibido (Fisher-Yates). */
  shuffle<T>(values: readonly T[]): T[];
}

export function createRandom(seed: number): Random {
  if (!Number.isInteger(seed)) throw new TypeError(`La semilla debe ser entera: ${seed}`);

  // El estado se mantiene en 32 bits sin signo; `>>> 0` lo fuerza tras cada paso.
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  const nextInt = (max: number): number => {
    if (!Number.isInteger(max) || max < 1) {
      throw new RangeError(`El tope debe ser un entero positivo: ${max}`);
    }
    return Math.floor(next() * max);
  };

  const shuffle = <T,>(values: readonly T[]): T[] => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = nextInt(i + 1);
      const swap = result[i];
      result[i] = result[j];
      result[j] = swap;
    }
    return result;
  };

  return { next, nextInt, shuffle };
}
