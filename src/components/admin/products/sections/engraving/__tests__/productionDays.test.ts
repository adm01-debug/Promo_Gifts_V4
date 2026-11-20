import { describe, expect, it } from 'vitest';
import type { PriceBandInput } from '@/lib/lead-time';
import { parseProductionDays, tableLeadTimePlaceholder } from '../productionDays';

describe('parseProductionDays', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['0', 0],
    ['7', 7],
    [' 12 ', 12],
    ['365', 365],
  ])('"%s" vale %s', (texto, esperado) => {
    expect(parseProductionDays(texto)).toEqual({ ok: true, value: esperado });
  });

  it.each(['-1', '1.5', '1,5', 'abc', '366', '1e2'])('"%s" é inválido', (texto) => {
    expect(parseProductionDays(texto)).toEqual({ ok: false });
  });
});

describe('tableLeadTimePlaceholder', () => {
  const faixa = (tabela: string, dias: number | null): PriceBandInput => ({
    tabelaPrecoId: tabela,
    minQuantity: 1,
    maxQuantity: null,
    leadTimeDays: dias,
  });

  it.each([
    // uma tabela com faixas de 4 e 8 dias: "4 a 8"
    [[faixa('t1', 4), faixa('t1', 8)], 't1', 'tabela: 4 a 8'],
    // todas as faixas com 5 dias: "5"
    [[faixa('t1', 5), faixa('t1', 5)], 't1', 'tabela: 5'],
    // faixa de outra tabela não conta
    [[faixa('t2', 9)], 't1', 'tabela: sem prazo'],
    // faixa sem prazo não conta
    [[faixa('t1', null)], 't1', 'tabela: sem prazo'],
    [[], 't1', 'tabela: sem prazo'],
  ])('%j em %s dá "%s"', (faixas, tabela, esperado) => {
    expect(tableLeadTimePlaceholder(faixas, tabela)).toBe(esperado);
  });
});
