export const CRM_TABLES = [
  'companies',
  'contacts',
  'company_addresses',
  'company_social_media',
  'contact_emails',
  'contact_phones',
  'customers',
  'suppliers',
  'carriers',
] as const;

export type CrmTable = (typeof CRM_TABLES)[number];

const COLUMNS: Record<CrmTable, readonly string[]> = {
  carriers: [
    'id',
    'company_id',
    'tipo_transporte',
    'grupo_economico',
    'estados_atendidos',
    'cidades_atendidas',
    'prazo_por_trecho',
    'tipo_frete',
    'tabela_frete',
    'transportadora_validada',
    'data_validacao',
    'ultimo_transporte',
    'observacoes',
    'spa_data',
    'created_at',
    'updated_at',
    'homologado',
    'data_homologacao',
    'score_geral',
  ],
  companies: [
    'id',
    'bitrix_company_id',
    'is_customer',
    'is_supplier',
    'is_carrier',
    'nome_crm',
    'razao_social',
    'nome_fantasia',
    'cnpj',
    'inscricao_estadual',
    'inscricao_municipal',
    'website',
    'ramo_atividade',
    'grupo_economico',
    'status',
    'logo_url',
    'merge_notes',
    'created_at',
    'updated_at',
    'bitrix_created_at',
    'bitrix_updated_at',
    'created_by_id',
    'grupo_economico_id',
    'is_matriz',
    'matriz_id',
    'tipo_cooperativa',
    'central_id',
    'singular_id',
    'financial_health',
    'employee_count',
    'annual_revenue',
    'competitors',
    'challenges',
    'tags_array',
    'deleted_at',
    'deleted_by',
    'search_vector',
    'cnpj_base',
    'cores_marca',
    'confederacao_id',
    'nicho_cliente',
    'data_fundacao',
    'capital_social',
    'natureza_juridica',
    'natureza_juridica_desc',
    'porte_rf',
    'situacao_rf',
    'situacao_rf_data',
    'extra_data_rf',
    'numero_cooperativa',
    'user_id',
    'lead_score',
    'lead_score_updated_at',
    'lead_status',
    'industry',
    'notes',
    'tags',
    'logo_color_url',
    'logo_mono_url',
    'vak_dominant',
    'motivation_direction',
    'working_style',
    'reference_frame',
    'chunk_size',
    'action_filter',
    'comparison_style',
    'most_frequent_objection',
    'vak_profile',
    'metaprogram_profile',
    'emotional_state',
    'emotional_confidence',
    'emotional_trigger',
    'cnpj_normalizado_em',
    'brand_colors',
    'social_media_searched_at',
    'verificado_em',
    'numero_cooperativa_singular',
    'version',
    'nome_crm_atualizado_em',
    'empresa_atualizada_em',
    'regime_tributario',
  ],
  company_addresses: [
    'id',
    'company_id',
    'tipo',
    'is_primary',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'estado',
    'pais',
    'latitude',
    'longitude',
    'ponto_referencia',
    'instrucoes_entrega',
    'horario_funcionamento',
    'created_at',
    'updated_at',
    'google_maps_url',
    'google_place_id',
    'origem',
    'cidade_ibge',
    'tipo_logradouro',
  ],
  company_social_media: [
    'id',
    'company_id',
    'plataforma',
    'handle',
    'url',
    'nome_perfil',
    'is_verified',
    'is_active',
    'seguidores',
    'data_ultima_verificacao',
    'observacoes',
    'origem',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
  ],
  contact_emails: [
    'id',
    'contact_id',
    'email_type',
    'email',
    'email_normalizado',
    'is_primary',
    'is_verified',
    'created_at',
    'updated_at',
    'fonte',
    'contexto',
    'confiabilidade',
  ],
  contact_phones: [
    'id',
    'contact_id',
    'phone_type',
    'numero_normalizado',
    'is_primary',
    'is_whatsapp',
    'is_verified',
    'observacao',
    'created_at',
    'updated_at',
    'numero_e164',
    'fonte',
    'contexto',
    'confiabilidade',
    'numero',
  ],
  contacts: [
    'id',
    'company_id',
    'bitrix_contact_id',
    'first_name',
    'last_name',
    'cargo',
    'departamento',
    'cpf',
    'data_nascimento',
    'sexo',
    'assigned_by_id',
    'source',
    'extra_data',
    'created_at',
    'updated_at',
    'bitrix_created_at',
    'role',
    'hobbies',
    'interests_array',
    'family_info',
    'personal_notes',
    'relationship_stage',
    'relationship_score',
    'sentiment',
    'behavior',
    'life_events',
    'tags_array',
    'birthday',
    'notes',
    'user_id',
    'full_name',
    'is_duplicate',
    'duplicate_of',
    'deleted_at',
    'deleted_by',
    'search_vector',
    'nome_tratamento',
    'apelido',
    'assinatura_contato',
    'role_title',
    'email',
    'phone',
    'whatsapp',
    'linkedin',
    'instagram',
    'twitter',
    'avatar_url',
    'tags',
    'interests',
    'vak_dominant',
    'motivation_direction',
    'working_style',
    'reference_frame',
    'chunk_size',
    'action_filter',
    'comparison_style',
    'most_frequent_objection',
    'vak_profile',
    'metaprogram_profile',
    'emotional_state',
    'emotional_confidence',
    'emotional_trigger',
    'last_interaction_at',
    'objection_patterns',
    'version',
  ],
  customers: [
    'id',
    'company_id',
    'ramo_atividade',
    'grupo_clientes',
    'tipo_cooperativa',
    'perfil_preco',
    'perfil_qualidade',
    'perfil_prazo',
    'poder_compra',
    'cliente_ativado',
    'ja_comprou',
    'vendedor_id',
    'data_entrada_carteira',
    'observacoes',
    'sobre',
    'spa_data',
    'created_at',
    'updated_at',
    'data_primeira_compra',
    'data_ultima_compra',
    'total_pedidos',
    'valor_total_compras',
    'sdr_id',
    'data_atribuicao_sdr',
    'vendedor_nome',
    'sdr_nome',
    'data_ativacao',
    'ativado_por',
    'primeiro_ativador_id',
    'primeiro_ativador_nome',
    'data_primeira_ativacao',
    'data_inativacao',
    'inativado_por_id',
    'inativado_por_nome',
    'motivo_inativacao',
    'ticket_medio',
    'deleted_at',
  ],
  suppliers: [
    'id',
    'company_id',
    'categoria',
    'tipo_fornecedor',
    'ramo_atividade',
    'grupo_economico',
    'produtos',
    'servicos',
    'api_url',
    'tem_integracao',
    'perfil_preco',
    'perfil_qualidade',
    'perfil_prazo',
    'prazo_entrega_medio',
    'pedido_minimo',
    'forma_pagamento',
    'prazo_pagamento',
    'spa_data',
    'created_at',
    'updated_at',
    'homologado',
    'data_homologacao',
    'score_geral',
  ],
};

