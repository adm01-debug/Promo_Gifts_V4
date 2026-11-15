/**
 * useSalesAssistantCandidates — busca no banco canônico os brindes que
 * encaixam no cliente, já pontuados e com os sinais que explicam a nota.
 *
 * Quem escolhe é o BANCO, numa única RPC. Nenhuma chamada de IA entra aqui:
 * a IA do sistema está com a chave inválida (401 em 41 de 41 chamadas), e a
 * narração entra só na fase 3. Este hook transporta e tipa o resultado — não
 * pontua, não filtra e não reordena.
 *
 * FILTROS DUROS, e só dois, aplicados dentro da RPC:
 * `products.is_active = true` e `NOT coalesce(products.is_deleted, false)`.
 * Todo o resto (ramo, cor, giro, novidade, gravação, preço, estoque) é PESO.
 * Os quatro critérios como filtro "E" derrubariam o funil de 7.926 produtos
 * ativos (medido no canônico em 2026-11-15) para 16.
 *
 * CONTRATO COM A MIGRATION — os nomes em {@link ArgsDaRpcDeCandidatos} e
 * {@link LinhaDeCandidato} foram copiados da assinatura real de
 * `supabase/migrations/20261115034500_rpc_sales_assistant_candidates.sql`
 * (args `p_ramo_pai_id, p_color_group_ids, p_price_min, p_price_max, p_limit,
 * p_max_per_category, p_min_score`; retorno `product_id, name, sale_price,
 * primary_image_url, category_id, score, sinal_*, classe_giro`). O PostgREST
 * casa RPC por NOME de argumento: um nome divergente devolve 404, não um
 * resultado errado em silêncio. `p_price_min` e `p_price_max` NÃO têm default
 * no SQL, então vão sempre no corpo — `null` nos dois desliga o sinal de preço.
 *
 * A RPC devolve só o que é do PRODUTO. O nome do ramo e o nome da cor da logo
 * são do CLIENTE, e entram pelo contexto de {@link mapearCandidato}, vindos de
 * `useClientBrandSignals` — assim nenhuma camada repete o que a outra já sabe.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  type ClasseDeGiro,
  type DadosDoProduto,
  type SinaisDeEncaixe,
} from '@/lib/assistant/buildReason';
import type { ConfiancaDeCor } from '@/lib/assistant/logoColorToGroups';
import { untypedRpc } from '@/lib/supabase-untyped';
import type { SinaisDaMarcaDoCliente } from '@/hooks/assistant/useClientBrandSignals';

/** Nome da função no banco. */
export const RPC_DE_CANDIDATOS = 'rpc_sales_assistant_candidates';

/** PostgREST devolve este código quando a função chamada não existe no banco. */
const CODIGO_FUNCAO_INEXISTENTE = 'PGRST202';

/**
 * A RPC de candidatos ainda não foi aplicada neste banco. Não é falha: é
 * recurso não ligado. O card trata este caso com estado próprio.
 */
export class ErroDeRpcNaoAplicada extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeRpcNaoAplicada';
  }
}

/** Até 8 brindes na ficha do cliente — o número da fase 1. */
export const LIMITE_DE_CANDIDATOS = 8;

/** Corte de nota: máximo teórico 110, corte em 50. */
export const SCORE_MINIMO = 50;

/** Teto por categoria, para a lista não virar oito variações do mesmo brinde. */
export const MAXIMO_POR_CATEGORIA = 2;

/** Argumentos da RPC. Mudou aqui, muda na migration — e vice-versa. */
export interface ArgsDaRpcDeCandidatos {
  /** `ramo_atividade.id` do ramo pai, ou `null` quando não houve tradução. */
  readonly p_ramo_pai_id: string | null;
  /** `color_groups.id` casados com a logo; `[]` quando não há cor. */
  readonly p_color_group_ids: string[];
  /** Piso da faixa de preço do cliente; `null` desliga o sinal de preço. */
  readonly p_price_min: number | null;
  /** Teto da faixa de preço do cliente; `null` desliga o sinal de preço. */
  readonly p_price_max: number | null;
  readonly p_limit: number;
  readonly p_max_per_category: number;
  readonly p_min_score: number;
}

