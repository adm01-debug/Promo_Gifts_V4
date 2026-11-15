/**
 * Testes — useClientBrandSignals
 *
 * Os mocks ficam na CAMADA DE DADOS (`@/lib/crm-db`, `@/services/ramoAtividadeService`,
 * `@/lib/db/postgrest`), não nos hooks vizinhos: assim o teste exercita de
 * verdade `useCrmCompany`, `useRamosAtividade` e `useColorSystem`, e pega uma
 * mudança de formato entre `color_groups` e `logoColorToGroups`.
 *
 * Fixtures: os nomes e hexes dos grupos de cor são os do catálogo de
 * referência `color_groups` (18 linhas ativas, medidas no canônico em
 * 2026-11-15). Os IDs são SINTÉTICOS — o que o teste prova é que o id vem do
 * catálogo recebido, não qual é o id em produção.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extrairHexesDaMarca,
  hexesDaMarcaDaEmpresa,
  useClientBrandSignals,
} from '@/hooks/assistant/useClientBrandSignals';
import type { CrmCompany } from '@/types/crm';

const selectCrmById = vi.hoisted(() => vi.fn());
const getRamos = vi.hoisted(() => vi.fn());
const dbInvoke = vi.hoisted(() => vi.fn());

vi.mock('@/lib/crm-db', () => ({
  selectCrmById,
  selectCrm: vi.fn(),
  searchCrm: vi.fn(),
  invokeCrmDb: vi.fn(),
}));

vi.mock('@/services/ramoAtividadeService', () => ({
  ramoAtividadeService: {
    getRamos,
    getSegmentos: vi.fn(),
    getRamoById: vi.fn(),
    getRamosComEstatisticas: vi.fn(),
    createRamo: vi.fn(),
    updateRamo: vi.fn(),
    deleteRamo: vi.fn(),
  },
}));

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke }));

vi.mock('@/lib/supabase-untyped', () => ({
  untypedFrom: () => ({
    select: () => ({
      eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  }),
  untypedRpc: vi.fn(),
}));

/** Grupos do catálogo de cor (hex reais do catálogo, ids sintéticos). */
const GRUPOS_DE_COR = [
  { id: 'grupo-azul', name: 'Azul', slug: 'azul', hex_code: '#2196F3', internal_code: null },
  {
    id: 'grupo-vermelho',
    name: 'Vermelho',
    slug: 'vermelho',
    hex_code: '#F44336',
    internal_code: null,
  },
  { id: 'grupo-preto', name: 'Preto', slug: 'preto', hex_code: '#000000', internal_code: null },
  { id: 'grupo-verde', name: 'Verde', slug: 'verde', hex_code: '#4CAF50', internal_code: null },
];

/** Dois dos 22 ramos pai, na grafia exata do banco; ids sintéticos. */
const RAMOS = [
  { id: 'ramo-alim', nome: 'Indústria Alimentícia' },
  { id: 'ramo-saude', nome: 'Saúde' },
];

function empresa(extra: Partial<CrmCompany> = {}): CrmCompany {
  return {
    id: 'cliente-1',
    razao_social: 'Empresa Teste',
    ramo_atividade: null,
    ...extra,
  } as CrmCompany;
}

function renderHookWithProviders<T>(callback: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(callback, { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  getRamos.mockResolvedValue({ ramos: RAMOS, count: RAMOS.length });
  dbInvoke.mockImplementation(({ table }: { table: string }) =>
    Promise.resolve(table === 'color_groups' ? { records: GRUPOS_DE_COR } : { records: [] }),
  );
});

describe('sem cliente', () => {
  it('não consulta o CRM e devolve os sinais zerados', async () => {
    const { result } = renderHookWithProviders(() => useClientBrandSignals(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(selectCrmById).not.toHaveBeenCalled();
    expect(result.current.sinais.clienteId).toBeNull();
    expect(result.current.sinais.temSinalSuficiente).toBe(false);
    expect(result.current.sinais.corLigada).toBe(false);
    expect(result.current.sinais.hexesDaLogo).toEqual([]);
    expect(result.current.clienteEncontrado).toBe(false);
  });
});

describe('cliente sem ramo', () => {
  it('deixa ramoPaiId nulo e confiança baixa, sem inventar ramo', async () => {
    selectCrmById.mockResolvedValue(empresa({ ramo_atividade: null }));

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.clienteEncontrado).toBe(true));

    expect(result.current.sinais.ramoTextoCrm).toBeNull();
    expect(result.current.sinais.ramoPaiId).toBeNull();
    expect(result.current.sinais.ramoNome).toBeNull();
    expect(result.current.sinais.confiancaRamo).toBe('baixa');
  });

  it('texto de ramo sem correspondência honesta também fica baixa', async () => {
    selectCrmById.mockResolvedValue(empresa({ ramo_atividade: 'Supermercado de bairro' }));

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.clienteEncontrado).toBe(true));

    expect(result.current.sinais.ramoTextoCrm).toBe('Supermercado de bairro');
    expect(result.current.sinais.ramoPaiId).toBeNull();
    expect(result.current.sinais.confiancaRamo).toBe('baixa');
  });
});

