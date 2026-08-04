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
 * Hoy el texto sale de `copy.ts`; en 5.4 lo escribirá Claude. El contrato de
 * cable no cambia por eso.
 */

import { detectAll, fromString, type Board } from 'engine';

import { copy } from '../../../copy';

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

  return Response.json({
    technique: detection.technique,
    explanation: copy.explanation.techniques[detection.technique].body,
  });
}