/** Linha crua da RPC, nas colunas exatas do `RETURNS TABLE`. */
export interface LinhaDeCandidato {
  product_id: string;
  name: string | null;
  sale_price: number | string | null;
  primary_image_url: string | null;
  category_id: string | null;
  score: number | string | null;
  sinal_ramo: boolean | null;
  sinal_cor: boolean | null;
  sinal_giro: boolean | null;
  sinal_novidade: boolean | null;
  sinal_gravacao: boolean | null;
  sinal_preco: boolean | null;
  sinal_estoque: boolean | null;
  classe_giro: string | null;
}

/** O que o CLIENTE acrescenta à linha do produto para a frase do motivo. */
export interface ContextoDoCliente {
  /** Nome canônico do ramo pai do cliente. */
  readonly ramoNome: string | null;
  /** Nome do grupo de cor casado com a logo do cliente. */
  readonly corNome: string | null;
  /** `true` quando o casamento da logo foi exato ou próximo. */
  readonly corExata: boolean;
  readonly faixaMin: number | null;
  readonly faixaMax: number | null;
}

const SEM_CONTEXTO: ContextoDoCliente = {
  ramoNome: null,
  corNome: null,
  corExata: false,
  faixaMin: null,
  faixaMax: null,
};

/** Candidato pronto para a UI e para `buildReason(sinais, dados)`. */
export interface CandidatoDeEncaixe {
  readonly produtoId: string;
  readonly nome: string;
  readonly precoDeVenda: number | null;
  readonly imagemUrl: string | null;
  readonly categoriaId: string | null;
  readonly score: number;
  /** Os sete sinais, no formato que `buildReason` consome. */
  readonly sinais: SinaisDeEncaixe;
  /** Os dados que a frase do motivo pode citar. */
  readonly dados: DadosDoProduto;
}

export interface FaixaDePreco {
  readonly min: number | null;
  readonly max: number | null;
}

export interface OpcoesDeCandidatos {
  readonly limite?: number;
  readonly scoreMinimo?: number;
  readonly maxPorCategoria?: number;
  /** Faixa de preço do cliente. Sem ela, o sinal de preço fica desligado. */
  readonly faixaDePreco?: FaixaDePreco;
  /** `false` desliga a busca mesmo havendo sinal (ex.: card recolhido). */
  readonly enabled?: boolean;
}

/** `numeric` do Postgres chega como string no PostgREST; `null` continua `null`. */
function comoNumero(valor: number | string | null | undefined): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** `null` e `undefined` viram `false`: sinal não medido NÃO é sinal ligado. */
function comoBooleano(valor: boolean | null | undefined): boolean {
  return valor === true;
}

function comoClasseDeGiro(valor: string | null | undefined): ClasseDeGiro | null {
  const classe = typeof valor === 'string' ? valor.trim().toUpperCase() : '';
  return classe === 'A' || classe === 'B' || classe === 'C' ? classe : null;
}

function sinaisDaLinha(linha: LinhaDeCandidato): SinaisDeEncaixe {
  // Objeto literal em vez de acumulador com asserção: o compilador exige as 7
  // chaves de ChaveDeSinal e já conhece o tipo de cada campo da linha, então o
  // gate de `as` (E125) fica limpo sem perder a exaustividade.
  return {
    cor: comoBooleano(linha.sinal_cor),
    estoque: comoBooleano(linha.sinal_estoque),
    giro: comoBooleano(linha.sinal_giro),
    gravacao: comoBooleano(linha.sinal_gravacao),
    novidade: comoBooleano(linha.sinal_novidade),
    preco: comoBooleano(linha.sinal_preco),
    ramo: comoBooleano(linha.sinal_ramo),
  };
}

