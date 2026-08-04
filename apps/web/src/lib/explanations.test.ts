/**
 * Lo que hay que comprobar aquí no es lo que responde Claude —eso no es
 * testeable— sino lo que le mandamos y lo que hacemos cuando falla.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { detectNext, generate } from 'engine';

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
    const prompt = userPrompt(detection);

    expect(prompt).toContain(detection.technique);
    for (const cell of detection.cells) expect(prompt).toContain(cell);
    // El tablero son 81 caracteres de dígitos y puntos: si algo así aparece,
    // le estamos dando al modelo material para "resolver" por su cuenta.
    expect(prompt).not.toMatch(/[1-9.]{20,}/);
  });

  test('el sistema prohíbe resolver y fija la notación', () => {
    expect(SYSTEM_PROMPT).toContain('Never solve the puzzle');
    expect(SYSTEM_PROMPT).toContain('R#C#');
  });
});

describe('writeExplanation', () => {
  test('devuelve el texto que redacta el modelo', async () => {
    create.mockResolvedValue({ content: [{ type: 'text', text: 'Solo cabe el 4 en R2C4.' }] });

    const explanation = await writeExplanation(detection);

    expect(explanation).toEqual({ technique: detection.technique, text: 'Solo cabe el 4 en R2C4.' });
    expect(create).toHaveBeenCalledOnce();
  });

  test('sin clave no llama a la API y cae al texto de la técnica', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    expect(await writeExplanation(detection)).toEqual({
      technique: detection.technique,
      text: FALLBACK,
    });
    expect(create).not.toHaveBeenCalled();
  });

  test('si la API falla, la partida sigue con el texto de la técnica', async () => {
    create.mockRejectedValue(new Error('overloaded'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await writeExplanation(detection)).toEqual({
      technique: detection.technique,
      text: FALLBACK,
    });
  });

  test('una respuesta vacía también cae al texto de la técnica', async () => {
    create.mockResolvedValue({ content: [] });

    expect(await writeExplanation(detection)).toEqual({
      technique: detection.technique,
      text: FALLBACK,
    });
  });
});
