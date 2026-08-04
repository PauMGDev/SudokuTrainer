/**
 * Caché de explicaciones y redacción de las nuevas.
 *
 * Las dos cosas viven juntas porque son la misma decisión vista de dos lados:
 * escribir una explicación es lo caro (en 5.4, una llamada a Anthropic), así
 * que todo lo que la evite es lo que hay que mirar primero. La clave es la
 * `patternKey` del engine: canónica desde 2.1, de modo que dos jugadores con el
 * mismo naked pair en tableros distintos comparten entrada.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Detection } from 'engine';

import { copy } from '../copy';
import { db } from './db';
import { MAX_TOKENS, MODEL, SYSTEM_PROMPT, userPrompt } from './prompt';

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

/** El texto fijo de la técnica: lo que se responde cuando Claude no está. */
function fallback(detection: Detection): Explanation {
  return {
    technique: detection.technique,
    text: copy.explanation.techniques[detection.technique].body,
  };
}

/**
 * El camino caro: redactar con Claude la detección concreta.
 *
 * Cae al texto fijo de la técnica si no hay clave o si la llamada falla. Dos
 * motivos: el proyecto se puede levantar y jugar sin `ANTHROPIC_API_KEY`, y un
 * fallo de red no debe romper una partida — la explicación genérica es peor
 * que la buena, pero infinitamente mejor que un panel roto.
 */
export async function writeExplanation(detection: Detection): Promise<Explanation> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (apiKey === undefined || apiKey === '') return fallback(detection);

  try {
    const message = await new Anthropic({ apiKey }).messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(detection) }],
    });

    // `content` es una unión: solo los bloques de texto son la explicación.
    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (text === '') return fallback(detection);
    return { technique: detection.technique, text };
  } catch (error) {
    // El error se registra en servidor y no viaja al cliente: puede llevar
    // detalles de la cuenta, y el jugador no puede hacer nada con ellos.
    console.error('No se pudo redactar la explicación con Claude:', error);
    return fallback(detection);
  }
}
