/**
 * La route es una función que recibe un `Request` y devuelve un `Response`: se
 * prueba llamándola, sin levantar servidor ni pedirle nada a Next.
 */

import { describe, expect, test } from 'vitest';
import { detectNext, fromString, generate, toString as boardToString } from 'engine';

import { copy } from '../../../copy';
import { POST } from './route';

const { puzzle } = generate({ seed: 0, difficulty: 'easy' });
const PUZZLE = boardToString(puzzle);

const detection = detectNext(fromString(PUZZLE));
if (detection === null) throw new Error('el fixture debería tener alguna detección');

/** Otro tablero, para probar una clave que es real pero de otra partida. */
const other = generate({ seed: 5, difficulty: 'medium' });
const otherDetection = detectNext(other.puzzle);
if (otherDetection === null) throw new Error('el segundo fixture debería detectar algo');

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('http://localhost/api/explain', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/explain', () => {
  test('acepta una detección que el engine reencuentra sobre ese tablero', async () => {
    const response = await post({ puzzle: PUZZLE, patternKey: detection.patternKey });
    expect(response.status).toBe(200);

    const body: unknown = await response.json();
    expect(body).toEqual({
      technique: detection.technique,
      explanation: copy.explanation.techniques[detection.technique].body,
    });
  });

  test('rechaza una clave manipulada', async () => {
    const tampered = detection.patternKey.replace(/digits=\d/, 'digits=9');
    const response = await post({ puzzle: PUZZLE, patternKey: tampered });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'unknown_detection' });
  });

  test('rechaza una clave real pero de otro tablero', async () => {
    const response = await post({ puzzle: PUZZLE, patternKey: otherDetection.patternKey });
    expect(response.status).toBe(422);
  });

  test('rechaza un tablero que no son 81 caracteres', async () => {
    const response = await post({ puzzle: PUZZLE.slice(0, 80), patternKey: detection.patternKey });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  test('rechaza un tablero con caracteres inválidos', async () => {
    const response = await post({ puzzle: 'x'.repeat(81), patternKey: detection.patternKey });
    expect(response.status).toBe(400);
  });

  test('rechaza cuerpos mal formados', async () => {
    expect((await post('no soy json')).status).toBe(400);
    expect((await post({ puzzle: PUZZLE })).status).toBe(400);
    expect((await post({ puzzle: 42, patternKey: detection.patternKey })).status).toBe(400);
    expect((await post(null)).status).toBe(400);
  });

  test('rechaza una clave absurdamente larga sin llegar a detectar', async () => {
    const response = await post({ puzzle: PUZZLE, patternKey: 'a'.repeat(201) });
    expect(response.status).toBe(400);
  });
});
