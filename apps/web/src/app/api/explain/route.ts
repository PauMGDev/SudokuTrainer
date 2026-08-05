/**
 * POST /api/explain — el porqué de una detección, redactado en servidor.
 *
 * Regla del proyecto: el LLM no resuelve, no valida y no decide. Y como el
 * cliente puede mandar cualquier cosa, tampoco se le cree: lo único que viaja
 * es el tablero y la clave del patrón, y el servidor vuelve a detectar con el
 * engine para comprobar que esa detección existe de verdad sobre ese tablero.
 * Lo que no viaja no hay que validarlo — por eso no se aceptan ni técnica ni
 * celdas: se derivan de la detección re-encontrada.
 *
 * Verificada la detección, la explicación se busca en caché por `patternKey` y
 * solo se redacta si falta. `cached` viaja en la respuesta porque es lo único
 * que hace observable desde fuera que la segunda petición no pagó nada.
 *
 * La cuota diaria se descuenta justo antes de redactar, que es donde 5.4 gasta
 * dinero: los aciertos de caché no consumen nada.
 */

import { detectAll, explainData, fromString, type Board } from 'engine';

import { copy } from '../../../copy';
import {
  findExplanation,
  fixedText,
  saveExplanation,
  writeExplanation,
} from '../../../lib/explanations';
import { consumeQuota, consumeTotal, secondsUntilReset, type Quota } from '../../../lib/quota';
import { newSessionId, readSessionId, sessionCookie } from '../../../lib/session';

/** Una `patternKey` real ronda los 80 caracteres; más allá es basura. */
const MAX_PATTERN_KEY = 200;

interface ExplainRequest {
  readonly puzzle: string;
  readonly patternKey: string;
}

function parseBody(body: unknown): ExplainRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { puzzle, patternKey } = body as Record<string, unknown>;
  if (typeof puzzle !== 'string' || typeof patternKey !== 'string') return null;
  if (patternKey.length === 0 || patternKey.length > MAX_PATTERN_KEY) return null;
  return { puzzle, patternKey };
}

/** Petición mal formada: ni siquiera se llega a mirar el tablero. */
function invalidRequest(): Response {
  return Response.json({ error: 'invalid_request' }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest();
  }

  const parsed = parseBody(body);
  if (parsed === null) return invalidRequest();

  let board: Board;
  try {
    // `fromString` lanza si el tablero no son 81 caracteres válidos.
    board = fromString(parsed.puzzle);
  } catch {
    return invalidRequest();
  }

  const detection = detectAll(board).find((found) => found.patternKey === parsed.patternKey);

  // Bien formado pero falso: la clave no corresponde a ninguna detección de
  // este tablero. 422 y no 400 — el problema es el contenido, no la forma.
  if (detection === undefined) {
    return Response.json({ error: 'unknown_detection' }, { status: 422 });
  }

  // La sesión se emite aunque la respuesta salga de caché: sin cookie estable
  // no hay cuota que valga, y la siguiente petición ya vendrá identificada.
  const sessionId = readSessionId(request) ?? newSessionId();
  const headers = { 'set-cookie': sessionCookie(sessionId) };

  const cached = await findExplanation(detection.patternKey);
  if (cached !== null) {
    // Un acierto de caché no gasta cuota: no ha costado nada producirlo.
    return Response.json(
      { technique: cached.technique, explanation: cached.text, cached: true },
      { headers },
    );
  }

  // El material pedagógico se calcula aquí, con el tablero delante, y es lo
  // único que viaja al modelo.
  const data = explainData(board, detection);

  let quota: Quota;
  try {
    quota = await consumeQuota(sessionId);
  } catch (error) {
    // Sin base de datos no hay contador, y sin contador no hay techo de gasto:
    // llamar a Claude a ciegas sería la peor manera de "degradar con elegancia".
    // Se responde el texto fijo de la técnica, que no cuesta nada y se lee.
    console.error('No se pudo contar la cuota; se responde sin llamar al modelo:', error);
    const fixed = fixedText(data.technique);
    return Response.json(
      { technique: fixed.technique, explanation: fixed.text, cached: false, degraded: true },
      { headers },
    );
  }

  if (!quota.allowed) {
    return Response.json(
      { error: 'daily_limit', message: copy.explanation.limit(quota.limit) },
      { status: 429, headers: { ...headers, 'retry-after': String(secondsUntilReset()) } },
    );
  }

  // Y el techo de toda la demo. La cuota por sesión ordena el uso normal; esta
  // pone el suelo del abuso, porque una sesión anónima es una cookie y una
  // cookie se borra. Se descuenta después: quien ya agotó la suya no gasta del
  // bote común.
  const total = await consumeTotal();
  if (!total.allowed) {
    return Response.json(
      { error: 'service_limit', message: copy.explanation.serviceLimit },
      { status: 429, headers: { ...headers, 'retry-after': String(secondsUntilReset()) } },
    );
  }

  const written = await writeExplanation(data);
  await saveExplanation(detection.patternKey, written);
  return Response.json(
    { technique: written.technique, explanation: written.text, cached: false },
    { headers },
  );
}
