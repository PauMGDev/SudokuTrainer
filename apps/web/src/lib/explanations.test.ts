/**
 * Lo que hay que comprobar aquí no es lo que responde Claude —eso no es
 * testeable— sino lo que le mandamos y lo que hacemos cuando falla.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { detectNext, explainData, generate } from 'engine';

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

const { writeExplanation } = await import('./explanations');

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

  test('lleva las pruebas, no solo la conclusión', () => {
    const prompt: unknown = JSON.parse(userPrompt(data));

    // Un naked single sin los dígitos que lo demuestran es un "porque sí": lo
    // que enseña la explicación es justo esa lista.
    expect(data.technique).toBe('naked-single');
    expect(prompt).toMatchObject({
      technique: 'naked-single',
      cell: data.technique === 'naked-single' ? data.cell : '',
      eliminatedBy: { row: expect.any(Array), col: expect.any(Array), box: expect.any(Array) },
    });
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
