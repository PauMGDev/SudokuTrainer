import { describe, expect, it } from 'vitest';

import { createRandom } from './random';

describe('createRandom', () => {
  it('da la misma secuencia para la misma semilla', () => {
    const take = (seed: number): number[] => {
      const random = createRandom(seed);
      return Array.from({ length: 10 }, () => random.next());
    };
    expect(take(42)).toEqual(take(42));
  });

  it('da secuencias distintas para semillas distintas', () => {
    expect(createRandom(1).next()).not.toBe(createRandom(2).next());
  });

  it('produce valores en [0, 1)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('produce enteros en [0, max)', () => {
    const random = createRandom(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) seen.add(random.nextInt(9));

    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThan(9);
    // Con 1000 tiradas sobre 9 valores, que falte alguno señalaría un PRNG roto.
    expect(seen.size).toBe(9);
  });

  it('rechaza topes que no sean enteros positivos', () => {
    const random = createRandom(1);
    expect(() => random.nextInt(0)).toThrow(RangeError);
    expect(() => random.nextInt(-1)).toThrow(RangeError);
    expect(() => random.nextInt(2.5)).toThrow(RangeError);
  });

  it('rechaza semillas no enteras', () => {
    expect(() => createRandom(1.5)).toThrow(TypeError);
  });

  it('baraja sin perder ni duplicar elementos', () => {
    const values = Array.from({ length: 20 }, (_unused, i) => i);
    const shuffled = createRandom(3).shuffle(values);

    expect([...shuffled].sort((a, b) => a - b)).toEqual(values);
    expect(shuffled).not.toEqual(values);
  });

  it('no muta el array que recibe', () => {
    const values = [1, 2, 3, 4, 5];
    createRandom(9).shuffle(values);
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  it('baraja igual con la misma semilla', () => {
    const values = Array.from({ length: 20 }, (_unused, i) => i);
    expect(createRandom(5).shuffle(values)).toEqual(createRandom(5).shuffle(values));
  });
});
