/**
 * La route es una función que recibe un `Request` y devuelve un `Response`: se
 * prueba llamándola, sin levantar servidor ni pedirle nada a Next.
 *
 * Caché y cuota se sustituyen por `Map`s: lo que interesa comprobar no es que
 * Postgres guarde filas —eso es de Prisma— sino que la segunda petición del
 * mismo patrón no vuelva a pasar por el camino caro, y que la petición 11
 * rebote.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { detectAll, detectNext, fromString, generate, toString as boardToString } from 'engine';

import { copy } from '../../../copy';
import * as explanations from '../../../lib/explanations';
import * as quota from '../../../lib/quota';
import { POST } from './route';

vi.mock('../../../lib/explanations', async () => {
  const actual =
    await vi.importActual<typeof import('../../../lib/explanations')>('../../../lib/explanations');
  const store = new Map<string, explanations.Explanation>();

  return {
    ...actual,
    findExplanation: vi.fn((patternKey: string) =>
      Promise.resolve(store.get(patternKey) ?? null),
    ),
    saveExplanation: vi.fn((patternKey: string, explanation: explanations.Explanation) => {
      store.set(patternKey, explanation);
      return Promise.resolve();
    }),
    writeExplanation: vi.fn(actual.writeExplanation),
    __store: store,
  };
});

vi.mock('../../../lib/quota', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/quota')>('../../../lib/quota');
  const used = new Map<string, number>();

  return {
    ...actual,
    consumeTotal: vi.fn((limit: number = actual.dailyTotal()) => {
      const next = (used.get('__all__') ?? 0) + 1;
      used.set('__all__', next);
      return Promise.resolve({ allowed: next <= limit, used: next, limit });
    }),
    consumeQuota: vi.fn((sessionId: string, limit: number = actual.dailyLimit()) => {
      const next = (used.get(sessionId) ?? 0) + 1;
      used.set(sessionId, next);
      return Promise.resolve({ allowed: next <= limit, used: next, limit });
    }),
    __used: used,
  };
});

/** Los `Map`s que hacen de tablas, para vaciarlos entre tests. */
const store = (explanations as unknown as { __store: Map<string, explanations.Explanation> })
  .__store;
const used = (quota as unknown as { __used: Map<string, number> }).__used;

beforeEach(() => {
  store.clear();
  used.clear();
  vi.unstubAllEnvs();
  vi.mocked(explanations.writeExplanation).mockClear();
});

const { puzzle } = generate({ seed: 0, difficulty: 'easy' });
const PUZZLE = boardToString(puzzle);

const detection = detectNext(fromString(PUZZLE));
if (detection === null) throw new Error('el fixture debería tener alguna detección');

/** Otro tablero, para probar una clave que es real pero de otra partida. */
const other = generate({ seed: 5, difficulty: 'medium' });
const otherDetection = detectNext(other.puzzle);
if (otherDetection === null) throw new Error('el segundo fixture debería detectar algo');

/**
 * Detecciones distintas de tableros distintos, para gastar cuota sin que la
 * caché las absorba. Salen del engine, no escritas a mano.
 */
const DISTINCT: readonly { puzzle: string; patternKey: string }[] = [
  ...new Map(
    // Semillas medidas que dan tableros distintos (3.3): pedir `easy` desde 0 y
    // desde 1 cae en el mismo, y un patrón repetido saldría de caché sin gastar
    // cuota, que es justo lo que este test no quiere.
    [0, 5, 6, 8]
      .map((seed) => generate({ seed, difficulty: 'easy' }).puzzle)
      .flatMap((board) => {
        const wire = boardToString(board);
        return detectAll(board).map((found) => ({ puzzle: wire, patternKey: found.patternKey }));
      })
      .map((payload) => [payload.patternKey, payload] as const),
  ).values(),
];

