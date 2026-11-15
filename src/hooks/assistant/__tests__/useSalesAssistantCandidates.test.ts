/**
 * Testes — useSalesAssistantCandidates
 *
 * O mock é do CLIENT do Supabase (`@/integrations/supabase/client`), não de
 * `untypedRpc`: `untypedRpc` é só `supabase.rpc()` sem o estreitamento de nome
 * (src/lib/supabase-untyped.ts), então stubar o client exercita o caminho real
 * de chamada e prova os NOMES dos argumentos que vão para o PostgREST — que é
 * exatamente onde um contrato errado com a migration vira 404.
 *
 * Os nomes conferidos aqui são os da assinatura real da migration
 * `20261115034500_rpc_sales_assistant_candidates.sql`.
 */

import { readFileSync } from 'node:fs';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SinaisDaMarcaDoCliente } from '@/hooks/assistant/useClientBrandSignals';
import {
  contextoDoCliente,
  nomeDoGrupoDeCorUnico,
  LIMITE_DE_CANDIDATOS,
  mapearCandidato,
  MAXIMO_POR_CATEGORIA,
  RPC_DE_CANDIDATOS,
  SCORE_MINIMO,
  useSalesAssistantCandidates,
  type LinhaDeCandidato,
} from '@/hooks/assistant/useSalesAssistantCandidates';
import type { EncaixeDeCor } from '@/lib/assistant/logoColorToGroups';

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mockRpc },
}));

function renderHookWithProviders<T>(callback: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(callback, { wrapper });
}

function encaixe(extra: Partial<EncaixeDeCor> = {}): EncaixeDeCor {
  return {
    colorGroupId: 'grupo-azul',
    nomeDoGrupo: 'Azul',
    hexDoGrupo: '#2196f3',
    hexDaLogo: '#0057b8',
    deltaE: 26.7604,
    confianca: 'aproximada',
    ...extra,
  };
}

function sinais(extra: Partial<SinaisDaMarcaDoCliente> = {}): SinaisDaMarcaDoCliente {
  return {
    clienteId: 'cliente-1',
    ramoTextoCrm: 'Indústria Alimentícia',
    ramoPaiId: 'ramo-alim',
    ramoNome: 'Indústria Alimentícia',
    confiancaRamo: 'alta',
    hexesDaLogo: ['#0057b8'],
    encaixesDeCor: [encaixe({ deltaE: 5.0327, confianca: 'proxima' })],
    colorGroupIds: ['grupo-azul'],
    corLigada: true,
    temSinalSuficiente: true,
    ...extra,
  };
}

