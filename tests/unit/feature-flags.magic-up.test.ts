/**
 * Unit tests for src/lib/feature-flags.ts — flag `magic_up`.
 *
 * G-3: a descrição da flag `magic_up` deve corresponder ao módulo certo
 * (Magic Up = geração de criativos com IA), não ao módulo Mockup.
 */
import { describe, it, expect } from 'vitest';
import { getFlagRegistry } from '@/lib/feature-flags';

describe('feature-flags — magic_up', () => {
  it('descreve a flag como geração de criativos com IA (Magic Up)', () => {
    expect(getFlagRegistry().magic_up.description).toBe(
      'Geração de criativos com IA (Magic Up)'
    );
  });

  it('não descreve mais a flag como geração de mockups', () => {
    expect(getFlagRegistry().magic_up.description).not.toContain('mockup');
  });

  it('mantém o valor enabled da flag inalterado (true)', () => {
    expect(getFlagRegistry().magic_up.enabled).toBe(true);
  });

  it('é a única flag cuja descrição menciona Magic Up (nenhum outro valor mudou)', () => {
    const registry = getFlagRegistry();
    const comMagicUp = (Object.keys(registry) as Array<keyof typeof registry>).filter(
      (flag) => registry[flag].description.includes('Magic Up')
    );
    expect(comMagicUp).toEqual(['magic_up']);
  });
});
