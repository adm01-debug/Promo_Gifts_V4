import { describe, it, expect } from 'vitest';
import {
  MAGAZINE_VALID_TRANSITIONS,
  isValidMagazineTransition,
  assertMagazineTransition,
  type MagazineStatus,
} from '@/lib/magazine-status-config';

/**
 * FE ⇄ DB transition-consistency guard para `magazines`.
 * A autoridade final são as RPCs `magazine_{publish,unpublish,archive,reactivate}_v2`
 * e o trigger canônico `tg_magazines_on_publish`; esta tabela substitui os
 * arrays `allowedStatuses` que viviam soltos no `useMagazineEditor`.
 */
const ALL: MagazineStatus[] = ['draft', 'published', 'archived'];

describe('magazine transitions — máquina de estados', () => {
  it('tabela de transições', () => {
    expect([...MAGAZINE_VALID_TRANSITIONS.draft]).toEqual(['published', 'archived']);
    expect([...MAGAZINE_VALID_TRANSITIONS.published]).toEqual(['draft', 'archived']);
    expect([...MAGAZINE_VALID_TRANSITIONS.archived]).toEqual(['draft']);
  });

  it('pares válidos explícitos (regressão)', () => {
    const ALLOWED: ReadonlyArray<[MagazineStatus, MagazineStatus]> = [
      ['draft', 'published'],
      ['draft', 'archived'],
      ['published', 'draft'],
      ['published', 'archived'],
      ['archived', 'draft'],
    ];
    for (const [from, to] of ALLOWED) {
      expect(isValidMagazineTransition(from, to), `${from}->${to}`).toBe(true);
    }
  });

  it('pares inválidos explícitos (regressão)', () => {
    const BLOCKED: ReadonlyArray<[MagazineStatus, MagazineStatus]> = [
      ['archived', 'published'],
      ['draft', 'draft'],
      ['published', 'published'],
      ['archived', 'archived'],
    ];
    for (const [from, to] of BLOCKED) {
      expect(isValidMagazineTransition(from, to), `${from}->${to}`).toBe(false);
    }
  });

  it('estrutural: sem self-loops; alvos são status reais', () => {
    for (const s of ALL) {
      const outs = MAGAZINE_VALID_TRANSITIONS[s] as readonly MagazineStatus[];
      expect(outs.includes(s), `${s} self-loop`).toBe(false);
      for (const t of outs) expect(ALL.includes(t), `${s}->${t} alvo desconhecido`).toBe(true);
    }
  });

  it('from-status desconhecido/lixo → false (sem throw)', () => {
    for (const g of ['NOPE', undefined, null, '', 'DRAFT', 'deleted']) {
      expect(isValidMagazineTransition(g as unknown as MagazineStatus, 'draft')).toBe(false);
    }
  });
});

describe('assertMagazineTransition', () => {
  it('não lança para transições válidas e no-op (from === to — republish idempotente)', () => {
    expect(() => assertMagazineTransition('draft', 'published')).not.toThrow();
    expect(() => assertMagazineTransition('published', 'published')).not.toThrow();
  });

  it('lança erro descritivo para transição inválida', () => {
    expect(() => assertMagazineTransition('archived', 'published')).toThrow(
      /Transição de status inválida/,
    );
  });
});
