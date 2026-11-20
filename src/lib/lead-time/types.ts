/**
 * Tipos de entrada e saída do prazo de produção.
 *
 * Cada campo de entrada espelha uma coluna do banco (indicada no comentário),
 * mas o módulo NÃO conhece linhas cruas: quem carrega os dados (hook, bloco H
 * parte 2) converte para estes objetos simples.
 */

/** Dia civil `YYYY-MM-DD` (calendário de America/Sao_Paulo; sem hora, sem fuso). */
export type IsoDate = string;

export type LeadTimeIssueCode =
  'invalid_input' | 'personalization_lead_time' | 'supplier_lead_time';

/** Problema devolvido (nunca lançado). `message` já vem em PT-BR para a tela. */
export interface LeadTimeIssue {
  code: LeadTimeIssueCode;
  message: string;
  productId: string | null;
}

export type LeadTimeResult<T> = { ok: false; issue: LeadTimeIssue } | { ok: true; value: T };

/** Prazo do fornecedor para um produto. */
export interface ProductLeadTimeInput {
  /** products.id (= quote_items.product_id; item sem produto o chamador trata como pendência antes) */
  productId: string;
  /** products.lead_time_days (dias úteis; null = sem exceção própria) */
  leadTimeDays: number | null;
}

export interface SupplierLeadTimeInput {
  /** supplier_settings.default_lead_time_days (dias úteis; null = não cadastrado) */
  defaultLeadTimeDays: number | null;
}

export type SupplierLeadTimeSource = 'product_exception' | 'supplier_default';

export interface SupplierLeadTime {
  days: number;
  source: SupplierLeadTimeSource;
}

/** Regra de várias personalizações no mesmo item: freight_settings.multi_personalization_rule. */
export type MultiPersonalizationRule = 'max' | 'sum';

/** Uma personalização do item (quote_item_personalizations). */
export interface PersonalizationInput {
  /**
   * Id da tabela de preço de gravação (tabela_preco_gravacao_oficial.id). Quem carrega os dados
   * lê a linha de print_area_techniques cujo `id` é quote_item_personalizations.technique_id
   * e passa o `tabela_preco_id` dela aqui.
   */
  techniqueId: string;
  /** quote_item_personalizations.location_code */
  locationCode: string | null;
  /** quote_item_personalizations.personalized_quantity (null = usa a quantidade do item) */
  quantity: number | null;
}

/** Item do orçamento para o cálculo do prazo (quote_items). */
export interface PersonalizationItemInput {
  /** quote_items.product_id */
  productId: string;
  /** quote_items.quantity */
  quantity: number;
}

/** Técnica cadastrada por produto x local (print_area_techniques). */
export interface PrintAreaTechniqueInput {
  /** print_area_techniques.product_id */
  productId: string;
  /** print_area_techniques.location_code */
  locationCode: string;
  /** print_area_techniques.tabela_preco_id */
  tabelaPrecoId: string;
  /** print_area_techniques.production_days (coluna ainda não existe; null = usa a tabela) */
  productionDays: number | null;
}

/** Faixa da tabela de preço de gravação (tabela_preco_gravacao_oficial_faixa). */
export interface PriceBandInput {
  /** tabela_preco_gravacao_oficial_faixa.tabela_preco_gravacao_id */
  tabelaPrecoId: string;
  /** ...quantidade_minima (inclusiva) */
  minQuantity: number;
  /** ...quantidade_maxima (inclusiva; null = sem teto) */
  maxQuantity: number | null;
  /** ...prazo_dias (dias úteis; null = faixa sem prazo) */
  leadTimeDays: number | null;
}

export interface PersonalizationLookup {
  techniques: readonly PrintAreaTechniqueInput[];
  bands: readonly PriceBandInput[];
}

export type PersonalizationSource = 'price_table' | 'registered';

export interface PersonalizationLeadTimeEntry {
  techniqueId: string;
  locationCode: string | null;
  days: number;
  source: PersonalizationSource;
}

/** Como `LeadTimeResult`, mas a falha traz todas as pendências do item em `issues` (`issue` = a primeira). */
export type PersonalizationLeadTimeResult =
  | { ok: false; issue: LeadTimeIssue; issues: readonly LeadTimeIssue[] }
  | { ok: true; value: PersonalizationLeadTime };

export interface PersonalizationLeadTime {
  /** Dias combinados pela regra max|sum. 0 quando o item não tem personalização. */
  days: number;
  /** Origem da personalização que define o total (a mais demorada; null sem personalização). */
  source: PersonalizationSource | null;
  entries: PersonalizationLeadTimeEntry[];
}

/** Configuração do prazo (freight_settings). */
export interface ProductionLeadSettings {
  /** freight_settings.internal_buffer_days */
  internalBufferDays: number;
  /** freight_settings.multi_personalization_rule */
  multiPersonalizationRule: MultiPersonalizationRule;
  lookup: PersonalizationLookup;
}

export interface QuoteLeadTimeItem {
  /** quote_items.quantity */
  quantity: number;
  product: ProductLeadTimeInput;
  supplier: SupplierLeadTimeInput | null;
  personalizations: readonly PersonalizationInput[];
}

export interface QuoteLeadTimeInput {
  /** Dia da aprovação do orçamento; null = começa hoje. */
  approvedOn: IsoDate | null;
  items: readonly QuoteLeadTimeItem[];
}

export interface ItemLeadTime {
  productId: string;
  supplierDays: number;
  supplierSource: SupplierLeadTimeSource;
  personalizationDays: number;
  personalizationSource: PersonalizationSource | null;
  bufferDays: number;
  total: number;
  isCritical: boolean;
}

export type ProductionLeadTimeStatus = 'dados_insuficientes' | 'ok';

export interface ProductionLeadTime {
  status: ProductionLeadTimeStatus;
  perItem: ItemLeadTime[];
  /** Maior total entre os itens; null quando falta dado. */
  totalDays: number | null;
  /** Dia em que o pedido fica pronto; null quando falta dado. */
  readyDate: IsoDate | null;
  missing: LeadTimeIssue[];
}