const COLUMN_SETS = Object.fromEntries(
  Object.entries(COLUMNS).map(([table, columns]) => [table, new Set(columns)]),
) as Record<CrmTable, Set<string>>;

export const INTERNAL_SCOPE_ALIAS = '__seller_scope';
export const INTERNAL_ADDRESS_ALIAS = '__address_filter';

export type OwnershipRule =
  | { kind: 'direct'; filterColumn: 'vendedor_id' }
  | { kind: 'relation'; relation: string; embed: string; filterColumn: string };

export const OWNERSHIP_RULES: Record<CrmTable, OwnershipRule> = {
  companies: {
    kind: 'relation',
    relation: 'customers',
    embed: 'customers!inner(id)',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.vendedor_id`,
  },
  contacts: {
    kind: 'relation',
    relation: 'companies.customers',
    embed: 'companies!inner(customers!inner(id))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.customers.vendedor_id`,
  },
  company_addresses: {
    kind: 'relation',
    relation: 'companies.customers',
    embed: 'companies!inner(customers!inner(id))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.customers.vendedor_id`,
  },
  company_social_media: {
    kind: 'relation',
    relation: 'companies.customers',
    embed: 'companies!inner(customers!inner(id))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.customers.vendedor_id`,
  },
  contact_emails: {
    kind: 'relation',
    relation: 'contacts.companies.customers',
    embed: 'contacts!inner(companies!inner(customers!inner(id)))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.companies.customers.vendedor_id`,
  },
  contact_phones: {
    kind: 'relation',
    relation: 'contacts.companies.customers',
    embed: 'contacts!inner(companies!inner(customers!inner(id)))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.companies.customers.vendedor_id`,
  },
  customers: { kind: 'direct', filterColumn: 'vendedor_id' },
  suppliers: {
    kind: 'relation',
    relation: 'companies.customers',
    embed: 'companies!inner(customers!inner(id))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.customers.vendedor_id`,
  },
  carriers: {
    kind: 'relation',
    relation: 'companies.customers',
    embed: 'companies!inner(customers!inner(id))',
    filterColumn: `${INTERNAL_SCOPE_ALIAS}.customers.vendedor_id`,
  },
};

