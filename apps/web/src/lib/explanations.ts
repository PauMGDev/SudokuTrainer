/**
 * Caché de explicaciones y redacción de las nuevas.
 *
 * Las dos cosas viven juntas porque son la misma decisión vista de dos lados:
 * escribir una explicación es lo caro (en 5.4, una llamada a Anthropic), así
 * que todo lo que la evite es lo que hay que mirar primero. La clave es la
 * `patternKey` del engine: canónica desde 2.1, de modo que dos jugadores con el
 * mismo naked pair en tableros distintos comparten entrada.
 */

import type { Detection } from 'engine';

import { copy } from '../copy';
import { db } from './db';

export interface Explanation {
  readonly technique: string;
  readonly text: string;
}

/** La explicación guardada para ese patrón, o `null` si es la primera vez. */
export async function findExplanation(patternKey: string): Promise<Explanation | null> {
  const row = await db().explanation.findUnique({
    where: { patternKey },
    select: { technique: true, text: true },
  });
  return row;
}

/**
 * Guarda la explicación recién escrita. `upsert` y no `create`: dos peticiones
 * simultáneas del mismo patrón entran las dos en el camino caro, y la segunda
 * no debe reventar con una violación de clave.
 */
export async function saveExplanation(
  patternKey: string,
  explanation: Explanation,
): Promise<void> {
  await db().explanation.upsert({
    where: { patternKey },
    create: { patternKey, ...explanation },
    update: {},
  });
}

/**
 * El camino caro: redactar. Hoy devuelve el texto fijo de la técnica; en 5.4
 * aquí entra Claude con la detección concreta. Todo lo demás ya está pensado
 * para que esto se llame lo menos posible.
 */
export async function writeExplanation(detection: Detection): Promise<Explanation> {
  return {
    technique: detection.technique,
    text: copy.explanation.techniques[detection.technique].body,
  };
}
