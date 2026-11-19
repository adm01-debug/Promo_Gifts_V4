/**
 * Contrato do Ctrl+K: toda rota declarada por um item precisa existir de verdade,
 * e os destinos não podem se repetir.
 *
 * Motivo: a paleta legada (recovery/src-legacy/src/components/command/
 * commandActions.tsx) tinha 22 ações; ao virar Spotlight, /novidades, /filtros e
 * /estoque ficaram para trás sem registro. Nada apontava o buraco porque este
 * módulo não tinha nenhum teste.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildSpotlightItems } from '../SpotlightItems';

function itens() {
  return buildSpotlightItems(vi.fn());
}

describe('buildSpotlightItems', () => {
  it('leva às três rotas que o Ctrl+K legado tinha e o Spotlight havia perdido', () => {
    const porPath = new Map(itens().map((i) => [i.path, i]));
    expect(porPath.get('/novidades')?.title).toBe('Novidades');
    expect(porPath.get('/filtros')?.title).toBe('Filtros Avançados');
    expect(porPath.get('/estoque')?.title).toBe('Estoque');
  });

  it('navega para o path declarado — action e path não podem divergir', () => {
    const navigate = vi.fn();
    for (const item of buildSpotlightItems(navigate)) {
      if (!item.path) continue;
      navigate.mockClear();
      item.action();
      expect(navigate, `item ${item.id}`).toHaveBeenCalledWith(item.path);
    }
  });

  it('não repete id, nem destino dentro da navegação', () => {
    const lista = itens();
    const ids = lista.map((i) => i.id);
    expect(new Set(ids).size, 'ids duplicados').toBe(ids.length);
    // `isQuickAction` pode repetir o destino de propósito: 'mockup-quick' é o
    // atalho no topo e 'mockup' é a entrada de navegação, ambos /mockup-generator.
    const paths = lista
      .filter((i) => !i.isQuickAction)
      .map((i) => i.path)
      .filter((p): p is string => Boolean(p));
    expect(new Set(paths).size, 'destinos duplicados').toBe(paths.length);
  });

  it('todo item tem título e categoria para a paleta agrupar', () => {
    for (const item of itens()) {
      expect(item.title.trim().length, `item ${item.id}`).toBeGreaterThan(0);
      expect(item.category.trim().length, `item ${item.id}`).toBeGreaterThan(0);
    }
  });
});