function post(body: unknown, cookie?: string): Promise<Response> {
  return POST(
    new Request('http://localhost/api/explain', {
      method: 'POST',
      headers: cookie === undefined ? undefined : { cookie },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

/** El valor de la cookie `sid` que la respuesta emite. */
function sessionOf(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  return header.split(';')[0].replace('sid=', '');
}

describe('POST /api/explain', () => {
  test('acepta una detección que el engine reencuentra sobre ese tablero', async () => {
    const response = await post({ puzzle: PUZZLE, patternKey: detection.patternKey });
    expect(response.status).toBe(200);

    const body: unknown = await response.json();
    expect(body).toEqual({
      technique: detection.technique,
      explanation: copy.explanation.techniques[detection.technique].body,
      cached: false,
    });
  });

  test('la segunda petición idéntica sale de caché y no vuelve a redactar', async () => {
    const payload = { puzzle: PUZZLE, patternKey: detection.patternKey };

    const first: unknown = await (await post(payload)).json();
    const second: unknown = await (await post(payload)).json();

    expect(first).toMatchObject({ cached: false });
    expect(second).toMatchObject({ cached: true });
    // El criterio del roadmap, medido donde se paga: una sola redacción.
    expect(explanations.writeExplanation).toHaveBeenCalledTimes(1);
  });

  test('una detección distinta sí se redacta aparte', async () => {
    await post({ puzzle: PUZZLE, patternKey: detection.patternKey });
    await post({
      puzzle: boardToString(other.puzzle),
      patternKey: otherDetection.patternKey,
    });

    expect(explanations.writeExplanation).toHaveBeenCalledTimes(2);
    expect(store.size).toBe(2);
  });

  test('una detección rechazada no toca la caché', async () => {
    await post({ puzzle: PUZZLE, patternKey: 'naked-single|cells=R1C1|digits=1|place=|elim=' });

    expect(explanations.writeExplanation).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
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

describe('cuota diaria', () => {
  const LIMIT = quota.dailyLimit();

  test('la petición que pasa del tope recibe 429 con Retry-After', async () => {
    expect(DISTINCT.length).toBeGreaterThan(LIMIT);
    const cookie = `sid=${crypto.randomUUID()}`;

    for (const payload of DISTINCT.slice(0, LIMIT)) {
      expect((await post(payload, cookie)).status).toBe(200);
    }

    const rejected = await post(DISTINCT[LIMIT], cookie);
    expect(rejected.status).toBe(429);
    expect(Number(rejected.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await rejected.json()).toEqual({
      error: 'daily_limit',
      message: copy.explanation.limit(LIMIT),
    });
    // Rebotada antes de redactar: el límite protege lo que cuesta.
    expect(explanations.writeExplanation).toHaveBeenCalledTimes(LIMIT);
  });

  test('con la cuota agotada, la caché sigue respondiendo', async () => {
    const cookie = `sid=${crypto.randomUUID()}`;
    const first = DISTINCT[0];

    await post(first, cookie);
    for (const payload of DISTINCT.slice(1, LIMIT + 2)) await post(payload, cookie);

    const repeated = await post(first, cookie);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({ cached: true });
  });

  test('un acierto de caché no gasta cuota', async () => {
    const cookie = `sid=${crypto.randomUUID()}`;
    const payload = DISTINCT[0];

    await post(payload, cookie);
    await post(payload, cookie);
    await post(payload, cookie);

    expect(used.get(cookie.replace('sid=', ''))).toBe(1);
  });

  test('cada sesión tiene su propia cuota', async () => {
    for (const payload of DISTINCT.slice(0, LIMIT)) await post(payload, 'sid=uno');

    expect((await post(DISTINCT[LIMIT], 'sid=uno')).status).toBe(429);
    expect((await post(DISTINCT[LIMIT], 'sid=dos')).status).toBe(200);
  });
});

describe('techo de la demo', () => {
  test('agotado el bote común, ninguna sesión redacta ya', async () => {
    // Con el tope real harían falta 200 patrones distintos; lo que se prueba es
    // la regla, no el número, y el número es configurable justo para esto.
    vi.stubEnv('EXPLAIN_DAILY_TOTAL', '3');

    // Una sesión distinta por petición: la cuota individual nunca se agota, que
    // es justo el abuso contra el que existe este techo.
    for (let i = 0; i < 3; i += 1) {
      expect((await post(DISTINCT[i], `sid=abusador-${i}`)).status).toBe(200);
    }

    const rejected = await post(DISTINCT[3], 'sid=recien-llegado');
    expect(rejected.status).toBe(429);
    expect(await rejected.json()).toEqual({
      error: 'service_limit',
      message: copy.explanation.serviceLimit,
    });
  });

  test('el techo no se toca cuando la respuesta sale de caché', async () => {
    await post(DISTINCT[0], 'sid=uno');
    const before = used.get('__all__');

    await post(DISTINCT[0], 'sid=otro-cualquiera');

    expect(used.get('__all__')).toBe(before);
  });
});

describe('cookie de sesión', () => {
  test('la primera petición emite una sesión nueva', async () => {
    const response = await post({ puzzle: PUZZLE, patternKey: detection.patternKey });
    const header = response.headers.get('set-cookie') ?? '';

    expect(sessionOf(response)).toMatch(/^[0-9a-f-]{36}$/);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
  });

  test('si ya viene una sesión, se conserva', async () => {
    const response = await post({ puzzle: PUZZLE, patternKey: detection.patternKey }, 'sid=mia');
    expect(sessionOf(response)).toBe('mia');
  });
});
