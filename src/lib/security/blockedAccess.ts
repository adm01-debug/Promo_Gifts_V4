/**
 * blockedAccess — regras puras de leitura de `public.access_blocked_log`.
 *
 * A tabela é escrita por `fn_check_login_allowed` (SECURITY DEFINER, chamada
 * pela edge function `check-login`) e pelas edge functions `check-login` e
 * `validate-access`. Os motivos catalogados abaixo vieram do corpo real dessas
 * rotinas, não de suposição: `ip_unknown_blocked`, `ip_not_whitelisted`,
 * `city_unknown_blocked`, `city_not_whitelisted`, `too_many_failed_attempts`.
 * Os demais constam no comentário da própria tabela como razões previstas do
 * ecossistema de segurança.
 *
 * Nada aqui recalcula bloqueio: a decisão é do banco. Este módulo só traduz,
 * filtra e resume o que já foi registrado.
 */

export interface BlockedAccessRow {
  id: string;
  email: string | null;
  ip_address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  block_reason: string;
  user_agent: string | null;
  created_at: string;
}

export type BlockedAccessSeverity = 'atencao' | 'critico' | 'info';

export interface BlockReasonInfo {
  label: string;
  description: string;
  severity: BlockedAccessSeverity;
}

export const SEVERITY_LABELS: Record<BlockedAccessSeverity, string> = {
  atencao: 'Atenção',
  critico: 'Crítico',
  info: 'Informativo',
};

export const UNKNOWN_BLOCK_REASON: BlockReasonInfo = {
  label: 'Motivo não catalogado',
  description:
    'Registrado por uma versão mais nova das rotinas de bloqueio. Confira o motivo técnico no detalhe.',
  severity: 'atencao',
};

export const BLOCK_REASON_CATALOG: Record<string, BlockReasonInfo> = {
  ip_unknown_blocked: {
    label: 'IP não identificado',
    description:
      'Whitelist de IP ativa e a requisição chegou sem IP legível — bloqueio preventivo.',
    severity: 'critico',
  },
  ip_not_whitelisted: {
    label: 'IP fora da whitelist',
    description: 'Whitelist de IP ativa e o IP de origem não está em ip_whitelist.',
    severity: 'critico',
  },
  ip_blocked: {
    label: 'IP bloqueado manualmente',
    description: 'IP presente na lista de bloqueio (ip_access_control / block-ip-temporarily).',
    severity: 'critico',
  },
  city_unknown_blocked: {
    label: 'Cidade não identificada',
    description: 'Whitelist de cidade ativa e a geolocalização não retornou cidade.',
    severity: 'atencao',
  },
  city_not_whitelisted: {
    label: 'Cidade fora da whitelist',
    description: 'Whitelist de cidade ativa e a cidade de origem não está em city_whitelist.',
    severity: 'atencao',
  },
  city_blocked: {
    label: 'Cidade bloqueada',
    description: 'Cidade cadastrada como bloqueada em city_whitelist.',
    severity: 'atencao',
  },
  country_not_allowed: {
    label: 'País não permitido',
    description: 'País de origem fora de geo_allowed_countries.',
    severity: 'critico',
  },
  too_many_failed_attempts: {
    label: 'Excesso de tentativas de login',
    description:
      'Falhas acumuladas em login_attempts acima de max_failed_attempts na janela de lockout.',
    severity: 'atencao',
  },
  rate_limit: {
    label: 'Limite de requisições',
    description: 'Volume de requisições acima do permitido em curto intervalo.',
    severity: 'atencao',
  },
  suspicious_pattern: {
    label: 'Padrão suspeito',
    description: 'Comportamento anômalo detectado automaticamente.',
    severity: 'critico',
  },
};

export function describeBlockReason(reason: string | null | undefined): BlockReasonInfo {
  if (reason === null || reason === undefined || reason === '') return UNKNOWN_BLOCK_REASON;
  const found = BLOCK_REASON_CATALOG[reason];
  if (!found) return UNKNOWN_BLOCK_REASON;
  return found;
}

export function isCatalogedBlockReason(reason: string): boolean {
  return BLOCK_REASON_CATALOG[reason] !== undefined;
}

function toMillis(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export type BlockedAccessPeriod = '7d' | '24h' | '30d' | 'tudo';

export const BLOCKED_ACCESS_PERIODS: BlockedAccessPeriod[] = ['24h', '7d', '30d', 'tudo'];

export const BLOCKED_ACCESS_PERIOD_LABELS: Record<BlockedAccessPeriod, string> = {
  '24h': 'Últimas 24 horas',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  tudo: 'Todo o período carregado',
};

const PERIOD_HOURS: Record<BlockedAccessPeriod, number | null> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  tudo: null,
};

export const BLOCKED_ACCESS_ALL_REASONS = 'todos';

export interface BlockedAccessFilters {
  search: string;
  reason: string;
  period: BlockedAccessPeriod;
}

export const DEFAULT_BLOCKED_ACCESS_FILTERS: BlockedAccessFilters = {
  search: '',
  reason: BLOCKED_ACCESS_ALL_REASONS,
  period: 'tudo',
};

function withinPeriod(row: BlockedAccessRow, period: BlockedAccessPeriod, nowMs: number): boolean {
  const hours = PERIOD_HOURS[period];
  if (hours === null) return true;
  const ts = toMillis(row.created_at);
  if (Number.isNaN(ts)) return false;
  return ts >= nowMs - hours * 60 * 60 * 1000;
}

