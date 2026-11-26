import { describe, expect, it } from 'vitest';
import {
  describeQuotaError,
  describeRemaining,
  isQuotaExhausted,
  isQuotaUnlimited,
  parseAiQuotaRows,
  roleLabel,
  summarizeAiQuota,
  usagePercent,
  type AiQuotaRow,
} from '../quota-summary';

function linha(over: Partial<AiQuotaRow> = {}): AiQuotaRow {
  return {
    userId: over.userId ?? '11111111-1111-1111-1111-111111111111',
    email: over.email ?? 'usuario@pgtv.test',
    role: over.role ?? 'vendedor',
    monthlyLimit: over.monthlyLimit ?? 10,
    isUnlimited: over.isUnlimited ?? false,
    usedThisMonth: over.usedThisMonth ?? 0,
    remaining: over.remaining ?? 10,
    successMonth: over.successMonth ?? 0,
    errorMonth: over.errorMonth ?? 0,
    pendingCount: over.pendingCount ?? 0,
    lastActivity: over.lastActivity ?? null,
  };
}

describe('parseAiQuotaRows', () => {
  it('devolve lista vazia quando o payload nao e um array', () => {
    expect(parseAiQuotaRows(null)).toEqual([]);
    expect(parseAiQuotaRows({ user_id: 'x' })).toEqual([]);
    expect(parseAiQuotaRows('erro')).toEqual([]);
  });

  it('descarta linhas sem user_id e mantem as validas', () => {
    const rows = parseAiQuotaRows([
      { user_id: '22222222-2222-2222-2222-222222222222', email: 'a@pgtv.test', role: 'vendedor' },
      { email: 'sem-id@pgtv.test', role: 'vendedor' },
      null,
      'lixo',
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe('a@pgtv.test');
  });

  it('normaliza numeros e booleanos vindos como texto', () => {
    const [row] = parseAiQuotaRows([
      {
        user_id: '33333333-3333-3333-3333-333333333333',
        email: 'dev@pgtv.test',
        role: 'dev',
        monthly_limit: '0',
        is_unlimited: 'true',
        used_this_month: '7',
        remaining: '-1',
        success_month: '7',
        error_month: '0',
        pending_count: '2',
        last_activity: '2026-11-26T12:00:00.000Z',
      },
    ]);
    expect(row).toMatchObject({
      monthlyLimit: 0,
      isUnlimited: true,
      usedThisMonth: 7,
      remaining: -1,
      pendingCount: 2,
      lastActivity: '2026-11-26T12:00:00.000Z',
    });
  });

  it('usa valores neutros quando o payload vem parcial', () => {
    const [row] = parseAiQuotaRows([{ user_id: '44444444-4444-4444-4444-444444444444' }]);
    expect(row).toMatchObject({
      email: null,
      role: 'desconhecido',
      monthlyLimit: 0,
      isUnlimited: false,
      usedThisMonth: 0,
      remaining: 0,
      pendingCount: 0,
      lastActivity: null,
    });
  });
});

describe('isQuotaUnlimited / isQuotaExhausted', () => {
  it('trata remaining = -1 como ilimitado mesmo sem a flag', () => {
    expect(isQuotaUnlimited(linha({ remaining: -1, isUnlimited: false }))).toBe(true);
    expect(isQuotaUnlimited(linha({ isUnlimited: true }))).toBe(true);
    expect(isQuotaUnlimited(linha({ remaining: 3 }))).toBe(false);
  });

  it('so marca esgotada quando ha limite e nenhuma chamada restante', () => {
    expect(isQuotaExhausted(linha({ remaining: 0 }))).toBe(true);
    expect(isQuotaExhausted(linha({ remaining: 0, isUnlimited: true }))).toBe(false);
    expect(isQuotaExhausted(linha({ remaining: -1 }))).toBe(false);
    expect(isQuotaExhausted(linha({ remaining: 2 }))).toBe(false);
  });
});

describe('usagePercent', () => {
  it('nao calcula percentual para cota ilimitada', () => {
    expect(usagePercent(linha({ isUnlimited: true, usedThisMonth: 40 }))).toBeNull();
  });

  it('calcula sobre o limite do papel', () => {
    expect(usagePercent(linha({ monthlyLimit: 10, usedThisMonth: 2 }))).toBe(20);
    expect(usagePercent(linha({ monthlyLimit: 3, usedThisMonth: 3 }))).toBe(100);
  });

  it('limita a 100% quando o consumo passa do teto', () => {
    expect(usagePercent(linha({ monthlyLimit: 5, usedThisMonth: 9 }))).toBe(100);
  });

  it('trata limite zero como cota sem teto configuravel', () => {
    expect(usagePercent(linha({ monthlyLimit: 0, usedThisMonth: 0 }))).toBe(0);
    expect(usagePercent(linha({ monthlyLimit: 0, usedThisMonth: 4 }))).toBe(100);
  });
});

describe('describeRemaining', () => {
  it('descreve os tres estados do contrato', () => {
    expect(describeRemaining(linha({ remaining: -1 }))).toBe('ilimitado');
    expect(describeRemaining(linha({ remaining: 0 }))).toBe('esgotado');
    expect(describeRemaining(linha({ remaining: 7 }))).toBe('7');
  });
});

describe('summarizeAiQuota', () => {
  it('conta ilimitados, estourados, pendentes e a ultima atividade', () => {
    const resumo = summarizeAiQuota([
      linha({ userId: 'a', remaining: -1, pendingCount: 1, lastActivity: '2026-11-26T10:00:00Z' }),
      linha({ userId: 'b', remaining: 0, pendingCount: 2, lastActivity: '2026-11-26T15:00:00Z' }),
      linha({ userId: 'c', remaining: 4, pendingCount: 0, lastActivity: null }),
    ]);
    expect(resumo).toEqual({
      usuarios: 3,
      ilimitados: 1,
      estourados: 1,
      pendentes: 3,
      ultimaAtividade: '2026-11-26T15:00:00Z',
    });
  });

  it('resume lista vazia sem quebrar', () => {
    expect(summarizeAiQuota([])).toEqual({
      usuarios: 0,
      ilimitados: 0,
      estourados: 0,
      pendentes: 0,
      ultimaAtividade: null,
    });
  });
});

describe('roleLabel', () => {
  it('traduz os papeis do app e preserva os desconhecidos', () => {
    expect(roleLabel('vendedor')).toBe('Agente');
    expect(roleLabel('dev')).toBe('Dev');
    expect(roleLabel('financeiro')).toBe('financeiro');
  });
});

describe('describeQuotaError', () => {
  it('explica o 42501 sem vazar a mensagem do banco', () => {
    const mensagem = describeQuotaError({
      code: '42501',
      message: 'Acesso restrito a administradores.',
    });
    expect(mensagem).toMatch(/administradora/);
    expect(mensagem).not.toMatch(/Acesso restrito/);
  });

  it('aponta a migration quando a funcao ainda nao existe no ambiente', () => {
    expect(describeQuotaError({ code: 'PGRST202' })).toMatch(/20261126191200/);
    expect(
      describeQuotaError({
        message: 'Could not find the function public.fn_admin_ai_quota_summary',
      }),
    ).toMatch(/20261126191200/);
  });

  it('cai no texto generico para erros sem mensagem', () => {
    expect(describeQuotaError(undefined)).toMatch(/Tente novamente/);
    expect(describeQuotaError({ message: 'boom' })).toMatch(/boom/);
    expect(describeQuotaError(new Error('timeout'))).toMatch(/timeout/);
  });
});
