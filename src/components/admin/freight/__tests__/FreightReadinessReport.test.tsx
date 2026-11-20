import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FreightReadinessProduct } from '@/services/freightReadinessService';
import { buildReadinessCsv, buildReadinessRows, filterBySupplier } from '../freightReadinessRows';

interface ReportState {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const h = vi.hoisted(() => {
  const state: ReportState = {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
  return { state };
});

vi.mock('@/hooks/freight/useFreightReadinessReport', () => ({
  useFreightReadinessReport: () => h.state,
}));

import { FreightReadinessReport } from '../FreightReadinessReport';

const base = {
  height_cm: 10,
  width_cm: 5,
  length_cm: 3,
  diameter_cm: null,
  weight_g: 100,
};

/** 4 ativos: 1 completo (fora do relatório), 3 incompletos. */
const PRODUTOS: FreightReadinessProduct[] = [
  { ...base, id: 'p1', sku: 'B-10', name: 'Completo', supplier_id: 's1' },
  { ...base, id: 'p2', sku: 'A-2', name: 'Sem peso', supplier_id: 's1', weight_g: null },
  {
    ...base,
    id: 'p3',
    sku: 'A-10',
    name: 'Sem largura e comprimento',
    supplier_id: 's2',
    width_cm: null,
    length_cm: null,
  },
  { ...base, id: 'p4', sku: 'C-1', name: 'Sem fornecedor', supplier_id: null, height_cm: null },
];
const FORNECEDORES = new Map([
  ['s1', 'XBZ'],
  ['s2', 'Spot'],
]);

describe('buildReadinessRows', () => {
  it('só entram os 3 incompletos, ordenados por SKU em ordem natural (A-2 antes de A-10)', () => {
    const rows = buildReadinessRows(PRODUTOS, FORNECEDORES);
    expect(rows.map((r) => r.sku)).toEqual(['A-2', 'A-10', 'C-1']);
  });

  it('escreve o que falta e o fornecedor', () => {
    const rows = buildReadinessRows(PRODUTOS, FORNECEDORES);
    expect(rows.map((r) => [r.supplierName, r.missingLabel])).toEqual([
      ['XBZ', 'Peso'],
      ['Spot', 'Largura, Comprimento'],
      ['Sem fornecedor', 'Altura'],
    ]);
  });
});

describe('filterBySupplier', () => {
  const rows = buildReadinessRows(PRODUTOS, FORNECEDORES);
  it.each([
    { filtro: '', esperado: ['A-2', 'A-10', 'C-1'] },
    { filtro: 's1', esperado: ['A-2'] },
    { filtro: 'none', esperado: ['C-1'] },
  ])('filtro "$filtro"', ({ filtro, esperado }) => {
    expect(filterBySupplier(rows, filtro).map((r) => r.sku)).toEqual(esperado);
  });
});

describe('FreightReadinessReport', () => {
  beforeEach(() => {
    h.state = {
      data: { rows: buildReadinessRows(PRODUTOS, FORNECEDORES), totalActive: 4 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  const renderReport = () =>
    render(
      <MemoryRouter>
        <FreightReadinessReport />
      </MemoryRouter>,
    );

  it('mostra as 3 linhas, o resumo e o link para o cadastro', () => {
    renderReport();
    expect(screen.getByText(/3 de 4 produtos ativos/)).toBeTruthy();
    expect(screen.getByText('Sem peso')).toBeTruthy();
    expect(screen.getByText('Largura, Comprimento')).toBeTruthy();
    const links = screen.getAllByRole('link', { name: /Abrir cadastro de/ });
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Abrir cadastro de A-2',
      'Abrir cadastro de A-10',
      'Abrir cadastro de C-1',
    ]);
    // nova aba: voltar não perde sub-aba nem filtro
    expect(links.map((l) => [l.getAttribute('target'), l.getAttribute('rel')])).toEqual([
      ['_blank', 'noopener'],
      ['_blank', 'noopener'],
      ['_blank', 'noopener'],
    ]);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/admin/cadastros/produto/p2',
      '/admin/cadastros/produto/p3',
      '/admin/cadastros/produto/p4',
    ]);
  });

  it('o arquivo baixado é o CSV com ";" das 3 linhas', async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blobs.push(b instanceof Blob ? b : new Blob());
      return 'blob:teste';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderReport();
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    expect(blobs).toHaveLength(1);
    // Blob.text() descarta o BOM ao decodificar: os 3 primeiros bytes são lidos à parte.
    expect([...new Uint8Array(await blobs[0].arrayBuffer()).slice(0, 3)]).toEqual([
      0xef, 0xbb, 0xbf,
    ]);
    const linhas = (await blobs[0].text()).split('\n');
    expect(linhas).toHaveLength(4); // cabeçalho + 3 linhas
    expect(linhas[0]).toBe('SKU;Produto;Fornecedor;O que falta');
  });

  it('carregando e erro são anunciados para leitor de tela', () => {
    h.state = { ...h.state, data: undefined, isLoading: true };
    const { unmount } = renderReport();
    expect(screen.getByRole('status').textContent).toContain('Carregando');
    unmount();
    h.state = { ...h.state, isLoading: false, isError: true };
    renderReport();
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar');
  });

  it('sem nenhum produto incompleto, diz que está tudo certo', () => {
    h.state = { ...h.state, data: { rows: [], totalActive: 4 } };
    renderReport();
    expect(
      screen.getByText('Todos os produtos ativos têm peso e medidas para o frete.'),
    ).toBeTruthy();
  });

  it('em erro, oferece tentar de novo', () => {
    h.state = { ...h.state, data: undefined, isError: true };
    renderReport();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(h.state.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('buildReadinessCsv', () => {
  const linha = (sku: string, name: string, missingLabel: string) => ({
    id: sku,
    sku,
    name,
    supplierId: null,
    supplierName: 'Sem fornecedor',
    missing: [],
    missingLabel,
  });

  it('separa por ";", começa com BOM e protege "Altura, Peso" e aspas', () => {
    const csv = buildReadinessCsv([linha('A-1', 'Copo "grande"', 'Altura, Peso')]);
    expect(csv).toBe(
      '﻿SKU;Produto;Fornecedor;O que falta\nA-1;"Copo ""grande""";Sem fornecedor;Altura, Peso',
    );
  });

  it('nome que começa com = + - @ ganha apóstrofo (não vira fórmula no Excel)', () => {
    const nomes = ['=HYPERLINK("x")', '+1', '-2', '@soma'];
    const linhas = buildReadinessCsv(nomes.map((n, i) => linha(`S${i}`, n, 'Peso'))).split('\n');
    // 4 nomes: apóstrofo antes do primeiro caractere; aspas só onde há '"' ou ';'
    expect(linhas[1]).toBe('S0;"\'=HYPERLINK(""x"")";Sem fornecedor;Peso');
    expect(linhas[2]).toBe("S1;'+1;Sem fornecedor;Peso");
    expect(linhas[3]).toBe("S2;'-2;Sem fornecedor;Peso");
    expect(linhas[4]).toBe("S3;'@soma;Sem fornecedor;Peso");
  });

  it('valor com ";" vai entre aspas', () => {
    const csv = buildReadinessCsv([linha('A-1', 'Copo; Taça', 'Peso')]);
    expect(csv.split('\n')[1]).toBe('A-1;"Copo; Taça";Sem fornecedor;Peso');
  });
});