function matchesSearch(row: BlockedAccessRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const haystack = [
    row.email ?? '',
    row.ip_address,
    row.city ?? '',
    row.state ?? '',
    row.country ?? '',
    row.block_reason,
    describeBlockReason(row.block_reason).label,
    row.user_agent ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterBlockedAccess(
  rows: BlockedAccessRow[],
  filters: BlockedAccessFilters,
  nowMs: number,
): BlockedAccessRow[] {
  return rows.filter((row) => {
    if (!withinPeriod(row, filters.period, nowMs)) return false;
    if (filters.reason !== BLOCKED_ACCESS_ALL_REASONS && row.block_reason !== filters.reason)
      return false;
    return matchesSearch(row, filters.search);
  });
}

export function sortBlockedAccess(rows: BlockedAccessRow[]): BlockedAccessRow[] {
  return [...rows].sort((a, b) => {
    const left = toMillis(a.created_at);
    const right = toMillis(b.created_at);
    const leftSafe = Number.isNaN(left) ? 0 : left;
    const rightSafe = Number.isNaN(right) ? 0 : right;
    if (rightSafe !== leftSafe) return rightSafe - leftSafe;
    return a.id.localeCompare(b.id);
  });
}

export interface BlockedAccessReasonCount {
  reason: string;
  label: string;
  description: string;
  severity: BlockedAccessSeverity;
  count: number;
}

export function listBlockedAccessReasons(rows: BlockedAccessRow[]): BlockedAccessReasonCount[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    counts.set(row.block_reason, (counts.get(row.block_reason) ?? 0) + 1);
  });
  const list: BlockedAccessReasonCount[] = [];
  counts.forEach((count, reason) => {
    const info = describeBlockReason(reason);
    list.push({
      reason,
      label: info.label,
      description: info.description,
      severity: info.severity,
      count,
    });
  });
  return list.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

export interface BlockedAccessIpCount {
  ip: string;
  count: number;
  lastSeen: string;
}

export interface BlockedAccessSummary {
  total: number;
  last24h: number;
  last7d: number;
  uniqueIps: number;
  uniqueEmails: number;
  critical: number;
  byReason: BlockedAccessReasonCount[];
  topIps: BlockedAccessIpCount[];
}

export function summarizeBlockedAccess(
  rows: BlockedAccessRow[],
  nowMs: number,
  topIpLimit = 5,
): BlockedAccessSummary {
  const dayMs = 24 * 60 * 60 * 1000;
  const ips = new Set<string>();
  const emails = new Set<string>();
  const perIp = new Map<string, BlockedAccessIpCount>();
  let last24h = 0;
  let last7d = 0;
  let critical = 0;

  rows.forEach((row) => {
    const ts = toMillis(row.created_at);
    if (!Number.isNaN(ts)) {
      if (ts >= nowMs - dayMs) last24h += 1;
      if (ts >= nowMs - 7 * dayMs) last7d += 1;
    }
    if (row.ip_address !== '') ips.add(row.ip_address);
    if (row.email !== null && row.email !== '') emails.add(row.email);
    if (describeBlockReason(row.block_reason).severity === 'critico') critical += 1;

    const current = perIp.get(row.ip_address);
    if (!current) {
      perIp.set(row.ip_address, { ip: row.ip_address, count: 1, lastSeen: row.created_at });
    } else {
      current.count += 1;
      if (toMillis(row.created_at) > toMillis(current.lastSeen)) current.lastSeen = row.created_at;
    }
  });

  const topIps = [...perIp.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.ip.localeCompare(b.ip);
    })
    .slice(0, topIpLimit);

  return {
    total: rows.length,
    last24h,
    last7d,
    uniqueIps: ips.size,
    uniqueEmails: emails.size,
    critical,
    byReason: listBlockedAccessReasons(rows),
    topIps,
  };
}

export function formatBlockedAccessLocation(row: BlockedAccessRow): string {
  const parts = [row.city, row.state, row.country].filter((part) => part !== null && part !== '');
  if (parts.length === 0) return '—';
  return parts.join(' / ');
}

export function truncateUserAgent(userAgent: string | null, maxLength = 48): string {
  if (userAgent === null || userAgent === '') return '—';
  if (userAgent.length <= maxLength) return userAgent;
  return `${userAgent.slice(0, maxLength - 1)}…`;
}

const CSV_HEADER = [
  'Quando',
  'E-mail',
  'IP',
  'Cidade',
  'Estado',
  'País',
  'Motivo',
  'Motivo (técnico)',
  'Gravidade',
  'Navegador',
];

function csvField(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvTimestamp(value: string): string {
  const ts = toMillis(value);
  if (Number.isNaN(ts)) return '';
  return new Date(ts).toISOString();
}

export function buildBlockedAccessCsv(rows: BlockedAccessRow[]): string {
  const lines = [CSV_HEADER.join(';')];
  sortBlockedAccess(rows).forEach((row) => {
    const info = describeBlockReason(row.block_reason);
    lines.push(
      [
        csvTimestamp(row.created_at),
        row.email ?? '',
        row.ip_address,
        row.city ?? '',
        row.state ?? '',
        row.country ?? '',
        info.label,
        row.block_reason,
        SEVERITY_LABELS[info.severity],
        row.user_agent ?? '',
      ]
        .map(csvField)
        .join(';'),
    );
  });
  return lines.join('\n');
}
