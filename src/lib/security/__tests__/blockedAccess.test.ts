import { describe, expect, it } from 'vitest';
import {
  BLOCKED_ACCESS_ALL_REASONS,
  DEFAULT_BLOCKED_ACCESS_FILTERS,
  UNKNOWN_BLOCK_REASON,
  buildBlockedAccessCsv,
  describeBlockReason,
  filterBlockedAccess,
  formatBlockedAccessLocation,
  isCatalogedBlockReason,
  listBlockedAccessReasons,
  sortBlockedAccess,
  summarizeBlockedAccess,
  truncateUserAgent,
  type BlockedAccessFilters,
  type BlockedAccessRow,
} from '../blockedAccess';

const NOW = Date.parse('2026-11-26T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function row(over: Partial<BlockedAccessRow> = {}): BlockedAccessRow {
  return {
    id: over.id ?? 'r1',
    email: over.email === undefined ? 'cliente@empresa.com' : over.email,
    ip_address: over.ip_address ?? '200.10.10.10',
    city: over.city === undefined ? 'São Paulo' : over.city,
    state: over.state === undefined ? 'SP' : over.state,
    country: over.country === undefined ? 'BR' : over.country,
    block_reason: over.block_reason ?? 'too_many_failed_attempts',
    user_agent: over.user_agent === undefined ? 'Mozilla/5.0 (Windows)' : over.user_agent,
    created_at: over.created_at ?? new Date(NOW - 2 * HOUR).toISOString(),
  };
}

function filters(over: Partial<BlockedAccessFilters> = {}): BlockedAccessFilters {
  return { ...DEFAULT_BLOCKED_ACCESS_FILTERS, ...over };
}

describe('describeBlockReason', () => {
  it('traduz motivo catalogado com gravidade real', () => {
    const info = describeBlockReason('ip_not_whitelisted');
    expect(info.label).toBe('IP fora da whitelist');
    expect(info.severity).toBe('critico');
  });

  it('trata excesso de tentativas como atenção, não como crítico', () => {
    expect(describeBlockReason('too_many_failed_attempts').severity).toBe('atencao');
  });

  it('cai no fallback para motivo não catalogado', () => {
    expect(describeBlockReason('motivo_novo_de_versao_futura')).toEqual(UNKNOWN_BLOCK_REASON);
    expect(isCatalogedBlockReason('motivo_novo_de_versao_futura')).toBe(false);
    expect(isCatalogedBlockReason('ip_blocked')).toBe(true);
  });

  it('cai no fallback quando o motivo é nulo ou vazio', () => {
    expect(describeBlockReason(null)).toEqual(UNKNOWN_BLOCK_REASON);
    expect(describeBlockReason(undefined)).toEqual(UNKNOWN_BLOCK_REASON);
    expect(describeBlockReason('')).toEqual(UNKNOWN_BLOCK_REASON);
  });
});

