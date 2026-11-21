/**
 * KMM-075 / KMX-037 — classificação de status da biblioteca de kits.
 *
 * Decisão D7 (PO, 2026-11-21): o app nunca grava `published`/`shared`
 * (`getPersistedKitStatus` só devolve `draft`/`ready`; medido em produção:
 * 21 'draft' + 1 'ready', zero 'published'/'shared'). O selo "Publicado" só
 * pode aparecer para status realmente publicados; `ready` é "Pronto", nunca
 * "Publicado" — senão o vendedor acha que o cliente já viu o kit.
 */
import { describe, expect, it } from 'vitest';

import { getKitStatusBadge } from '../persistence';

describe('getKitStatusBadge (KMM-075 / KMX-037)', () => {
  it('mapeia os status reais do app', () => {
    expect(getKitStatusBadge('draft')).toBe('Rascunho');
    expect(getKitStatusBadge('ready')).toBe('Pronto');
    expect(getKitStatusBadge('archived')).toBe('Arquivado');
  });

  it('ready nunca é "Publicado" (regra D7)', () => {
    expect(getKitStatusBadge('ready')).not.toBe('Publicado');
  });

  it('só status realmente publicados recebem o selo "Publicado"', () => {
    expect(getKitStatusBadge('published')).toBe('Publicado');
    expect(getKitStatusBadge('shared')).toBe('Publicado');
  });
});
