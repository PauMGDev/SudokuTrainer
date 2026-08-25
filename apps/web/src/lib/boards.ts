/**
 * Los tableros que sirve la web, con su catálogo acotado y su caché.
 *
 * `generate` cuesta entre 8 y 330 ms según el nivel, y es lo que se paga por
 * cada tablero que no estuviera hecho ya. Dos decisiones acotan esa factura:
 * el catálogo es finito y lo generado no se genera dos veces.
 */

import { DIFFICULTIES, generate, toString as boardToString, type Difficulty } from 'engine';

/**
 * El espacio de semillas se cierra a propósito. Cada partida enlaza a la
 * siguiente semilla, así que sin tope hay infinitas URL distintas y cada una
 * cuesta una generación: un rastreador que siga los enlaces pasea sin fin
 * quemando CPU. Con el módulo el paseo da la vuelta, el catálogo es finito
 * —MAX_SEED tableros por nivel— y la caché de abajo lo cubre entero.
 */
export const MAX_SEED = 1000;

/** El nivel que pide la URL, o `easy` si pide cualquier otra cosa. */
export function toDifficulty(param: string | undefined): Difficulty | null {
  return DIFFICULTIES.find((difficulty) => difficulty === param) ?? null;
}

/** La semilla que pide la URL, traída al catálogo. */
export function toSeed(param: string | undefined): number | null {
  if (param === undefined) return null;
  const seed = Number(param);
  return Number.isInteger(seed) && seed >= 0 ? seed % MAX_SEED : null;
}

export interface CachedBoard {
  /** Los 81 caracteres, el formato que necesitará `/api/explain`. */
  readonly wire: string;
  /** La semilla que de verdad produjo el tablero, no la que se pidió. */
  readonly seed: number;
}

/**
 * `generate` es determinista: mismos `seed` y `difficulty`, mismo tablero. Como
 * el catálogo es finito, el mapa se llena con MAX_SEED × niveles entradas de 81
 * caracteres y a partir de ahí ninguna visita vuelve a pagar la generación.
 *
 * Vive en el módulo, o sea por proceso: no es un caché compartido ni pretende
 * serlo. Es la segunda línea, por detrás del prerenderizado — lo que salva es
 * el trabajo repetido dentro de un mismo build o de una misma instancia.
 */
const boards = new Map<string, CachedBoard>();

export function board(difficulty: Difficulty, seed: number): CachedBoard {
  const key = `${difficulty}:${seed}`;
  const cached = boards.get(key);
  if (cached !== undefined) return cached;

  const generated = generate({ seed, difficulty });
  const value: CachedBoard = { wire: boardToString(generated.puzzle), seed: generated.seed };
  boards.set(key, value);
  return value;
}
