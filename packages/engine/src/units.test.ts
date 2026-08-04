import { describe, expect, it } from 'vitest';

import { BOARD_SIZE, UNIT_SIZE } from './types';
import { formatRefs, requireRef, toRef } from './notation';
import {
  ALL_UNITS,
  BOXES,
  COLUMNS,
  ROWS,
  arePeers,
  boxOf,
  colOf,
  peersOf,
  rowOf,
  unitsOf,
} from './units';

describe('unidades', () => {
  it('sitúa R1C1 en la fila, columna y caja 0', () => {
    const r1c1 = requireRef('R1C1');
    expect(rowOf(r1c1)).toBe(0);
    expect(colOf(r1c1)).toBe(0);
    expect(boxOf(r1c1)).toBe(0);
  });

  it('numera las cajas de izquierda a derecha y de arriba abajo', () => {
    expect(boxOf(requireRef('R1C9'))).toBe(2);
    expect(boxOf(requireRef('R4C4'))).toBe(4);
    expect(boxOf(requireRef('R9C1'))).toBe(6);
    expect(boxOf(requireRef('R9C9'))).toBe(8);
  });

  it('tiene 27 unidades de 9 celdas distintas cada una', () => {
    expect(ALL_UNITS).toHaveLength(27);
    for (const unit of ALL_UNITS) {
      expect(unit.cells).toHaveLength(UNIT_SIZE);
      expect(new Set(unit.cells).size).toBe(UNIT_SIZE);
    }
  });

  it('cubre el tablero entero con cada tipo de unidad', () => {
    for (const units of [ROWS, COLUMNS, BOXES]) {
      const covered = new Set(units.flatMap((unit) => [...unit.cells]));
      expect(covered.size).toBe(BOARD_SIZE);
    }
  });

  it('agrupa la primera caja en un bloque 3x3', () => {
    expect(BOXES[0].cells.map(toRef)).toEqual([
      'R1C1', 'R1C2', 'R1C3',
      'R2C1', 'R2C2', 'R2C3',
      'R3C1', 'R3C2', 'R3C3',
    ]);
  });

  it('da a cada celda su fila, su columna y su caja', () => {
    const r5c5 = requireRef('R5C5');
    expect(unitsOf(r5c5).map((unit) => `${unit.kind}${unit.index}`)).toEqual([
      'row4',
      'column4',
      'box4',
    ]);
    for (const unit of unitsOf(r5c5)) {
      expect(unit.cells).toContain(r5c5);
    }
  });

  it('da exactamente 20 peers por celda, sin incluirse a sí misma', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const peers = peersOf(index);
      expect(peers, toRef(index)).toHaveLength(20);
      expect(peers).not.toContain(index);
      expect(new Set(peers).size).toBe(20);
    }
  });

  it('cuenta los peers de R1C1: fila, columna y el resto de su caja', () => {
    expect(formatRefs(peersOf(requireRef('R1C1')))).toBe(
      'R1C2, R1C3, R1C4, R1C5, R1C6, R1C7, R1C8, R1C9, ' +
        'R2C1, R2C2, R2C3, R3C1, R3C2, R3C3, ' +
        'R4C1, R5C1, R6C1, R7C1, R8C1, R9C1',
    );
  });

  it('mantiene la relación de peers simétrica y coherente con arePeers', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      for (const peer of peersOf(index)) {
        expect(peersOf(peer)).toContain(index);
        expect(arePeers(index, peer)).toBe(true);
      }
    }
  });

  it('no considera peer a una celda de sí misma', () => {
    expect(arePeers(0, 0)).toBe(false);
    expect(arePeers(requireRef('R1C1'), requireRef('R5C5'))).toBe(false);
  });

  it('rechaza índices fuera del tablero', () => {
    expect(() => unitsOf(-1)).toThrow(RangeError);
    expect(() => peersOf(BOARD_SIZE)).toThrow(RangeError);
  });
});