function linha(extra: Partial<LinhaDeCandidato> = {}): LinhaDeCandidato {
  return {
    product_id: 'produto-1',
    name: 'Caneta metálica',
    sale_price: 15.5,
    primary_image_url: 'https://exemplo.invalid/caneta.png',
    category_id: 'categoria-1',
    score: 82,
    sinal_ramo: true,
    sinal_cor: true,
    sinal_giro: true,
    sinal_novidade: false,
    sinal_gravacao: false,
    sinal_preco: false,
    sinal_estoque: true,
    classe_giro: 'A',
    ...extra,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('sem cliente ou sem sinal', () => {
  it('não chama a RPC quando não há sinais', async () => {
    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(null));

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('não chama a RPC quando não há cliente', async () => {
    const { result } = renderHookWithProviders(() =>
      useSalesAssistantCandidates(sinais({ clienteId: null })),
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('não chama a RPC quando o cliente não tem ramo nem cor', async () => {
    const { result } = renderHookWithProviders(() =>
      useSalesAssistantCandidates(
        sinais({
          ramoPaiId: null,
          encaixesDeCor: [],
          colorGroupIds: [],
          corLigada: false,
          temSinalSuficiente: false,
        }),
      ),
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('enabled false desliga a busca mesmo com sinal', async () => {
    const { result } = renderHookWithProviders(() =>
      useSalesAssistantCandidates(sinais(), { enabled: false }),
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('caminho feliz', () => {
  it('chama a RPC com o nome e os sete argumentos do contrato', async () => {
    mockRpc.mockResolvedValue({ data: [linha()], error: null });

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith(RPC_DE_CANDIDATOS, {
      p_ramo_pai_id: 'ramo-alim',
      p_color_group_ids: ['grupo-azul'],
      p_price_min: null,
      p_price_max: null,
      p_limit: LIMITE_DE_CANDIDATOS,
      p_max_per_category: MAXIMO_POR_CATEGORIA,
      p_min_score: SCORE_MINIMO,
    });
    expect(LIMITE_DE_CANDIDATOS).toBe(8);
    expect(SCORE_MINIMO).toBe(50);
    expect(MAXIMO_POR_CATEGORIA).toBe(2);
  });

  it('mapeia a linha para o formato que buildReason consome', async () => {
    mockRpc.mockResolvedValue({ data: [linha()], error: null });

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const candidato = result.current.data![0];
    expect(candidato.produtoId).toBe('produto-1');
    expect(candidato.nome).toBe('Caneta metálica');
    expect(candidato.precoDeVenda).toBe(15.5);
    expect(candidato.categoriaId).toBe('categoria-1');
    expect(candidato.score).toBe(82);
    expect(candidato.sinais).toEqual({
      ramo: true,
      cor: true,
      giro: true,
      novidade: false,
      gravacao: false,
      preco: false,
      estoque: true,
    });
    // ramoNome e corNome vêm do CLIENTE, não da RPC.
    expect(candidato.dados.ramoNome).toBe('Indústria Alimentícia');
    expect(candidato.dados.corNome).toBe('Azul');
    expect(candidato.dados.corExata).toBe(true);
    expect(candidato.dados.classeGiro).toBe('A');
  });

  it('faixa de preço vai para a RPC e para a frase do motivo', async () => {
    mockRpc.mockResolvedValue({ data: [linha({ sinal_preco: true })], error: null });

    const { result } = renderHookWithProviders(() =>
      useSalesAssistantCandidates(sinais(), { faixaDePreco: { min: 10, max: 40 } }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith(
      RPC_DE_CANDIDATOS,
      expect.objectContaining({ p_price_min: 10, p_price_max: 40 }),
    );
    expect(result.current.data![0].dados.faixaMin).toBe(10);
    expect(result.current.data![0].dados.faixaMax).toBe(40);
  });

  it('aceita limite, corte de nota e teto por categoria vindos de fora', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHookWithProviders(() =>
      useSalesAssistantCandidates(sinais(), {
        limite: 4,
        scoreMinimo: 70,
        maxPorCategoria: 1,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith(
      RPC_DE_CANDIDATOS,
      expect.objectContaining({ p_limit: 4, p_min_score: 70, p_max_per_category: 1 }),
    );
  });

  it('cliente só com cor também busca, com ramo nulo', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHookWithProviders(() =>
      useSalesAssistantCandidates(sinais({ ramoPaiId: null, ramoNome: null })),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith(
      RPC_DE_CANDIDATOS,
      expect.objectContaining({ p_ramo_pai_id: null, p_color_group_ids: ['grupo-azul'] }),
    );
  });

  it('lista vazia é estado vazio, não erro', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});

describe('erro da RPC', () => {
  it('propaga o erro em vez de devolver lista vazia', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function public.rpc_sales_assistant_candidates does not exist' },
    });

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('does not exist');
    expect(result.current.data).toBeUndefined();
  });

  it('rejeição da rede também vira erro do hook', async () => {
    mockRpc.mockRejectedValue(new Error('network down'));

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('network down');
  });
});

describe('nome da RPC', () => {
  it('a constante e o literal da chamada não divergem', () => {
    // A chamada usa o literal (exigência do check-supabase-reference-catalog);
    // a constante é a SSOT que os testes e a migration citam. Se alguém mudar
    // um e esquecer o outro, este teste quebra antes de ir para produção.
    // Caminho a partir da raiz: o vitest roda com cwd no projeto, e
    // `import.meta.url` aqui não é file:// (transform do Vite).
    const fonte = readFileSync('src/hooks/assistant/useSalesAssistantCandidates.ts', 'utf8');
    expect(fonte).toContain(`untypedRpc('${RPC_DE_CANDIDATOS}'`);
  });
});

describe('contextoDoCliente', () => {
  it('cor exata ou próxima conta como a cor da logo', () => {
    expect(contextoDoCliente(sinais(), undefined).corExata).toBe(true);
    expect(
      contextoDoCliente(
        sinais({ encaixesDeCor: [encaixe({ deltaE: 0, confianca: 'exata' })] }),
        undefined,
      ).corExata,
    ).toBe(true);
  });

  it('dois grupos de cor casados: não nomeia nenhum (a RPC liga o sinal por qualquer um)', () => {
    const doisGrupos = sinais({
      encaixesDeCor: [
        encaixe({ colorGroupId: 'grupo-azul', nomeDoGrupo: 'Azul', confianca: 'proxima' }),
        encaixe({ colorGroupId: 'grupo-vermelho', nomeDoGrupo: 'Vermelho', hexDoGrupo: '#e53935' }),
      ],
      colorGroupIds: ['grupo-azul', 'grupo-vermelho'],
    });
    // Um produto com variante só vermelha receberia o selo "Azul" se nomeássemos o primeiro.
    expect(contextoDoCliente(doisGrupos, undefined).corNome).toBeNull();
    // A confiança passa a ser a MAIS FRACA entre os encaixes: aqui o segundo é
    // 'aproximada', então a frase não pode afirmar "cor igual à logo" — o
    // produto pode ter casado só com esse. Antes vinha do primeiro e prometia
    // mais do que o produto tem.
    expect(contextoDoCliente(doisGrupos, undefined).corExata).toBe(false);
    expect(nomeDoGrupoDeCorUnico(doisGrupos)).toBeNull();
  });

  it('dois grupos, os dois fortes: a cor segue valendo como igual à logo', () => {
    const doisFortes = sinais({
      encaixesDeCor: [
        encaixe({ colorGroupId: 'grupo-azul', nomeDoGrupo: 'Azul', confianca: 'exata' }),
        encaixe({
          colorGroupId: 'grupo-vermelho',
          nomeDoGrupo: 'Vermelho',
          hexDoGrupo: '#e53935',
          confianca: 'proxima',
        }),
      ],
      colorGroupIds: ['grupo-azul', 'grupo-vermelho'],
    });

    expect(contextoDoCliente(doisFortes, undefined).corExata).toBe(true);
    expect(contextoDoCliente(doisFortes, undefined).corNome).toBeNull();
  });

  it('um único grupo casado: nomeia a cor', () => {
    expect(nomeDoGrupoDeCorUnico(sinais())).toBe('Azul');
    expect(nomeDoGrupoDeCorUnico(null)).toBeNull();
  });

  it('cor apenas aproximada não é tratada como a cor da logo', () => {
    const contexto = contextoDoCliente(sinais({ encaixesDeCor: [encaixe()] }), undefined);
    expect(contexto.corNome).toBe('Azul');
    expect(contexto.corExata).toBe(false);
  });

  it('sem cliente devolve contexto vazio, sem inventar nome', () => {
    expect(contextoDoCliente(null, undefined)).toEqual({
      ramoNome: null,
      corNome: null,
      corExata: false,
      faixaMin: null,
      faixaMax: null,
    });
  });
});

describe('mapearCandidato — defesa contra formato', () => {
  it('numeric como string (PostgREST) vira número', () => {
    const candidato = mapearCandidato(linha({ sale_price: '15.50', score: '82' }));
    expect(candidato.precoDeVenda).toBe(15.5);
    expect(candidato.score).toBe(82);
  });

  it('sinal nulo é sinal desligado, nunca ligado por omissão', () => {
    const candidato = mapearCandidato(
      linha({ sinal_ramo: null, sinal_cor: null, sinal_giro: null, sinal_estoque: null }),
    );
    expect(candidato.sinais.ramo).toBe(false);
    expect(candidato.sinais.cor).toBe(false);
    expect(candidato.sinais.giro).toBe(false);
    expect(candidato.sinais.estoque).toBe(false);
  });

  it('não inventa número nem classe quando a RPC não mediu', () => {
    const candidato = mapearCandidato(
      linha({ sale_price: null, score: null, classe_giro: null, name: null }),
    );
    expect(candidato.precoDeVenda).toBeNull();
    expect(candidato.score).toBe(0);
    expect(candidato.nome).toBe('');
    expect(candidato.dados.classeGiro).toBeNull();
    expect(candidato.dados.ramoNome).toBeNull();
    expect(candidato.dados.corNome).toBeNull();
  });

  it('classe de giro fora de A/B/C é descartada', () => {
    expect(mapearCandidato(linha({ classe_giro: 'Z' })).dados.classeGiro).toBeNull();
    expect(mapearCandidato(linha({ classe_giro: 'c' })).dados.classeGiro).toBe('C');
  });
});

describe('resposta malformada', () => {
  it('descarta linha sem product_id em vez de quebrar a tela', async () => {
    mockRpc.mockResolvedValue({
      data: [linha(), { name: 'sem id' }, null, 'lixo'],
      error: null,
    });

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].produtoId).toBe('produto-1');
  });

  it('data que não é lista vira lista vazia', async () => {
    mockRpc.mockResolvedValue({ data: { inesperado: true }, error: null });

    const { result } = renderHookWithProviders(() => useSalesAssistantCandidates(sinais()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
