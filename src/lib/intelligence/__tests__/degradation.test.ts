/**
 * Cobertura do SSOT de degradação parcial.
 * Invariante central: erro ESTRUTURAL degrada (fallback), erro TRANSITÓRIO propaga.
 */
import { describe, expect, it, vi } from 'vitest';
import { classifyDegradable, degradeOrThrow } from '@/lib/intelligence/degradation';

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe('classifyDegradable', () => {
  it.each([
    [{ code: '42501' }, 'permission_denied'],
    [{ code: '42P01' }, 'missing_relation'],
    [{ code: '42703' }, 'schema_mismatch'],
    [{ code: '42883' }, 'missing_relation'],
    [{ code: 'PGRST205' }, 'missing_relation'],
    [{ code: 'PGRST301' }, 'permission_denied'],
    [{ status: 403 }, 'permission_denied'],
    [{ status: 429 }, 'quota_exceeded'],
    [{ message: 'permission denied for table orders' }, 'permission_denied'],
    [{ message: 'relation "x" does not exist' }, 'missing_relation'],
    [{ message: 'Too Many Requests' }, 'quota_exceeded'],
  ])('classifica %j como degradável', (err, expected) => {
    expect(classifyDegradable(err)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    ['string'],
    [{}],
    [{ code: '08006' }],
    [{ status: 500 }],
    [new Error('Failed to fetch')],
    [{ message: 'network timeout' }],
  ])('propaga %j (não degradável)', (err) => {
    expect(classifyDegradable(err)).toBeNull();
  });
});

describe('degradeOrThrow', () => {
  it('retorna o fallback em erro estrutural', () => {
    expect(degradeOrThrow({ code: '42501' }, 'segments.orders', [])).toEqual([]);
    expect(degradeOrThrow({ code: '42P01' }, 'scope', { a: 1 })).toEqual({ a: 1 });
  });

  it('relança erro transitório para o retry do TanStack Query', () => {
    const err = new Error('Failed to fetch');
    expect(() => degradeOrThrow(err, 'scope', [])).toThrow(err);
  });

  it('nunca engole erro desconhecido — fuzz de 300 formas', () => {
    let thrown = 0;
    for (let i = 0; i < 300; i++) {
      const e = { code: `X${i}`, status: 500 + (i % 3), message: `boom ${i}` };
      try {
        degradeOrThrow(e, 'fuzz', null);
      } catch {
        thrown++;
      }
    }
    expect(thrown).toBe(300);
  });
});