describe('cliente sem cor', () => {
  it('desliga o sinal de cor quando nenhuma coluna da allowlist tem hex', async () => {
    selectCrmById.mockResolvedValue(
      empresa({ ramo_atividade: 'Saúde', brand_colors: null, cores_marca: null }),
    );

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.clienteEncontrado).toBe(true));

    expect(result.current.sinais.hexesDaLogo).toEqual([]);
    expect(result.current.sinais.encaixesDeCor).toEqual([]);
    expect(result.current.sinais.colorGroupIds).toEqual([]);
    expect(result.current.sinais.corLigada).toBe(false);
    // Ramo sozinho já basta para habilitar a busca de candidatos.
    expect(result.current.sinais.ramoPaiId).toBe('ramo-saude');
    expect(result.current.sinais.temSinalSuficiente).toBe(true);
  });

  it('cor ilegível não vira cor: hex malformado é descartado', async () => {
    selectCrmById.mockResolvedValue(empresa({ brand_colors: ['#ZZZZZZ', '#12345'] }));

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.clienteEncontrado).toBe(true));

    expect(result.current.sinais.hexesDaLogo).toEqual([]);
    expect(result.current.sinais.corLigada).toBe(false);
    expect(result.current.sinais.temSinalSuficiente).toBe(false);
  });
});

describe('caminho feliz', () => {
  it('resolve ramo pelo catálogo e casa a cor da logo com color_groups', async () => {
    selectCrmById.mockResolvedValue(
      empresa({ ramo_atividade: 'Indústria Alimentícia', brand_colors: ['#0057B8'] }),
    );

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.sinais.corLigada).toBe(true));

    const { sinais } = result.current;
    expect(sinais.clienteId).toBe('cliente-1');
    expect(sinais.ramoPaiId).toBe('ramo-alim');
    expect(sinais.ramoNome).toBe('Indústria Alimentícia');
    expect(sinais.confiancaRamo).toBe('alta');
    expect(sinais.hexesDaLogo).toEqual(['#0057b8']);
    expect(sinais.colorGroupIds[0]).toBe('grupo-azul');
    expect(sinais.encaixesDeCor[0].nomeDoGrupo).toBe('Azul');
    expect(sinais.temSinalSuficiente).toBe(true);
  });

  it('apelido curado resolve o ramo com confiança media', async () => {
    selectCrmById.mockResolvedValue(empresa({ ramo_atividade: 'Hospital' }));

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.clienteEncontrado).toBe(true));

    expect(result.current.sinais.ramoNome).toBe('Saúde');
    expect(result.current.sinais.ramoPaiId).toBe('ramo-saude');
    expect(result.current.sinais.confiancaRamo).toBe('media');
  });

  it('limita a 3 grupos de cor mesmo com logo multicolor', async () => {
    selectCrmById.mockResolvedValue(
      empresa({ brand_colors: ['#0057B8', '#E30613', '#111111', '#2E7D32'] }),
    );

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.sinais.corLigada).toBe(true));

    expect(result.current.sinais.colorGroupIds.length).toBeLessThanOrEqual(3);
    expect(new Set(result.current.sinais.colorGroupIds).size).toBe(
      result.current.sinais.colorGroupIds.length,
    );
  });
});

describe('erro do CRM', () => {
  it('expõe o erro em vez de devolver sinais falsamente vazios', async () => {
    selectCrmById.mockRejectedValue(new Error('crm-db-bridge 503'));

    const { result } = renderHookWithProviders(() => useClientBrandSignals('cliente-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('503');
    expect(result.current.sinais.temSinalSuficiente).toBe(false);
    expect(result.current.clienteEncontrado).toBe(false);
  });
});

describe('extrairHexesDaMarca', () => {
  it.each([
    ['hex solto', '#0057B8', ['#0057b8']],
    ['lista separada por vírgula', '#0057B8, #E30613', ['#0057b8', '#e30613']],
    ['lista separada por ponto e vírgula', '#0057B8;#E30613', ['#0057b8', '#e30613']],
    ['json em texto', '["#0057B8","#E30613"]', ['#0057b8', '#e30613']],
    ['array de strings', ['#0057B8'], ['#0057b8']],
    ['array de objetos', [{ hex: '#0057B8' }, { hex_code: '#E30613' }], ['#0057b8', '#e30613']],
    ['objeto nomeado', { primaria: '#0057B8', secundaria: '#E30613' }, ['#0057b8', '#e30613']],
    ['forma curta', ['#09F'], ['#0099ff']],
    ['repetida', ['#0057B8', '#0057b8'], ['#0057b8']],
  ])('lê %s', (_titulo, entrada, esperado) => {
    expect(extrairHexesDaMarca(entrada)).toEqual(esperado);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string vazia', ''],
    ['texto sem cor', 'azul institucional'],
    ['hex curto demais', '#12345'],
    ['hex com alfa', '#0057b8ff'],
    ['número', 123],
    ['array vazio', []],
    ['objeto vazio', {}],
    ['json quebrado', '[#0057B8'],
  ])('devolve vazio para %s', (_titulo, entrada) => {
    expect(extrairHexesDaMarca(entrada)).toEqual([]);
  });

  it('não desce além do limite de profundidade', () => {
    expect(extrairHexesDaMarca({ a: { b: { c: { d: { e: '#0057B8' } } } } })).toEqual([]);
  });

  it('respeita o teto de 8 cores', () => {
    const muitas = Array.from({ length: 20 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`);
    expect(extrairHexesDaMarca(muitas)).toHaveLength(8);
  });
});

describe('hexesDaMarcaDaEmpresa', () => {
  it('prefere brand_colors e só cai para cores_marca quando a primeira não rende hex', () => {
    expect(
      hexesDaMarcaDaEmpresa(empresa({ brand_colors: ['#0057B8'], cores_marca: ['#E30613'] })),
    ).toEqual(['#0057b8']);
    expect(
      hexesDaMarcaDaEmpresa(empresa({ brand_colors: null, cores_marca: ['#E30613'] })),
    ).toEqual(['#e30613']);
  });

  it('devolve vazio para empresa ausente', () => {
    expect(hexesDaMarcaDaEmpresa(null)).toEqual([]);
    expect(hexesDaMarcaDaEmpresa(undefined)).toEqual([]);
  });
});
