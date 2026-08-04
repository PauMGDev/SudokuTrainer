import { describe, expect, it } from 'vitest';

import { BOARD_SIZE } from './types';
import { formatRefs, isCellRef, parseRef, requireRef, toIndex, toRef } from './notation';

describe('notación R#C#', () => {
  it('ancla R1C1 en el índice 0 y R9C9 en el 80', () => {
    expect(toRef(0)).toBe('R1C1');
    expect(toRef(80)).toBe('R9C9');
    expect(parseRef('R1C1')).toBe(0);
    expect(parseRef('R9C9')).toBe(80);
  });

  it('recorre el tablero en orden fila mayor', () => {
    // La celda 8 cierra la primera fila; la 9 abre la segunda.
    expect(toRef(8)).toBe('R1C9');
    expect(toRef(9)).toBe('R2C1');
  });

  it('hace ida y vuelta en las 81 celdas', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      expect(parseRef(toRef(index))).toBe(index);
    }
  });

  it('rechaza referencias fuera de rango o mal formadas', () => {
    for (const invalid of ['R0C1', 'R1C0', 'R1C10', 'R10C1', 'X1Y2', 'r1c1', 'R1C', '', 'R1C1 ']) {
      expect(parseRef(invalid), invalid).toBeNull();
      expect(isCellRef(invalid), invalid).toBe(false);
    }
  });

  it('reconoce las referencias válidas', () => {
    expect(isCellRef('R5C5')).toBe(true);
    expect(isCellRef(5)).toBe(false);
  });

  it('lanza en vez de devolver null cuando se usa requireRef', () => {
    expect(requireRef('R3C7')).toBe(toIndex(2, 6));
    expect(() => requireRef('R0C0')).toThrow(SyntaxError);
  });

  it('rechaza índices fuera del tablero', () => {
    expect(() => toRef(-1)).toThrow(RangeError);
    expect(() => toRef(BOARD_SIZE)).toThrow(RangeError);
    expect(() => toRef(1.5)).toThrow(RangeError);
  });

  it('formatea listas de celdas de forma legible', () => {
    expect(formatRefs([0, 1, 9])).toBe('R1C1, R1C2, R2C1');
    expect(formatRefs([])).toBe('');
  });
});