/**
 * Converte uma linha da RPC no candidato da UI.
 *
 * Defensivo de propósito: campo ausente vira `false`/`null`, nunca `undefined`
 * solto e nunca um número inventado. Uma coluna que a migration renomear faz o
 * sinal cair, não a tela quebrar.
 */
export function mapearCandidato(
  linha: LinhaDeCandidato,
  contexto: ContextoDoCliente = SEM_CONTEXTO,
): CandidatoDeEncaixe {
  return {
    produtoId: linha.product_id,
    nome: linha.name ?? '',
    precoDeVenda: comoNumero(linha.sale_price),
    imagemUrl: linha.primary_image_url ?? null,
    categoriaId: linha.category_id ?? null,
    score: comoNumero(linha.score) ?? 0,
    sinais: sinaisDaLinha(linha),
    dados: {
      ramoNome: contexto.ramoNome,
      corNome: contexto.corNome,
      corExata: contexto.corExata,
      classeGiro: comoClasseDeGiro(linha.classe_giro),
      faixaMin: contexto.faixaMin,
      faixaMax: contexto.faixaMax,
    },
  };
}

function ehLinhaDeCandidato(valor: unknown): valor is LinhaDeCandidato {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as { product_id?: unknown }).product_id === 'string'
  );
}

/**
 * Confiança da cor da logo: a MAIS FRACA entre os encaixes, ou `null` sem cor.
 *
 * A RPC liga `sinal_cor` quando o produto tem variante em QUALQUER um dos
 * `p_color_group_ids`, e não diz qual. Com dois grupos — um exato e um
 * aproximado — pegar o primeiro afirmaria "cor igual à logo" para um produto
 * que casou só com o aproximado. A mais fraca nunca promete mais do que o
 * produto tem.
 */
function confiancaDaCorDoCliente(
  sinais: SinaisDaMarcaDoCliente | null | undefined,
): ConfiancaDeCor | null {
  const encaixes = sinais?.encaixesDeCor ?? [];
  if (encaixes.length === 0) return null;
  const ordem: ConfiancaDeCor[] = ['exata', 'proxima', 'aproximada', 'distante'];
  return encaixes.reduce<ConfiancaDeCor>(
    (pior, encaixe) =>
      ordem.indexOf(encaixe.confianca) > ordem.indexOf(pior) ? encaixe.confianca : pior,
    encaixes[0].confianca,
  );
}

/**
 * Nome do grupo de cor APENAS quando a logo casou com um único grupo.
 *
 * A RPC liga `sinal_cor` quando o produto tem variante em QUALQUER um dos
 * `p_color_group_ids`. Com dois grupos (logo azul e vermelha, por exemplo),
 * nomear o primeiro faria um produto só vermelho aparecer como "azul". Com mais
 * de um grupo devolvemos `null` e a frase cai no texto genérico de
 * `buildReason` ("tem versão na cor da logo"), que é verdadeiro nos dois casos.
 */
export function nomeDoGrupoDeCorUnico(
  sinais: SinaisDaMarcaDoCliente | null | undefined,
): string | null {
  const encaixes = sinais?.encaixesDeCor ?? [];
  return encaixes.length === 1 ? encaixes[0].nomeDoGrupo : null;
}

/** Monta o contexto do cliente que a RPC não devolve (e nem deveria). */
export function contextoDoCliente(
  sinais: SinaisDaMarcaDoCliente | null | undefined,
  faixa: FaixaDePreco | undefined,
): ContextoDoCliente {
  const confianca: ConfiancaDeCor | null = confiancaDaCorDoCliente(sinais);
  return {
    ramoNome: sinais?.ramoNome ?? null,
    corNome: nomeDoGrupoDeCorUnico(sinais),
    // Exata OU próxima conta como "a cor da logo"; aproximada é só a família.
    corExata: confianca === 'exata' || confianca === 'proxima',
    faixaMin: faixa?.min ?? null,
    faixaMax: faixa?.max ?? null,
  };
}

