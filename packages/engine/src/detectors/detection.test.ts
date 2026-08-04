import { describe, expect, it } from 'vitest';
import { requireRef } from '../notation';
import { createDetection } from './detection';

/** Atajo para escribir los tests en R#C# y no en índices planos. */
const at = requireRef;

describe('createDetection', () => {
  it('expone las celdas del patrón en R#C# y ordenadas', () => {
    const detection = createDetection({
      technique: 'naked-pair',
      cells: [at('R3C7'), at('R1C2')],
      digits: [4, 9],
      eliminations: [{ cell: at('R5C2'), digit: 4 }],
    });

    expect(detection.cells).toEqual(['R1C2', 'R3C7']);
  });

  it('deduplica celdas y candidatos, y ordena los dígitos', () => {
    const detection = createDetection({
      technique: 'naked-pair',
      cells: [at('R1C2'), at('R1C2')],
      digits: [9, 4, 9],
      eliminations: [{ cell: at('R5C2'), digit: 4 }],
    });

    expect(detection.cells).toEqual(['R1C2']);
    expect(detection.digits).toEqual([4, 9]);
  });

  it('ordena y deduplica las consecuencias por celda y dígito', () => {
    const detection = createDetection({
      technique: 'pointing-pair',
      cells: [at('R1C1')],
      digits: [7],
      eliminations: [
        { cell: at('R9C1'), digit: 7 },
        { cell: at('R4C1'), digit: 7 },
        { cell: at('R9C1'), digit: 7 },
        { cell: at('R4C1'), digit: 3 },
      ],
    });

    expect(detection.eliminations).toEqual([
      { cell: 'R4C1', digit: 3 },
      { cell: 'R4C1', digit: 7 },
      { cell: 'R9C1', digit: 7 },
    ]);
  });

  it('rechaza un patrón sin celdas', () => {
    expect(() =>
      createDetection({
        technique: 'naked-single',
        cells: [],
        digits: [5],
        placements: [{ cell: at('R1C1'), digit: 5 }],
      }),
    ).toThrow(/sin celdas/);
  });

  it('rechaza una detección que no concluye nada', () => {
    expect(() =>
      createDetection({
        technique: 'naked-single',
        cells: [at('R1C1')],
        digits: [5],
      }),
    ).toThrow(/no coloca ni elimina/);
  });

  it('devuelve una detección inmutable', () => {
    const detection = createDetection({
      technique: 'naked-single',
      cells: [at('R1C1')],
      digits: [5],
      placements: [{ cell: at('R1C1'), digit: 5 }],
    });

    expect(Object.isFrozen(detection)).toBe(true);
    expect(Object.isFrozen(detection.cells)).toBe(true);
    expect(Object.isFrozen(detection.placements[0])).toBe(true);
  });
});

describe('patternKey', () => {
  const base = {
    technique: 'naked-pair',
    cells: [at('R1C2'), at('R3C2')],
    digits: [4, 9],
    eliminations: [{ cell: at('R5C2'), digit: 4 }],
  } as const;

  it('es la misma aunque las entradas vengan en otro orden', () => {
    const one = createDetection(base);
    const other = createDetection({
      technique: 'naked-pair',
      cells: [at('R3C2'), at('R1C2')],
      digits: [9, 4],
      eliminations: [{ cell: at('R5C2'), digit: 4 }],
    });

    expect(other.patternKey).toBe(one.patternKey);
  });

  it('cambia si cambia la técnica', () => {
    const other = createDetection({ ...base, technique: 'naked-single' });
    expect(other.patternKey).not.toBe(createDetection(base).patternKey);
  });

  it('cambia si cambia una celda del patrón', () => {
    const other = createDetection({ ...base, cells: [at('R1C2'), at('R4C2')] });
    expect(other.patternKey).not.toBe(createDetection(base).patternKey);
  });

  it('cambia si cambian los candidatos implicados', () => {
    const other = createDetection({ ...base, digits: [4, 8] });
    expect(other.patternKey).not.toBe(createDetection(base).patternKey);
  });

  it('cambia si el mismo patrón elimina candidatos distintos', () => {
    const other = createDetection({
      ...base,
      eliminations: [{ cell: at('R7C2'), digit: 4 }],
    });
    expect(other.patternKey).not.toBe(createDetection(base).patternKey);
  });

  it('distingue colocar de eliminar el mismo dígito en la misma celda', () => {
    const placed = createDetection({
      technique: 'naked-single',
      cells: [at('R1C1')],
      digits: [5],
      placements: [{ cell: at('R1C1'), digit: 5 }],
    });
    const eliminated = createDetection({
      technique: 'naked-single',
      cells: [at('R1C1')],
      digits: [5],
      eliminations: [{ cell: at('R1C1'), digit: 5 }],
    });

    expect(placed.patternKey).not.toBe(eliminated.patternKey);
  });

  it('nombra las celdas en R#C#, que es lo que verá el prompt del LLM', () => {
    expect(createDetection(base).patternKey).toContain('cells=R1C2,R3C2');
  });
});
