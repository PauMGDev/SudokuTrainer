/**
 * Lo que hay que comprobar aquí no es lo que responde Claude —eso no es
 * testeable— sino lo que le mandamos y lo que hacemos cuando falla.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { detectAll, detectNext, explainData, generate } from 'engine';

import { copy } from '../copy';
import { SYSTEM_PROMPT, userPrompt } from './prompt';

const create = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));

// `db` cuelga del cliente de Prisma y del adaptador: el módulo bajo prueba lo
// importa aunque estos tests no toquen la caché.
vi.mock('./db', () => ({ db: () => ({}) }));

const { findExplanation, saveExplanation, writeExplanation } = await import('./explanations');

const { puzzle } = generate({ seed: 0, difficulty: 'easy' });
const detection = detectNext(puzzle);
if (detection === null) throw new Error('el fixture debería tener alguna detección');

/** Lo que de verdad viaja al modelo desde 6.x: el material pedagógico. */
const data = explainData(puzzle, detection);

const FALLBACK = copy.explanation.techniques[detection.technique].body;

beforeEach(() => {
  create.mockReset();
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-de-mentira');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('prompt', () => {
  test('lleva la detección y NO lleva el tablero', () => {
    const prompt = userPrompt(data);

    expect(prompt).toContain(detection.technique);
    for (const cell of detection.cells) expect(prompt).toContain(cell);
    // El tablero son 81 caracteres de dígitos y puntos: si algo así aparece,
    // le estamos dando al modelo material para "resolver" por su cuenta.
    expect(prompt).not.toMatch(/[1-9.]{20,}/);
  });

  test('las unidades viajan como frase, no como coordenadas', () => {
    const hidden = detectAll(puzzle).find((d) => d.technique === 'hidden-single');
    if (hidden === undefined) throw new Error('el fixture debería tener un hidden single');
    const prompt: unknown = JSON.parse(userPrompt(explainData(puzzle, hidden)));

    // El bug que esto cierra: el modelo se inventaba la geometría del bloqueo.
    // Ahora la relación viene escrita y en la forma en que hay que decirla.
    expect(prompt).toMatchObject({ unit: expect.stringMatching(/^(row|column|box) [1-9]$/) });
    const blocked = (prompt as { blockedCells: { blockedBy: Record<string, unknown> }[] })
      .blockedCells;
    const peers = blocked.filter((entry) => entry.blockedBy['reason'] === 'peer');
    expect(peers.length).toBeGreaterThan(0);
    for (const entry of peers) {
      expect(entry.blockedBy['via']).toMatch(/^(row|column|box) [1-9]$/);
    }
  });

  test('lleva las pruebas, no solo la conclusión', () => {
    const prompt: unknown = JSON.parse(userPrompt(data));

    // Un naked single sin los dígitos que lo demuestran es un "porque sí": lo
    // que enseña la explicación es justo esa lista.
    expect(data.technique).toBe('naked-single');
    expect(prompt).toMatchObject({
      technique: 'naked-single',
      cell: data.technique === 'naked-single' ? data.cell : '',
      eliminatedBy: expect.any(Array),
    });

    // Y cada dígito descartado viene con su testigo y su relación: el bug de la
    // v3 era exactamente esto — dígitos sueltos que el modelo ubicaba a ojo.
    const { eliminatedBy } = prompt as { eliminatedBy: Record<string, unknown>[] };
    expect(eliminatedBy.length).toBe(8);
    for (const evidence of eliminatedBy) {
      expect(evidence['at']).toMatch(/^R[1-9]C[1-9]$/);
      expect(evidence['via']).toMatch(/^(row|column|box) [1-9]$/);
    }
  });

  test('el sistema prohíbe resolver y fija la notación', () => {
    expect(SYSTEM_PROMPT).toContain('Never solve the puzzle');
    expect(SYSTEM_PROMPT).toContain('R#C#');
  });
});

describe('writeExplanation', () => {
  test('devuelve el texto que redacta el modelo', async () => {
    create.mockResolvedValue({ content: [{ type: 'text', text: 'Solo cabe el 4 en R2C4.' }] });

    const explanation = await writeExplanation(data);

    expect(explanation).toEqual({ technique: detection.technique, text: 'Solo cabe el 4 en R2C4.' });
    expect(create).toHaveBeenCalledOnce();
  });

  test('sin clave no llama a la API y cae al texto de la técnica', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    expect(await writeExplanation(data)).toEqual({
      technique: detection.technique,
      text: FALLBACK,
    });
    expect(create).not.toHaveBeenCalled();
  });

  test('si la API falla, la partida sigue con el texto de la técnica', async () => {
    create.mockRejectedValue(new Error('overloaded'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await writeExplanation(data)).toEqual({
      technique: detection.technique,
      text: FALLBACK,
    });
  });

  test('una respuesta vacía también cae al texto de la técnica', async () => {
    create.mockResolvedValue({ content: [] });

    expect(await writeExplanation(data)).toEqual({
      technique: detection.technique,
      text: FALLBACK,
    });
  });
});

describe('caché con la base de datos caída', () => {
  // El mock de `./db` devuelve un objeto vacío: cualquier consulta revienta,
  // que es justo lo que pasa cuando Postgres no responde.
  test('leer la caché devuelve null en vez de propagar el error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await findExplanation('lo que sea')).toBeNull();
  });

  test('guardar en caché no rompe la respuesta ya redactada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(saveExplanation('clave', { technique: 'naked-single', text: 'x' })).resolves
      .toBeUndefined();
  });
});
