/**
 * A frase que explica ao vendedor POR QUE o brinde foi escolhido para aquele
 * cliente, e a linha de rodapé que confessa o que NÃO foi achado.
 *
 * É isto que separa uma lista de uma recomendação. O vendedor abre
 * `/clientes/:id` e lê, por produto:
 *   "Serve para o ramo Saúde · tem versão azul (igual à logo) · Classe A no
 *    portfólio do fornecedor · cabe em R$ 15–60 · pronta entrega"
 *
 * PUREZA: sem rede, sem React, sem banco em execução. Quem pontuou os sinais
 * (camada de score) passa os booleanos; quem carregou o produto passa os dados.
 * Esta camada só escreve português — não decide encaixe, não consulta nada e
 * não inventa número: todo número que sai daqui entrou por parâmetro.
 *
 * TEXTOS REAPROVEITADOS de `product_badge_definitions` (lido no canônico
 * doufsxqlfjyuvxuezpln em 2026-11-15, `execute_sql` somente leitura), em vez de
 * cunhar sinônimos novos:
 *   • `class_a`         → "Classe A" / "Top de receita/giro no portfólio do
 *                          fornecedor (classificação ABC)."
 *   • `novelty`         → "Novidade"
 *   • `personalization` → "Produto permite personalização/gravação de logo."
 *   • `colors`          → "Produto possui variantes de cor."
 * "Pronta entrega" é o termo da casa para saldo disponível, já usado em
 * `src/components/products/share/MessageTemplates.ts:80` e em
 * `src/lib/personalization/transformers.ts:341`.
 *
 * POR QUE A GRAVAÇÃO É AVISO, E NUNCA AFIRMAÇÃO DE AUSÊNCIA — medido no
 * canônico em 2026-11-15:
 *   • 7.926 produtos ativos; 4.985 com `products.allows_personalization = true`.
 *   • 274 produtos com `is_new` → 0 com a marca.
 *   • 275 com `novelty_detected_at` → 0 com a marca.
 *   • 0 produtos ativos com a marca NULA.
 * Ou seja: a ingestão do campo está quebrada e `false` NÃO distingue "não
 * aceita gravação" de "ninguém ingeriu isso". Logo, `false` nunca vira a frase
 * "não aceita": vira o aviso `AVISO_GRAVACAO`. 25 dos 274 novos até têm técnica
 * de gravação preenchida (`engraving_type`/`engraving_description`) sem a marca,
 * o que confirma a ausência como falha de ingestão, não como realidade.
 */

/** Os sete sinais que a camada de score pontua e esta camada narra. */
export type ChaveDeSinal = 'cor' | 'estoque' | 'giro' | 'gravacao' | 'novidade' | 'preco' | 'ramo';

/** Um sinal pontuou (`true`) ou não (`false`). Nada de meio-termo aqui. */
export type SinaisDeEncaixe = Readonly<Record<ChaveDeSinal, boolean>>;

/**
 * Ordem de leitura da frase: do sinal mais forte ao mais fraco.
 *
 * Os cinco primeiros seguem os pesos declarados no plano do "Encaixe do
 * Cliente" (ramo 30, cor 25, giro 15, novidade 12, gravação 10). Preço e
 * estoque não têm peso declarado no plano; a ordem entre os dois (preço antes
 * de estoque) é DECISÃO DESTA CAMADA, por ser a objeção que o vendedor ouve
 * primeiro. Esta lista é ordem de texto, não tabela de pesos: quem pontua é a
 * camada de score, e nenhum número de peso mora neste arquivo.
 */
export const ORDEM_DOS_SINAIS: readonly ChaveDeSinal[] = [
  'ramo',
  'cor',
  'giro',
  'novidade',
  'gravacao',
  'preco',
  'estoque',
];

/** Classe de giro ABC, como vem de `mv_product_intelligence.abc_classification`. */
export type ClasseDeGiro = 'A' | 'B' | 'C';

/** Dados do produto e do pedido do cliente que entram na frase. */
export interface DadosDoProduto {
  /** Nome canônico do ramo pai (`ramo_atividade.nome`). */
  readonly ramoNome?: string | null;
  /** Nome do grupo de cor casado com a logo (`color_groups`). */
  readonly corNome?: string | null;
  /** `true` quando o casamento Delta-E foi exato ou próximo; `false` = aproximado. */
  readonly corExata?: boolean;
  /** Classe ABC medida; `null` quando o produto não está em `mv_product_intelligence`. */
  readonly classeGiro?: ClasseDeGiro | null;
  /** Piso da faixa de preço do cliente, em reais. */
  readonly faixaMin?: number | null;
  /** Teto da faixa de preço do cliente, em reais. */
  readonly faixaMax?: number | null;
}

/** Separador entre os trechos da frase. */
export const SEPARADOR = ' · ';

/** O que o assistente diz quando a marca de gravação não está no cadastro. */
export const AVISO_GRAVACAO = 'preciso confirmar a gravação';

