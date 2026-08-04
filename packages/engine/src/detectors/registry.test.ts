import { describe, expect, it } from 'vitest';
import { emptyBoard, fromString } from '../board';
import { CLASSIC } from '../fixtures/puzzles';
import { BOARD_SIZE, type Board, type Digit } from '../types';
import { createDetection } from './detection';
import { DETECTORS, detectAll, detectNext } from './registry';
import { TECHNIQUES, rankOf, type Detector, type TechniqueId } from './types';

/**
 * Detector de mentira: coloca un dígito fijo en la primera celda vacía.
 * No es una técnica —no demuestra nada—, y ese es justo el punto: prueba el
 * registry en aislamiento, sin depender de qué encuentren los detectores
 * reales en un tablero concreto.
 */
function dummyDetector(technique: TechniqueId, digit: Digit): Detector {
  return {
    technique,
    find(board: Board) {
      const cell = board.cells.findIndex((current) => current.value === null);
      if (cell === -1) return [];
      return [
        createDetection({
          technique,
          cells: [cell],
          digits: [digit],
          placements: [{ cell, digit }],
        }),
      ];
    },
  };
}

/** Detector que nunca encuentra nada, para probar que el registry sigue buscando. */
const silentDetector: Detector = {
  technique: 'naked-single',
  find: () => [],
};

describe('TECHNIQUES', () => {
  it('ordena las técnicas de la más simple a la más avanzada', () => {
    expect(rankOf('naked-single')).toBeLessThan(rankOf('hidden-single'));
    expect(rankOf('hidden-single')).toBeLessThan(rankOf('naked-pair'));
    expect(rankOf('naked-pair')).toBeLessThan(rankOf('pointing-pair'));
  });

  it('no repite técnicas', () => {
    expect(new Set(TECHNIQUES).size).toBe(TECHNIQUES.length);
  });
});

describe('detectNext', () => {
  it('acepta un detector que cumple la interfaz y devuelve su detección', () => {
    const detection = detectNext(fromString(CLASSIC), [dummyDetector('naked-single', 4)]);

    expect(detection?.technique).toBe('naked-single');
    expect(detection?.cells).toEqual(['R1C3']);
    expect(detection?.placements).toEqual([{ cell: 'R1C3', digit: 4 }]);
  });

  it('devuelve la técnica más simple aunque los detectores lleguen desordenados', () => {
    const detection = detectNext(emptyBoard(), [
      dummyDetector('pointing-pair', 1),
      dummyDetector('naked-single', 2),
      dummyDetector('naked-pair', 3),
    ]);

    expect(detection?.technique).toBe('naked-single');
  });

  it('sigue buscando cuando un detector no encuentra nada', () => {
    const detection = detectNext(emptyBoard(), [
      silentDetector,
      dummyDetector('hidden-single', 6),
    ]);

    expect(detection?.technique).toBe('hidden-single');
  });

  it('devuelve null si ningún detector encuentra nada', () => {
    expect(detectNext(emptyBoard(), [silentDetector])).toBeNull();
  });

  it('usa los detectores registrados si no se le pasan otros', () => {
    const detection = detectNext(fromString(CLASSIC));

    expect(detection?.technique).toBe('naked-single');
  });

  it('no muta el array de detectores que recibe', () => {
    const detectors = [dummyDetector('pointing-pair', 1), dummyDetector('naked-single', 2)];
    detectNext(emptyBoard(), detectors);

    expect(detectors.map((detector) => detector.technique)).toEqual([
      'pointing-pair',
      'naked-single',
    ]);
  });
});

describe('detectAll', () => {
  it('concatena las detecciones en orden de dificultad', () => {
    const detections = detectAll(emptyBoard(), [
      dummyDetector('naked-pair', 3),
      dummyDetector('naked-single', 2),
    ]);

    expect(detections.map((detection) => detection.technique)).toEqual([
      'naked-single',
      'naked-pair',
    ]);
  });

  it('devuelve vacío sobre un tablero sin celdas libres', () => {
    const full = fromString('1'.repeat(BOARD_SIZE));
    expect(detectAll(full, [dummyDetector('naked-single', 1)])).toEqual([]);
  });
});

describe('DETECTORS', () => {
  it('registra técnicas conocidas y sin repetir', () => {
    const registered = DETECTORS.map((detector) => detector.technique);

    expect(new Set(registered).size).toBe(registered.length);
    expect(registered.every((technique) => TECHNIQUES.includes(technique))).toBe(true);
  });
});

