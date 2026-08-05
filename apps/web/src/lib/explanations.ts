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
import { MAX_TOKENS, MODEL, PROMPT_VERSION, SYSTEM_PROMPT, userPrompt } from './prompt';

export interface Explanation {
  readonly technique: string;
  readonly text: string;
}

/**
 * La clave de caché lleva la versión del prompt delante.
 *
 * Sin esto, arreglar el prompt no arregla nada para quien ya tiene una
 * explicación guardada: se le seguiría sirviendo la mala desde disco. Las filas
 * de versiones anteriores quedan inalcanzables — ocupan sitio y nada más; se
 * limpian con un `DELETE ... WHERE "patternKey" NOT LIKE 'v3:%'` cuando estorben.
 */
function cacheKey(patternKey: string): string {
  return `v${PROMPT_VERSION}:${patternKey}`;
}

/**
 * La explicación guardada para ese patrón, o `null` si es la primera vez.
 *
 * Una caché caída no es un error de la partida: si la base de datos no responde
 * se trata como un fallo de acierto y se sigue. Lo que NO se puede seguir sin
 * base de datos es gastar dinero — de eso se ocupa la cuota, en la route.
 */
export async function findExplanation(patternKey: string): Promise<Explanation | null> {
  try {
    return await db().explanation.findUnique({
      where: { patternKey: cacheKey(patternKey) },
      select: { technique: true, text: true },
    });
  } catch (error) {
    console.error('No se pudo leer la caché de explicaciones:', error);
    return null;
  }
}

/** El texto fijo de la técnica: la respuesta cuando no hay nada mejor que dar. */
export function fixedText(technique: ExplainData['technique']): Explanation {
  return { technique, text: copy.explanation.techniques[technique].body };
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
  try {
    await db().explanation.upsert({
      where: { patternKey: cacheKey(patternKey) },
      create: { patternKey: cacheKey(patternKey), ...explanation },
      update: {},
    });
  } catch (error) {
    // Guardar es una optimización, no parte de la respuesta: la explicación ya
    // está escrita y pagada, y perderla solo significa pagarla otra vez.
    console.error('No se pudo guardar la explicación en caché:', error);
  }
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