/** Frase de quando nenhum sinal pontuou. Nunca vazia, nunca elogiosa. */
export const MOTIVO_SEM_SINAL = 'Sem sinal de encaixe para este cliente';

/**
 * Rodapé de quando a busca não devolveu nada. O qualificador do pedido ("azul
 * nessa faixa") entra entre as duas metades, para a frase sair em português:
 * "Não achei nenhum brinde azul nessa faixa com encaixe para este cliente."
 */
const NOTA_SEM_RESULTADO_INICIO = 'Não achei nenhum brinde';
const NOTA_SEM_RESULTADO_FIM = 'com encaixe para este cliente.';

const ehTextoUtil = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;

const ehNumeroUtil = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;

/** Inteiro não negativo; qualquer outra coisa (NaN, negativo, texto) vira 0. */
const contagem = (valor: unknown): number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;

/**
 * Formata reais em pt-BR sem depender de `Intl` (dado de locale varia entre
 * Node do CI e navegador, e a frase precisa ser idêntica nos dois).
 * Centavos só aparecem quando existem: 15 → "15"; 15.5 → "15,50".
 */
const formatarReal = (valor: number): string => {
  const [inteiro, centavos] = Math.abs(valor).toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return centavos === '00' ? comMilhar : `${comMilhar},${centavos}`;
};

const trechoRamo = (dados: DadosDoProduto): string =>
  ehTextoUtil(dados.ramoNome)
    ? `Serve para o ramo ${dados.ramoNome.trim()}`
    : 'Serve para o ramo do cliente';

const trechoCor = (dados: DadosDoProduto): string => {
  const parecida = dados.corExata === false;
  const laudo = parecida ? 'parecida com a logo' : 'igual à logo';
  if (!ehTextoUtil(dados.corNome)) {
    return parecida ? 'tem versão parecida com a cor da logo' : 'tem versão na cor da logo';
  }
  return `tem versão ${dados.corNome.trim().toLowerCase()} (${laudo})`;
};

/**
 * Giro. A classe medida é citada como está — inclusive 'C'. Esconder a classe
 * fraca de um produto que a camada de score aprovou seria validação, não
 * verdade; o vendedor precisa saber com o que está entrando na conversa.
 */
const trechoGiro = (dados: DadosDoProduto): string => {
  const classe = dados.classeGiro;
  if (classe === 'A' || classe === 'B' || classe === 'C') {
    return `Classe ${classe} no portfólio do fornecedor`;
  }
  return 'tem giro no portfólio do fornecedor';
};

const trechoPreco = (dados: DadosDoProduto): string => {
  const min = ehNumeroUtil(dados.faixaMin) ? dados.faixaMin : null;
  const max = ehNumeroUtil(dados.faixaMax) ? dados.faixaMax : null;
  if (min !== null && max !== null) {
    return `cabe em R$ ${formatarReal(min)}–${formatarReal(max)}`;
  }
  if (max !== null) return `cabe até R$ ${formatarReal(max)}`;
  if (min !== null) return `cabe acima de R$ ${formatarReal(min)}`;
  return 'cabe na faixa de preço do cliente';
};

const TRECHO_POR_SINAL: Readonly<Record<ChaveDeSinal, (dados: DadosDoProduto) => string>> = {
  ramo: trechoRamo,
  cor: trechoCor,
  giro: trechoGiro,
  novidade: () => 'novidade no catálogo',
  gravacao: () => 'aceita gravação',
  preco: trechoPreco,
  estoque: () => 'pronta entrega',
};

const comInicialMaiuscula = (frase: string): string =>
  frase.charAt(0).toUpperCase() + frase.slice(1);

/**
 * Monta a frase do motivo.
 *
 * Regras, em ordem de prioridade:
 *   1. Só cita sinal que realmente pontuou (`sinais[chave] === true`).
 *   2. Ordena do mais forte ao mais fraco (`ORDEM_DOS_SINAIS`).
 *   3. Gravação sem marca no cadastro não vira "não aceita": vira o aviso
 *      `AVISO_GRAVACAO`, sempre no fim da frase, porque é ressalva e não
 *      argumento de venda.
 *   4. Nenhum sinal → `MOTIVO_SEM_SINAL`, nunca string vazia e nunca elogio.
 *   5. Nenhum número é inventado: faixa de preço e classe de giro só aparecem
 *      se vieram em `dados`.
 */
export function buildReason(sinais: SinaisDeEncaixe, dados: DadosDoProduto = {}): string {
  const trechos: string[] = [];

  for (const chave of ORDEM_DOS_SINAIS) {
    if (!sinais[chave]) continue;
    const trecho = TRECHO_POR_SINAL[chave](dados);
    if (ehTextoUtil(trecho)) trechos.push(trecho);
  }

  const corpo = trechos.length > 0 ? trechos.join(SEPARADOR) : MOTIVO_SEM_SINAL;
  const frase = sinais.gravacao ? corpo : `${corpo}${SEPARADOR}${AVISO_GRAVACAO}`;

  return comInicialMaiuscula(frase);
}

