/**
 * Ordem de resolução de `resolveTechnique`: id → name → code.
 *
 * Auditoria 2026-11-14: tentar `code` antes de `name` erra a técnica. O mapa de
 * `useFilteredTechniques` é chaveado por `tecnica_nome` (uma entrada por nome e
 * por produto), enquanto `codigo_tabela` é COMPARTILHADO pelas variações da
 * mesma técnica (`variacao_label`) — casar por código devolve uma variação
 * qualquer no lugar da que o vendedor escolheu.
 */
import { describe, it, expect } from 'vitest';
import { resolveTechnique } from '@/hooks/mockup/useMockupTechniques';

const LISTA = [
  { id: 'tec-1', name: 'Serigrafia 1 cor', code: 'SILK' },
  { id: 'tec-2', name: 'Serigrafia 2 cores', code: 'SILK' },
  { id: 'tec-3', name: 'Laser', code: 'LASER' },
];

describe('resolveTechnique', () => {
  it('o id vence quando existe na lista', () => {
    expect(resolveTechnique(LISTA, { id: 'tec-2', name: 'Laser', code: 'LASER' })?.id).toBe(
      'tec-2',
    );
  });

  it('id de outro espaço: resolve pelo NOME, não pelo código compartilhado', () => {
    const resolvida = resolveTechnique(LISTA, {
      id: 'id-de-outro-espaco',
      name: 'Serigrafia 2 cores',
      code: 'SILK',
    });
    expect(resolvida?.id).toBe('tec-2');
  });

  it('nome que não existe mais na lista: cai para o código', () => {
    const resolvida = resolveTechnique(LISTA, { name: 'Serigrafia 3 cores', code: 'LASER' });
    expect(resolvida?.id).toBe('tec-3');
  });

  it('nada bate: devolve null', () => {
    expect(resolveTechnique(LISTA, { id: 'x', name: 'Bordado', code: 'EMB' })).toBeNull();
    expect(resolveTechnique(LISTA, {})).toBeNull();
  });
});
