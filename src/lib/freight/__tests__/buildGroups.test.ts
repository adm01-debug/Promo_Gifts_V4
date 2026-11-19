/**
 * buildGroups.test.ts — quem divide caixa com quem.
 */
import { describe, expect, it } from 'vitest';

import { buildGroups } from '../buildGroups';
import { caderneta, pecaDeTeste, squeeze } from './fixtures/items';

describe('buildGroups', () => {
  it('misturar: dois produtos viram um grupo', () => {
    const grupos = buildGroups([caderneta(10), squeeze(5)], 'misturar');

    expect(grupos).toHaveLength(1);
    expect(grupos[0].reason).toBe('mixed');
    expect(grupos[0].items.map((i) => i.productId)).toEqual(['caderneta', 'squeeze']);
  });

  it('separar: dois produtos viram dois grupos', () => {
    const grupos = buildGroups([caderneta(10), squeeze(5)], 'separar');

    expect(grupos).toHaveLength(2);
    expect(grupos.map((g) => g.reason)).toEqual(['single_product', 'single_product']);
    expect(grupos.map((g) => g.items[0].productId)).toEqual(['caderneta', 'squeeze']);
  });

  it('o "não mistura" do cadastro vence a escolha do vendedor', () => {
    // A é ships_separately; B e C não. Em "misturar" dá 2 grupos: A sozinho e
    // {B, C} juntos — o cadastro não é negociável pela tela.
    const a = pecaDeTeste('a', [10, 10, 10], 100, 3, { shipsSeparately: true });
    const b = pecaDeTeste('b', [5, 5, 5], 50, 4);
    const c = pecaDeTeste('c', [6, 6, 6], 60, 5);

    const grupos = buildGroups([a, b, c], 'misturar');

    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toMatchObject({ reason: 'ships_separately' });
    expect(grupos[0].items.map((i) => i.productId)).toEqual(['a']);
    expect(grupos[1]).toMatchObject({ reason: 'mixed' });
    expect(grupos[1].items.map((i) => i.productId)).toEqual(['b', 'c']);
  });

  it('dois produtos "não mistura" ganham um grupo cada', () => {
    const a = pecaDeTeste('a', [10, 10, 10], 100, 1, { shipsSeparately: true });
    const b = pecaDeTeste('b', [10, 10, 10], 100, 1, { shipsSeparately: true });

    const grupos = buildGroups([a, b], 'misturar');

    expect(grupos).toHaveLength(2);
    expect(grupos.every((g) => g.reason === 'ships_separately')).toBe(true);
  });

  it('ordem é estável por productId, não pela ordem de entrada', () => {
    const entrada = [squeeze(1), caderneta(1)];
    const invertida = [caderneta(1), squeeze(1)];

    const a = buildGroups(entrada, 'separar').map((g) => g.items[0].productId);
    const b = buildGroups(invertida, 'separar').map((g) => g.items[0].productId);

    expect(a).toEqual(b);
    expect(a).toEqual(['caderneta', 'squeeze']);
  });

  it('duas linhas do mesmo produto não desestabilizam a ordem', () => {
    // acontece de verdade: o mesmo produto em duas cores é duas linhas com o
    // mesmo productId. O comparador tem de devolver 0 e manter a ordem.
    const grupos = buildGroups([caderneta(5), caderneta(3), squeeze(1)], 'separar');

    expect(grupos.map((g) => g.items[0].productId)).toEqual(['caderneta', 'caderneta', 'squeeze']);
    expect(grupos.map((g) => g.items[0].quantity)).toEqual([5, 3, 1]);
  });

  it('lista vazia não gera grupo', () => {
    expect(buildGroups([], 'misturar')).toEqual([]);
    expect(buildGroups([], 'separar')).toEqual([]);
  });
});
