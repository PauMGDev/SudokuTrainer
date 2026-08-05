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
import type { ExplainData } from 'engine';

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
function fallback(data: ExplainData): Explanation {
  return {
    technique: data.technique,
    text: copy.explanation.techniques[data.technique].body,
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
export async function writeExplanation(data: ExplainData): Promise<Explanation> {
  const request = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content: userPrompt(data) }],
  };

  // TEMPORAL (quitar antes de cerrar la fase 6): el cuerpo exacto que sale
  // hacia Anthropic. Se imprime antes de mirar la clave, así que también se ve
  // sin `ANTHROPIC_API_KEY` — y la clave nunca aparece aquí: viaja en una
  // cabecera que pone el SDK, no en el cuerpo.
  console.log('[explain] request →', JSON.stringify(request, null, 2));

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (apiKey === undefined || apiKey === '') return fallback(data);

  try {
    const message = await new Anthropic({ apiKey }).messages.create(request);

    // `content` es una unión: solo los bloques de texto son la explicación.
    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (text === '') return fallback(data);
    return { technique: data.technique, text };
  } catch (error) {
    // El error se registra en servidor y no viaja al cliente: puede llevar
    // detalles de la cuenta, y el jugador no puede hacer nada con ellos.
    console.error('No se pudo redactar la explicación con Claude:', error);
    return fallback(data);
  }
}