describe('filterBlockedAccess', () => {
  it('corta o período de 24h', () => {
    const rows = [
      row({ id: 'novo', created_at: new Date(NOW - 2 * HOUR).toISOString() }),
      row({ id: 'velho', created_at: new Date(NOW - 25 * HOUR).toISOString() }),
    ];
    expect(filterBlockedAccess(rows, filters({ period: '24h' }), NOW).map((r) => r.id)).toEqual([
      'novo',
    ]);
  });

  it('mantém o registro exatamente na borda de 24h', () => {
    const rows = [row({ id: 'borda', created_at: new Date(NOW - 24 * HOUR).toISOString() })];
    expect(filterBlockedAccess(rows, filters({ period: '24h' }), NOW)).toHaveLength(1);
  });

  it('descarta data inválida em período e mantém em "tudo"', () => {
    const rows = [row({ id: 'sem-data', created_at: 'data-invalida' })];
    expect(filterBlockedAccess(rows, filters({ period: '7d' }), NOW)).toHaveLength(0);
    expect(filterBlockedAccess(rows, filters({ period: 'tudo' }), NOW)).toHaveLength(1);
  });

  it('busca por e-mail sem diferenciar maiúsculas', () => {
    const rows = [
      row({ id: 'alvo', email: 'Ana.Silva@Empresa.com' }),
      row({ id: 'outro', email: 'bruno@empresa.com' }),
    ];
    expect(
      filterBlockedAccess(rows, filters({ search: 'ana.silva' }), NOW).map((r) => r.id),
    ).toEqual(['alvo']);
  });

  it('busca por IP parcial e por navegador', () => {
    const rows = [
      row({ id: 'ip', ip_address: '187.55.4.9' }),
      row({ id: 'ua', user_agent: 'curl/8.0' }),
    ];
    expect(filterBlockedAccess(rows, filters({ search: '187.55' }), NOW).map((r) => r.id)).toEqual([
      'ip',
    ]);
    expect(filterBlockedAccess(rows, filters({ search: 'curl' }), NOW).map((r) => r.id)).toEqual([
      'ua',
    ]);
  });

  it('recorta por motivo específico', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b', block_reason: 'city_not_whitelisted' })];
    expect(
      filterBlockedAccess(rows, filters({ reason: 'city_not_whitelisted' }), NOW).map((r) => r.id),
    ).toEqual(['b']);
  });

  it('combina período, motivo e busca', () => {
    const rows = [
      row({ id: 'match', block_reason: 'ip_blocked', email: 'alvo@empresa.com' }),
      row({ id: 'outro-motivo', block_reason: 'ip_blocked', email: 'outro@empresa.com' }),
      row({
        id: 'fora-do-periodo',
        block_reason: 'ip_blocked',
        email: 'alvo@empresa.com',
        created_at: new Date(NOW - 30 * HOUR).toISOString(),
      }),
    ];
    const out = filterBlockedAccess(
      rows,
      filters({ reason: 'ip_blocked', search: 'alvo', period: '24h' }),
      NOW,
    );
    expect(out.map((r) => r.id)).toEqual(['match']);
  });

  it('não filtra nada com "todos" e busca em branco', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b', block_reason: 'x' })];
    expect(
      filterBlockedAccess(rows, filters({ reason: BLOCKED_ACCESS_ALL_REASONS, search: '  ' }), NOW),
    ).toHaveLength(2);
  });
});

describe('summarizeBlockedAccess', () => {
  it('conta total, 24h e 7d', () => {
    const rows = [
      row({ id: 'a', created_at: new Date(NOW - 1 * HOUR).toISOString() }),
      row({ id: 'b', created_at: new Date(NOW - 48 * HOUR).toISOString() }),
      row({ id: 'c', created_at: new Date(NOW - 10 * 24 * HOUR).toISOString() }),
    ];
    const summary = summarizeBlockedAccess(rows, NOW);
    expect(summary.total).toBe(3);
    expect(summary.last24h).toBe(1);
    expect(summary.last7d).toBe(2);
  });

  it('ignora data inválida nas janelas sem perder o total', () => {
    const summary = summarizeBlockedAccess([row({ id: 'sem-data', created_at: 'xxxx' })], NOW);
    expect(summary.total).toBe(1);
    expect(summary.last24h).toBe(0);
  });

  it('conta IPs e e-mails distintos sem contar nulos nem vazios', () => {
    const rows = [
      row({ id: 'a', ip_address: '1.1.1.1', email: 'a@x.com' }),
      row({ id: 'b', ip_address: '1.1.1.1', email: 'a@x.com' }),
      row({ id: 'c', ip_address: '2.2.2.2', email: null }),
      row({ id: 'd', ip_address: '2.2.2.2', email: '' }),
    ];
    const summary = summarizeBlockedAccess(rows, NOW);
    expect(summary.uniqueIps).toBe(2);
    expect(summary.uniqueEmails).toBe(1);
  });

  it('conta gravidade crítica apenas pelo motivo', () => {
    const rows = [
      row({ id: 'a', block_reason: 'ip_blocked' }),
      row({ id: 'b', block_reason: 'too_many_failed_attempts' }),
      row({ id: 'c', block_reason: 'suspicious_pattern' }),
    ];
    expect(summarizeBlockedAccess(rows, NOW).critical).toBe(2);
  });

  it('ordena IPs por quantidade, respeita o limite e guarda a última vez', () => {
    const rows = [
      row({ id: 'a', ip_address: '9.9.9.9', created_at: new Date(NOW - 5 * HOUR).toISOString() }),
      row({ id: 'b', ip_address: '9.9.9.9', created_at: new Date(NOW - 1 * HOUR).toISOString() }),
      row({ id: 'c', ip_address: '8.8.8.8' }),
      row({ id: 'd', ip_address: '7.7.7.7' }),
    ];
    const summary = summarizeBlockedAccess(rows, NOW, 2);
    expect(summary.topIps).toHaveLength(2);
    expect(summary.topIps[0].ip).toBe('9.9.9.9');
    expect(summary.topIps[0].count).toBe(2);
    expect(summary.topIps[0].lastSeen).toBe(new Date(NOW - 1 * HOUR).toISOString());
  });

  it('ordena motivos por quantidade decrescente', () => {
    const rows = [
      row({ id: 'a', block_reason: 'city_not_whitelisted' }),
      row({ id: 'b', block_reason: 'ip_blocked' }),
      row({ id: 'c', block_reason: 'ip_blocked' }),
    ];
    const [first, second] = listBlockedAccessReasons(rows);
    expect(first.reason).toBe('ip_blocked');
    expect(first.count).toBe(2);
    expect(second.reason).toBe('city_not_whitelisted');
    expect(first.description.length).toBeGreaterThan(0);
  });
});

