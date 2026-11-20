import { describe, expect, it } from 'vitest';

import { getLeadTimeSource } from '../leadTimeSource';

describe('getLeadTimeSource', () => {
  it.each([
    {
      caso: 'vazio com padrão do fornecedor → padrão',
      produto: null,
      padrao: 3,
      esperado: 'padrao',
    },
    {
      caso: 'NaN (campo limpo) com padrão → padrão',
      produto: Number.NaN,
      padrao: 3,
      esperado: 'padrao',
    },
    { caso: 'igual ao padrão (3 = 3) → padrão', produto: 3, padrao: 3, esperado: 'padrao' },
    { caso: 'diferente do padrão (7 ≠ 3) → exceção', produto: 7, padrao: 3, esperado: 'excecao' },
    {
      caso: 'zero é um prazo válido e difere de 3 → exceção',
      produto: 0,
      padrao: 3,
      esperado: 'excecao',
    },
    {
      caso: 'fornecedor sem padrão e produto vazio → nada a mostrar',
      produto: null,
      padrao: null,
      esperado: null,
    },
    {
      caso: 'fornecedor sem padrão e produto com prazo → nada a comparar',
      produto: 5,
      padrao: null,
      esperado: null,
    },
  ])('$caso', ({ produto, padrao, esperado }) => {
    expect(getLeadTimeSource(produto, padrao)).toBe(esperado);
  });
});
