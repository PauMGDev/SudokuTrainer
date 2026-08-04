/**
 * El mapeo respuesta → lo que el panel puede pintar. La route ya está probada
 * aparte; aquí solo interesa que el cliente no se trague nada raro.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import { fetchExplanation } from './api';

function respond(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchExplanation', () => {
  test('200 devuelve el texto redactado', async () => {
    respond(200, { technique: 'naked-single', explanation: 'Solo cabe el 4.', cached: false });

    expect(await fetchExplanation('...', 'clave')).toEqual({
      kind: 'text',
      text: 'Solo cabe el 4.',
    });
  });

  test('429 devuelve el mensaje del servidor, no uno inventado aquí', async () => {
    respond(429, { error: 'daily_limit', message: 'Vuelve mañana.' });

    expect(await fetchExplanation('...', 'clave')).toEqual({
      kind: 'limit',
      message: 'Vuelve mañana.',
    });
  });

  test('422 y 500 son error para el panel', async () => {
    respond(422, { error: 'unknown_detection' });
    expect(await fetchExplanation('...', 'clave')).toEqual({ kind: 'error' });

    respond(500, {});
    expect(await fetchExplanation('...', 'clave')).toEqual({ kind: 'error' });
  });

  test('una respuesta sin explicación no se pinta como texto vacío', async () => {
    respond(200, { technique: 'naked-single', explanation: '' });

    expect(await fetchExplanation('...', 'clave')).toEqual({ kind: 'error' });
  });

  test('la red caída no revienta la partida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    expect(await fetchExplanation('...', 'clave')).toEqual({ kind: 'error' });
  });

  test('manda el tablero y la clave, y nada más', async () => {
    const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ explanation: 'ok' }), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchExplanation('tablero', 'clave');

    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(init.body))).toEqual({ puzzle: 'tablero', patternKey: 'clave' });
  });
});