const RELATED_COMPANY_FILTERS = new Set(['cidade', 'estado']);
const FILTER_OPERATORS = new Set([
  'in',
  'ilike',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'not_null',
]);

export interface QueryColumnsInput {
  select?: string;
  returning?: string;
  filters?: Record<string, unknown>;
  search?: { column: string; term: string };
  orderBy?:
    | string
    | { column: string; ascending?: boolean }
    | Array<string | { column: string; ascending?: boolean }>;
}

export interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

export function isCrmTable(value: string | undefined): value is CrmTable {
  return !!value && CRM_TABLES.includes(value as CrmTable);
}

export function validateSelect(select: string | undefined, table: CrmTable): string | null {
  if (!select || select.trim() === '*') return null;
  const fields = select.split(',').map((field) => field.trim());
  if (fields.some((field) => !field || field === '*')) {
    return "Campo 'select' inválido";
  }
  const invalid = fields.find((field) => !COLUMN_SETS[table].has(field));
  return invalid ? `Coluna '${invalid}' não existe em '${table}'` : null;
}

export function validateFilters(
  filters: Record<string, unknown> | undefined,
  table: CrmTable,
): string | null {
  if (!filters) return null;
  for (const [column, value] of Object.entries(filters)) {
    const isRelatedCompanyFilter = table === 'companies' && RELATED_COMPANY_FILTERS.has(column);
    if (!COLUMN_SETS[table].has(column) && !isRelatedCompanyFilter) {
      return `Coluna '${column}' não é filtrável em '${table}'`;
    }
    if (Array.isArray(value)) return `Valor de filtro inválido para '${column}'`;
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return `Valor de filtro inválido para '${column}'`;
    }
    if (typeof value === 'string' && value.length > 1000) {
      return `Valor de filtro inválido para '${column}'`;
    }
    if (value === null || typeof value !== 'object') continue;
    const operators = Object.keys(value as Record<string, unknown>);
    if (operators.length === 0 || operators.some((operator) => !FILTER_OPERATORS.has(operator))) {
      return `Operador de filtro inválido para '${column}'`;
    }
    const expression = value as Record<string, unknown>;
    if (
      'in' in expression &&
      (!Array.isArray(expression.in) ||
        expression.in.length === 0 ||
        expression.in.length > 500 ||
        expression.in.some(
          (item) =>
            (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') ||
            (typeof item === 'number' && !Number.isFinite(item)) ||
            (typeof item === 'string' && item.length > 1000),
        ))
    ) {
      return `Filtro 'in' inválido para '${column}'`;
    }
    if (
      'ilike' in expression &&
      (typeof expression.ilike !== 'string' || expression.ilike.length > 500)
    ) {
      return `Filtro 'ilike' inválido para '${column}'`;
    }
    if ('not_null' in expression && expression.not_null !== true) {
      return `Filtro 'not_null' inválido para '${column}'`;
    }
    for (const operator of ['eq', 'neq', 'gt', 'gte', 'lt', 'lte']) {
      if (!(operator in expression)) continue;
      const operand = expression[operator];
      if (
        (typeof operand !== 'string' &&
          typeof operand !== 'number' &&
          typeof operand !== 'boolean' &&
          operand !== null) ||
        (typeof operand === 'number' && !Number.isFinite(operand)) ||
        (typeof operand === 'string' && operand.length > 1000)
      ) {
        return `Operando '${operator}' inválido para '${column}'`;
      }
    }
  }
  return null;
}