/**
 * Busca os candidatos de encaixe do cliente.
 *
 * Não busca nada quando não há cliente ou quando não há sinal: sem ramo e sem
 * cor, todo produto empataria na mesma nota baixa e a lista seria ruído.
 *
 * @param sinais Saída de `useClientBrandSignals`. `null` enquanto carrega.
 * @param opcoes Limite, corte de nota, teto por categoria e faixa de preço.
 */
export function useSalesAssistantCandidates(
  sinais: SinaisDaMarcaDoCliente | null | undefined,
  opcoes: OpcoesDeCandidatos = {},
): UseQueryResult<CandidatoDeEncaixe[]> {
  const limite = opcoes.limite ?? LIMITE_DE_CANDIDATOS;
  const scoreMinimo = opcoes.scoreMinimo ?? SCORE_MINIMO;
  const maxPorCategoria = opcoes.maxPorCategoria ?? MAXIMO_POR_CATEGORIA;
  const precoMin = opcoes.faixaDePreco?.min ?? null;
  const precoMax = opcoes.faixaDePreco?.max ?? null;

  const clienteId = sinais?.clienteId ?? null;
  const ramoPaiId = sinais?.ramoPaiId ?? null;
  const colorGroupIds = sinais?.colorGroupIds ?? [];
  const temSinal = !!clienteId && sinais?.temSinalSuficiente === true;
  const contexto = contextoDoCliente(sinais, opcoes.faixaDePreco);

  return useQuery<CandidatoDeEncaixe[]>({
    queryKey: [
      'sales-assistant-candidates',
      clienteId,
      ramoPaiId,
      colorGroupIds.join(','),
      limite,
      scoreMinimo,
      maxPorCategoria,
      precoMin,
      precoMax,
    ],
    enabled: temSinal && opcoes.enabled !== false,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const args: ArgsDaRpcDeCandidatos = {
        p_ramo_pai_id: ramoPaiId,
        p_color_group_ids: [...colorGroupIds],
        p_price_min: precoMin,
        p_price_max: precoMax,
        p_limit: limite,
        p_max_per_category: maxPorCategoria,
        p_min_score: scoreMinimo,
      };

      // untypedRpc: a RPC nasce na migration desta entrega e ainda não está
      // no types.ts gerado. É o mesmo `supabase.rpc()` por baixo
      // (src/lib/supabase-untyped.ts), sem o estreitamento de nome.
      //
      // O nome vai como LITERAL, não como `RPC_DE_CANDIDATOS`:
      // scripts/check-supabase-reference-catalog.mjs só resolve o nome quando
      // ele está literal na chamada. Com a constante, a referência cai em
      // `new_dynamic_dispatch` e a exceção teria de liberar o arquivo inteiro;
      // com o literal, a exceção no catálogo nomeia esta RPC e só ela.
      // `RPC_DE_CANDIDATOS` segue como SSOT do nome e um teste garante que os
      // dois não divergem.
      const { data, error } = await untypedRpc('rpc_sales_assistant_candidates', { ...args });
      if (error) {
        // A migration que cria a RPC chega ao `main` antes de ser aplicada em
        // produção (só o db-apply-migration.yml aplica, por disparo manual).
        // Sem distinguir isso de falha real, o card virava "A busca de brindes
        // falhou" na ficha de qualquer cliente — o vendedor acha que o sistema
        // quebrou, quando o recurso ainda não foi ligado.
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === CODIGO_FUNCAO_INEXISTENTE
        ) {
          throw new ErroDeRpcNaoAplicada(error.message);
        }
        throw new Error(error.message);
      }

      const linhas = Array.isArray(data) ? (data as unknown[]) : [];
      return linhas.filter(ehLinhaDeCandidato).map((linha) => mapearCandidato(linha, contexto));
    },
  });
}
