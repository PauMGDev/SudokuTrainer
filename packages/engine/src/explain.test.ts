import { describe, expect, it } from 'vitest';
import { fromString } from './board';
import { createDetection } from './detectors/detection';
import { findHiddenSingles } from './detectors/hidden-single';
import { findNakedPairs } from './detectors/naked-pair';
import { findNakedSingles } from './detectors/naked-single';
import { findPointingPairs } from './detectors/pointing-pair';
import { explainData } from './explain';
import { CLASSIC, NAKED_PAIR, POINTING_PAIR } from './fixtures/puzzles';
import { generate } from './generator';
import { requireRef } from './notation';
import { DIGITS } from './types';

describe('explainData', () => {
  it('el fixture del pointing pair es el tablero que dice ser', () => {
    expect(fromString(POINTING_PAIR)).toEqual(generate({ seed: 0, difficulty: 'hard' }).puzzle);
  });

  it('naked single: lista los dígitos colocados en fila, columna y caja', () => {
    const board = fromString(CLASSIC);
    // El primero de CLASSIC: a R5C5 solo le cabe el 5.
    const detection = findNakedSingles(board)[0];

    expect(explainData(board, detection)).toEqual({
      technique: 'naked-single',
      cell: 'R5C5',
      place: 5,
      eliminatedBy: {
        row: [1, 3, 4, 8],
        col: [1, 2, 6, 7, 8, 9],
        // El 8 sale en la fila y en la caja, y se lista en las dos: es el mismo
        // argumento visto desde dos ángulos.
        box: [2, 3, 6, 8],
      },
    });
  });

  it('naked single: la unión de las tres unidades son siempre los ocho dígitos restantes', () => {
    const board = fromString(CLASSIC);
    const detections = findNakedSingles(board);
    expect(detections.length).toBeGreaterThan(0);

    for (const detection of detections) {
      const data = explainData(board, detection);
      if (data.technique !== 'naked-single') throw new Error(`Esperaba naked-single: ${data.technique}`);

      const union = new Set([...data.eliminatedBy.row, ...data.eliminatedBy.col, ...data.eliminatedBy.box]);
      expect([...union].sort((a, b) => a - b)).toEqual(DIGITS.filter((digit) => digit !== data.place));
    }
  });

  it('naked single: una detección incoherente con el tablero lanza', () => {
    // R1C3 admite varios dígitos en CLASSIC, así que "ahí va el 1" no está
    // demostrado por lo que hay colocado: sería un bug del detector.
    const corrupt = createDetection({
      technique: 'naked-single',
      cells: [requireRef('R1C3')],
      digits: [1],
      placements: [{ cell: requireRef('R1C3'), digit: 1 }],
    });

    expect(() => explainData(fromString(CLASSIC), corrupt)).toThrow(/incoherente/);
  });

  it('hidden single: da la unidad y por qué el dígito no cabe en las otras ocho celdas', () => {
    const board = fromString(CLASSIC);
    // El primero de CLASSIC: en la fila 3 el 5 solo cabe en R3C7.
    const detection = findHiddenSingles(board)[0];

    expect(explainData(board, detection)).toEqual({
      technique: 'hidden-single',
      digit: 5,
      unit: { kind: 'row', index: 3 },
      cell: 'R3C7',
      // Los tres cincos de CLASSIC están en R1C1, R2C6 y R8C9, y cada hueco de
      // la fila 3 cae bajo uno de ellos. La vía va escrita a mano: es el hecho
      // que el engine tiene que dar, no algo que se derive de su propia salida.
      blockedCells: [
        // R1C1 comparte columna 1 y caja 1 con R3C1: gana la línea.
        { cell: 'R3C1', blockedBy: { reason: 'peer', digit: 5, at: 'R1C1', via: { kind: 'column', index: 1 } } },
        { cell: 'R3C2', blockedBy: { reason: 'occupied', digit: 9 } },
        { cell: 'R3C3', blockedBy: { reason: 'occupied', digit: 8 } },
        // R2C6 está en la caja 2 (filas 1-3 x columnas 4-6) igual que R3C4 y
        // R3C5, pero ni en su fila ni en su columna: solo queda la caja.
        { cell: 'R3C4', blockedBy: { reason: 'peer', digit: 5, at: 'R2C6', via: { kind: 'box', index: 2 } } },
        { cell: 'R3C5', blockedBy: { reason: 'peer', digit: 5, at: 'R2C6', via: { kind: 'box', index: 2 } } },
        // R3C6 sí está en la columna de R2C6, además de en su caja: gana la línea.
        { cell: 'R3C6', blockedBy: { reason: 'peer', digit: 5, at: 'R2C6', via: { kind: 'column', index: 6 } } },
        { cell: 'R3C8', blockedBy: { reason: 'occupied', digit: 6 } },
        // R8C9 está en la caja 9 y R3C9 en la 3: solo comparten la columna.
        { cell: 'R3C9', blockedBy: { reason: 'peer', digit: 5, at: 'R8C9', via: { kind: 'column', index: 9 } } },
      ],
    });
  });

  it('hidden single: si el bloqueador comparte línea y caja, la vía es la línea', () => {
    const board = fromString(CLASSIC);
    const data = explainData(board, findHiddenSingles(board)[0]);
    if (data.technique !== 'hidden-single') throw new Error(`Esperaba hidden-single: ${data.technique}`);

    // R3C6 y su bloqueador R2C6 se ven por dos unidades a la vez: la columna 6
    // y la caja 2. El desempate lo fija el engine y sale la columna.
    const blocked = data.blockedCells.find((entry) => entry.cell === 'R3C6');
    expect(blocked?.blockedBy).toEqual({
      reason: 'peer',
      digit: 5,
      at: 'R2C6',
      via: { kind: 'column', index: 6 },
    });
  });

  it('naked pair: reconstruye la unidad y agrupa las eliminaciones por celda', () => {
    const board = fromString(NAKED_PAIR);
    // El {7,9} de R8C1 y R9C1 se ve desde la columna y desde la caja.
    const [byColumn, byBox] = findNakedPairs(board);

    expect(explainData(board, byColumn)).toEqual({
      technique: 'naked-pair',
      pair: [7, 9],
      cells: ['R8C1', 'R9C1'],
      unit: { kind: 'column', index: 1 },
      eliminations: [
        { cell: 'R4C1', digits: [9] },
        { cell: 'R6C1', digits: [7, 9] },
      ],
    });

    expect(explainData(board, byBox)).toEqual({
      technique: 'naked-pair',
      pair: [7, 9],
      cells: ['R8C1', 'R9C1'],
      unit: { kind: 'box', index: 7 },
      eliminations: [
        { cell: 'R7C2', digits: [7] },
        { cell: 'R8C2', digits: [7, 9] },
        { cell: 'R9C3', digits: [9] },
      ],
    });
  });

  it('naked pair: una detección cuya unidad no se puede reconstruir lanza', () => {
    // R1C1 y R1C2 comparten fila y caja, pero ninguna de las dos llega a R9C9:
    // no hay unidad donde el argumento se sostenga.
    const corrupt = createDetection({
      technique: 'naked-pair',
      cells: [requireRef('R1C1'), requireRef('R1C2')],
      digits: [4, 9],
      eliminations: [{ cell: requireRef('R9C9'), digit: 4 }],
    });

    expect(() => explainData(fromString(NAKED_PAIR), corrupt)).toThrow(/sin unidad/);
  });

  it('pointing pair: da la caja del patrón y la línea que apunta', () => {
    const board = fromString(POINTING_PAIR);
    const [detection] = findPointingPairs(board);

    expect(explainData(board, detection)).toEqual({
      technique: 'pointing-pair',
      digit: 1,
      box: { kind: 'box', index: 6 },
      patternCells: ['R4C7', 'R4C9'],
      line: { kind: 'row', index: 4 },
      eliminations: [
        { cell: 'R4C4', digits: [1] },
        { cell: 'R4C6', digits: [1] },
      ],
    });
  });
});