describe('sortBlockedAccess', () => {
  it('ordena do mais recente para o mais antigo e joga data inválida para o fim', () => {
    const rows = [
      row({ id: 'antigo', created_at: new Date(NOW - 10 * HOUR).toISOString() }),
      row({ id: 'invalido', created_at: 'nao-e-data' }),
      row({ id: 'novo', created_at: new Date(NOW - 1 * HOUR).toISOString() }),
    ];
    expect(sortBlockedAccess(rows).map((r) => r.id)).toEqual(['novo', 'antigo', 'invalido']);
  });
});

describe('formatBlockedAccessLocation', () => {
  it('monta cidade, estado e país', () => {
    expect(formatBlockedAccessLocation(row())).toBe('São Paulo / SP / BR');
  });

  it('usa apenas o que existe', () => {
    expect(formatBlockedAccessLocation(row({ city: null, state: null, country: 'PT' }))).toBe('PT');
  });

  it('devolve travessão quando não há local nenhum', () => {
    expect(formatBlockedAccessLocation(row({ city: null, state: null, country: null }))).toBe('—');
  });
});

describe('truncateUserAgent', () => {
  it('devolve travessão para vazio ou nulo', () => {
    expect(truncateUserAgent(null)).toBe('—');
    expect(truncateUserAgent('')).toBe('—');
  });

  it('mantém texto curto e corta texto longo com reticências', () => {
    expect(truncateUserAgent('curl/8.0')).toBe('curl/8.0');
    const out = truncateUserAgent('a'.repeat(100), 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('buildBlockedAccessCsv', () => {
  it('escreve cabeçalho e uma linha por registro, com motivo traduzido', () => {
    const csv = buildBlockedAccessCsv([row({ id: 'a' })]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Quando;E-mail;IP');
    expect(lines[1]).toContain('cliente@empresa.com');
    expect(lines[1]).toContain('Excesso de tentativas de login');
    expect(lines[1]).toContain('too_many_failed_attempts');
    expect(lines).toHaveLength(2);
  });

  it('protege campos com ponto e vírgula, aspas e quebra de linha', () => {
    const csv = buildBlockedAccessCsv([
      row({ id: 'a', ip_address: '1.1.1.1', user_agent: 'Mozilla; "com" aspas\ne quebra' }),
    ]);
    expect(csv).toContain('"Mozilla; ""com"" aspas\ne quebra"');
  });

  it('deixa e-mail nulo como campo vazio e ordena do mais recente para o mais antigo', () => {
    const rows = [
      row({ id: 'antigo', email: null, created_at: new Date(NOW - 9 * HOUR).toISOString() }),
      row({
        id: 'novo',
        email: 'novo@empresa.com',
        created_at: new Date(NOW - 1 * HOUR).toISOString(),
      }),
    ];
    const lines = buildBlockedAccessCsv(rows).split('\n');
    expect(lines[1]).toContain('novo@empresa.com');
    expect(lines[2].split(';')[1]).toBe('');
  });
});