/** O que o vendedor (ou a ficha do cliente) pediu ao assistente. */
export interface PedidoDeEncaixe {
  /** `true` quando a lista devia priorizar novidade. */
  readonly queriaNovidade?: boolean;
  /** Nome da cor da logo, quando havia logo para casar. */
  readonly corDaLogoNome?: string | null;
  readonly faixaMin?: number | null;
  readonly faixaMax?: number | null;
}

/**
 * O que a lista entregue de fato contém. Todo campo é contagem medida pela
 * camada de score — esta camada não recalcula nada, só lê.
 */
export interface ResultadoDoEncaixe {
  /** Quantos produtos entraram na lista (até 8 na fase 1). */
  readonly total: number;
  /** Quantos pontuaram por novidade. */
  readonly comNovidade?: number;
  /** Quantos têm versão na cor da logo. */
  readonly comCorDaLogo?: number;
  /** Quantos pontuaram por giro. */
  readonly comGiro?: number;
  /** Quantos pontuaram por giro E têm a cor da logo (claim composta exige contagem própria). */
  readonly comGiroNaCorDaLogo?: number;
  /** Quantos estão sem a marca de gravação no cadastro. */
  readonly semMarcaDeGravacao?: number;
}

const qualificadorDoPedido = (pedido: PedidoDeEncaixe): string => {
  const partes: string[] = [];
  if (ehTextoUtil(pedido.corDaLogoNome)) {
    partes.push(pedido.corDaLogoNome.trim().toLowerCase());
  }
  if (ehNumeroUtil(pedido.faixaMin) || ehNumeroUtil(pedido.faixaMax)) {
    partes.push('nessa faixa');
  }
  return partes.length > 0 ? ` ${partes.join(' ')}` : '';
};

/**
 * A troca que foi feita no lugar da novidade que não existia. Só afirma "em
 * <cor>" quando existe contagem de produtos que são de giro E da cor — sem
 * essa contagem, a frase seria uma claim composta sem medida por trás.
 */
const trechoDaTroca = (
  pedido: PedidoDeEncaixe,
  resultado: ResultadoDoEncaixe,
  total: number,
): string => {
  const giroNaCor = Math.min(contagem(resultado.comGiroNaCorDaLogo), total);
  const giro = Math.min(contagem(resultado.comGiro), total);
  const cor = ehTextoUtil(pedido.corDaLogoNome)
    ? ` em ${pedido.corDaLogoNome.trim().toLowerCase()}`
    : '';

  if (giroNaCor > 0 && cor !== '') {
    return `troquei por ${giroNaCor} ${giroNaCor === 1 ? 'campeão' : 'campeões'} de giro${cor}`;
  }
  if (giro > 0) {
    return `troquei por ${giro} ${giro === 1 ? 'campeão' : 'campeões'} de giro`;
  }
  return `troquei por ${total} que ${total === 1 ? 'encaixa' : 'encaixam'} por outros sinais`;
};

/**
 * Monta o rodapé honesto: o que o assistente NÃO achou.
 *
 * Devolve `null` quando não há nada a confessar — a UI então não mostra linha
 * nenhuma, em vez de mostrar uma linha vazia. É esta função que impede o
 * assistente de parecer que achou o que não achou.
 */
export function buildHonestNote(
  pedido: PedidoDeEncaixe,
  resultado: ResultadoDoEncaixe,
): string | null {
  const total = contagem(resultado?.total);
  if (total === 0) {
    const qualificador = qualificadorDoPedido(pedido ?? {});
    return `${NOTA_SEM_RESULTADO_INICIO}${qualificador} ${NOTA_SEM_RESULTADO_FIM}`;
  }

  const frases: string[] = [];
  const nomeDaCor = ehTextoUtil(pedido?.corDaLogoNome)
    ? pedido.corDaLogoNome.trim().toLowerCase()
    : null;

  if (pedido?.queriaNovidade === true && contagem(resultado.comNovidade) === 0) {
    const qualificador = qualificadorDoPedido(pedido);
    frases.push(`Não achei novidade${qualificador} — ${trechoDaTroca(pedido, resultado, total)}.`);
  }

  if (nomeDaCor !== null && contagem(resultado.comCorDaLogo) === 0) {
    const sujeito = total === 1 ? 'O único que achei não tem' : `Nenhum dos ${total} tem`;
    frases.push(
      `${sujeito} versão ${nomeDaCor} — a cor da logo não bateu com nenhum grupo de cor do catálogo.`,
    );
  }

  const semMarca = Math.min(contagem(resultado.semMarcaDeGravacao), total);
  if (semMarca > 0) {
    frases.push(
      `${semMarca} ${semMarca === 1 ? 'está' : 'estão'} sem a marca de gravação no cadastro — ${AVISO_GRAVACAO} com o fornecedor.`,
    );
  }

  return frases.length > 0 ? frases.join(' ') : null;
}