export function validateQueryColumns(input: QueryColumnsInput, table: CrmTable): string | null {
  const selectError = validateSelect(input.select, table);
  if (selectError) return selectError;
  const returningError = validateSelect(input.returning, table);
  if (returningError) return returningError;
  const filterError = validateFilters(input.filters, table);
  if (filterError) return filterError;
  if (input.search && !COLUMN_SETS[table].has(input.search.column)) {
    return `Coluna '${input.search.column}' não existe em '${table}'`;
  }
  const clauses = input.orderBy
    ? Array.isArray(input.orderBy)
      ? input.orderBy
      : [input.orderBy]
    : [];
  for (const clause of clauses) {
    const column = typeof clause === 'string' ? clause.trim().split(/\s+/)[0] : clause.column;
    if (!COLUMN_SETS[table].has(column)) {
      return `Coluna de ordenação '${column}' não existe em '${table}'`;
    }
  }
  return null;
}

export function isSellerScopedRole(role: string | undefined): boolean {
  return role === 'vendedor' || role === 'agente';
}

export function isRestrictedWriteRole(role: string | undefined): boolean {
  return role === 'vendedor' || role === 'agente' || role === 'coordenador';
}

export function hasMutationTarget(
  id: string | undefined,
  filters: Record<string, unknown> | undefined,
): boolean {
  return !!id || (!!filters && Object.keys(filters).length > 0);
}

export function buildSellerScopedSelect(
  select: string | undefined,
  table: CrmTable,
  sellerScoped: boolean,
): string {
  const base = select || '*';
  if (!sellerScoped) return base;
  const rule = OWNERSHIP_RULES[table];
  if (rule.kind === 'direct') return base;
  return `${base},${INTERNAL_SCOPE_ALIAS}:${rule.embed}`;
}

export function sellerScopeFilter(table: CrmTable): { column: string; relation?: string } {
  const rule = OWNERSHIP_RULES[table];
  if (rule.kind === 'direct') return { column: rule.filterColumn };
  return { column: rule.filterColumn, relation: rule.relation };
}

export function splitCompanyAddressFilters(filters: Record<string, unknown> | undefined): {
  direct: Record<string, unknown>;
  address: Record<string, unknown>;
} {
  const direct: Record<string, unknown> = {};
  const address: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (RELATED_COMPANY_FILTERS.has(key)) address[key] = value;
    else direct[key] = value;
  }
  return { direct, address };
}

export function addCompanyAddressFilterSelect(
  select: string,
  addressFilters: Record<string, unknown>,
): string {
  if (Object.keys(addressFilters).length === 0) return select;
  return `${select},${INTERNAL_ADDRESS_ALIAS}:company_addresses!inner(id)`;
}

export function stripInternalRelations<T>(value: T): T {
  const stripRow = (row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const clone = { ...(row as Record<string, unknown>) };
    delete clone[INTERNAL_SCOPE_ALIAS];
    delete clone[INTERNAL_ADDRESS_ALIAS];
    return clone;
  };
  if (Array.isArray(value)) return value.map(stripRow) as T;
  return stripRow(value) as T;
}

export function mapPostgrestErrorStatus(
  error: PostgrestErrorLike | null | undefined,
  status?: number,
): number {
  const code = error?.code ?? '';
  if (code === 'PGRST116') return 404;
  if (code === 'PGRST003') return 504;
  if (/^PGRST00[0-2]$/.test(code)) return 503;
  if (/^PGRST2/.test(code)) return code === 'PGRST205' ? 404 : 400;
  if (/^PGRST1/.test(code)) return 400;
  if (code === '57014' || /statement timeout/i.test(error?.message ?? '')) return 504;
  if (code === '23503' || code === '23505') return 409;
  if (code === '42501') return 403;
  if (/^08/.test(code) || /^53/.test(code) || /^57P0/.test(code) || /^58/.test(code)) return 503;
  if (status && status >= 400 && status <= 599) return status;
  if (/^(22|23|42)/.test(code)) return 400;
  return 500;
}

export function isTransientCrmFailure(status: number, error?: PostgrestErrorLike | null): boolean {
  if (status < 500) return false;
  const code = error?.code ?? '';
  if (
    code === '57014' ||
    /^08/.test(code) ||
    /^53/.test(code) ||
    /^57P0/.test(code) ||
    /^58/.test(code)
  ) {
    return true;
  }
  return status === 500 || status === 502 || status === 503 || status === 504;
}
