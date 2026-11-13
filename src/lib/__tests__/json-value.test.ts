import { describe, expect, it } from 'vitest';
import { serializeJsonValue } from '../json-value';
import type { Json } from '@/integrations/supabase/types';

const date = new Date('2026-01-02T03:04:05.000Z');
const cases: { name: string; input: unknown; expected: Json | undefined }[] = [
  { name: 'undefined root', input: undefined, expected: undefined },
  { name: 'null', input: null, expected: null },
  { name: 'string', input: 'value', expected: 'value' },
  { name: 'empty string', input: '', expected: '' },
  { name: 'unicode', input: 'ação ☕', expected: 'ação ☕' },
  { name: 'true', input: true, expected: true },
  { name: 'false', input: false, expected: false },
  { name: 'zero', input: 0, expected: 0 },
  { name: 'negative zero', input: -0, expected: 0 },
  { name: 'integer', input: 42, expected: 42 },
  { name: 'fraction', input: 1.5, expected: 1.5 },
  { name: 'NaN', input: NaN, expected: null },
  { name: 'positive infinity', input: Infinity, expected: null },
  { name: 'negative infinity', input: -Infinity, expected: null },
  { name: 'empty array', input: [], expected: [] },
  { name: 'primitive array', input: [1, 'two', true, null], expected: [1, 'two', true, null] },
  { name: 'array undefined', input: [undefined], expected: [null] },
  { name: 'array function', input: [() => 1], expected: [null] },
  { name: 'array symbol', input: [Symbol('x')], expected: [null] },
  { name: 'array holes', input: new Array(2), expected: [null, null] },
  { name: 'empty object', input: {}, expected: {} },
  {
    name: 'primitive properties',
    input: { value: 1, name: 'x' },
    expected: { value: 1, name: 'x' },
  },
  { name: 'omit undefined property', input: { omit: undefined, keep: 1 }, expected: { keep: 1 } },
  { name: 'omit function property', input: { omit: () => 1, keep: 1 }, expected: { keep: 1 } },
  { name: 'omit symbol property', input: { omit: Symbol('x'), keep: 1 }, expected: { keep: 1 } },
  {
    name: 'nested object',
    input: { metadata: { ids: ['a', 'b'], valid: true } },
    expected: { metadata: { ids: ['a', 'b'], valid: true } },
  },
  { name: 'date', input: date, expected: '2026-01-02T03:04:05.000Z' },
  { name: 'invalid date', input: new Date('invalid'), expected: null },
  {
    name: 'nested date',
    input: { savedAt: date },
    expected: { savedAt: '2026-01-02T03:04:05.000Z' },
  },
  {
    name: 'toJSON object',
    input: { toJSON: () => ({ serialized: true }) },
    expected: { serialized: true },
  },
  { name: 'toJSON scalar', input: { toJSON: () => 12 }, expected: 12 },
  { name: 'map follows native JSON', input: new Map([['a', 1]]), expected: {} },
  { name: 'set follows native JSON', input: new Set([1]), expected: {} },
  { name: 'regexp follows native JSON', input: /value/, expected: {} },
  { name: 'root function', input: () => 1, expected: undefined },
  { name: 'root symbol', input: Symbol('x'), expected: undefined },
];

describe('serializeJsonValue preserves the native JSON contract', () => {
  it.each(cases)('$name', ({ input, expected }) => {
    expect(serializeJsonValue(input)).toEqual(expected);
  });

  it('rejects a circular object', () => {
    const value: { self?: unknown } = {};
    value.self = value;
    expect(() => serializeJsonValue(value)).toThrow(TypeError);
  });

  it('rejects a circular array', () => {
    const value: unknown[] = [];
    value.push(value);
    expect(() => serializeJsonValue(value)).toThrow(TypeError);
  });

  it.each([BigInt(1), { nested: BigInt(1) }])('rejects unsupported BigInt %s', (value) => {
    expect(() => serializeJsonValue(value)).toThrow(TypeError);
  });

  it('preserves custom serialization failures', () => {
    const failure = new Error('serialization failed');
    expect(() =>
      serializeJsonValue({
        toJSON() {
          throw failure;
        },
      }),
    ).toThrow(failure);
  });

  it('does not reevaluate source getters while validating the serialized result', () => {
    let reads = 0;
    const value = {
      get once() {
        reads += 1;
        return 5;
      },
    };
    expect(serializeJsonValue(value)).toEqual({ once: 5 });
    expect(reads).toBe(1);
  });
});
