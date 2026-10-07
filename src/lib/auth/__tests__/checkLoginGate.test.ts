/**
 * Matriz do gate server-side `check-login` (validação exaustiva 2026-10:
 * o caminho do gate tinha zero testes e uma regressão aqui passava em
 * silêncio).
 *
 * Cobre os três desfechos do evaluateLoginGate:
 *   1. bloqueio real (allowed=false com reason de regra) → 403
 *   2. falha operacional (edge fora/erro) → fail-open (null), exceto
 *      quando há turnstileToken — aí anti-bot contornado vira 503
 *   3. sucesso → null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateLoginGate,
  isOperationalGateBlock,
  gateBlockMessage,
  TURNSTILE_GATE_UNAVAILABLE_MESSAGE,
  type LoginGateLogger,
} from '@/lib/auth/checkLoginGate';

const mockInvokeEdge = vi.fn();
vi.mock('@/lib/edge/safeInvokeCall', () => ({
  invokeEdge: (...args: unknown[]) => mockInvokeEdge(...args),
}));

function makeLog(): LoginGateLogger & { warned: string[] } {
  const warned: string[] = [];
  return {
    warned,
    requestId: 'req-test',
    headers: () => ({ 'x-request-id': 'req-test' }),
    warn: (event: string) => {
      warned.push(event);
    },
  };
}

beforeEach(() => {
  mockInvokeEdge.mockReset();
});

describe('isOperationalGateBlock', () => {
  it.each(['security_check_unavailable', 'internal_error_fail_closed', 'turnstile_unavailable'])(
    'allowed=false + reason operacional %s → true',
    (reason) => {
      expect(isOperationalGateBlock({ allowed: false, reason })).toBe(true);
    },
  );

  it.each([
    { allowed: true, reason: 'security_check_unavailable' },
    { allowed: false, reason: 'login_blocked' },
    { allowed: false, reason: 'security_check_error_fail_closed' },
    { allowed: false },
    null,
    undefined,
  ])('%o → false', (gate) => {
    expect(isOperationalGateBlock(gate)).toBe(false);
  });
});

describe('gateBlockMessage', () => {
  it('reason turnstile_* → copy de desafio (ignora blocked_until)', () => {
    expect(
      gateBlockMessage({
        allowed: false,
        reason: 'turnstile_failed',
        blocked_until: '2030-01-01T00:00:00Z',
      }),
    ).toBe('Verificação de segurança não aprovada. Resolva o desafio e tente novamente.');
  });

  it('blocked_until válido → mensagem com horário pt-BR', () => {
    const msg = gateBlockMessage({
      allowed: false,
      reason: 'login_blocked',
      blocked_until: '2030-01-01T12:00:00Z',
    });
    expect(msg).toContain('Login bloqueado pelas regras de segurança até');
    expect(msg).not.toBe('Login bloqueado pelas regras de segurança da organização.');
  });

  it('blocked_until inválido → mensagem genérica', () => {
    expect(gateBlockMessage({ allowed: false, reason: 'x', blocked_until: 'n/a' })).toBe(
      'Login bloqueado pelas regras de segurança da organização.',
    );
  });

  it('sem blocked_until → mensagem genérica', () => {
    expect(gateBlockMessage({ allowed: false, reason: 'x' })).toBe(
      'Login bloqueado pelas regras de segurança da organização.',
    );
    expect(gateBlockMessage(null)).toBe(
      'Login bloqueado pelas regras de segurança da organização.',
    );
  });
});

describe('evaluateLoginGate', () => {
  it('allowed=true → null (prossegue)', async () => {
    mockInvokeEdge.mockResolvedValue({ data: { allowed: true }, error: null });
    expect(await evaluateLoginGate(makeLog(), 'a@b.com')).toBeNull();
    expect(mockInvokeEdge).toHaveBeenCalledWith(
      'check-login',
      expect.objectContaining({ maxRetries: 1, preserveErrorData: true }),
    );
  });

  it('allowed=false + reason de regra → 403 com blocked_until', async () => {
    mockInvokeEdge.mockResolvedValue({
      data: { allowed: false, reason: 'login_blocked', blocked_until: '2030-01-01T12:00:00Z' },
      error: null,
    });
    const log = makeLog();
    const block = await evaluateLoginGate(log, 'a@b.com');
    expect(block?.status).toBe(403);
    expect(block?.message).toContain('Login bloqueado pelas regras de segurança até');
    expect(log.warned).toContain('login_blocked_server');
  });

  it('allowed=false + security_check_error_fail_closed → 403 (decisão fail-closed da RPC)', async () => {
    mockInvokeEdge.mockResolvedValue({
      data: { allowed: false, reason: 'security_check_error_fail_closed' },
      error: null,
    });
    const block = await evaluateLoginGate(makeLog(), 'a@b.com');
    expect(block?.status).toBe(403);
  });

  it.each(['security_check_unavailable', 'internal_error_fail_closed', 'turnstile_unavailable'])(
    'allowed=false + %s sem token → null (fail-open operacional)',
    async (reason) => {
      mockInvokeEdge.mockResolvedValue({ data: { allowed: false, reason }, error: null });
      expect(await evaluateLoginGate(makeLog(), 'a@b.com')).toBeNull();
    },
  );

  it('allowed=false + turnstile_failed → 403 copy de desafio', async () => {
    mockInvokeEdge.mockResolvedValue({
      data: { allowed: false, reason: 'turnstile_failed' },
      error: null,
    });
    const block = await evaluateLoginGate(makeLog(), 'a@b.com');
    expect(block?.status).toBe(403);
    expect(block?.message).toContain('desafio');
  });

  it('erro de rede sem token → null (fail-open)', async () => {
    mockInvokeEdge.mockResolvedValue({ data: null, error: { status: 500, message: 'down' } });
    const log = makeLog();
    expect(await evaluateLoginGate(log, 'a@b.com')).toBeNull();
    expect(log.warned).toContain('check_login_unavailable');
  });

  it('erro de rede COM turnstileToken → 503 fail-closed (anti-bot)', async () => {
    mockInvokeEdge.mockResolvedValue({ data: null, error: { status: 500, message: 'down' } });
    const block = await evaluateLoginGate(makeLog(), 'a@b.com', 'tok-123');
    expect(block).toEqual({ message: TURNSTILE_GATE_UNAVAILABLE_MESSAGE, status: 503 });
  });

  it('exceção sem token → null', async () => {
    mockInvokeEdge.mockRejectedValue(new Error('boom'));
    expect(await evaluateLoginGate(makeLog(), 'a@b.com')).toBeNull();
  });

  it('exceção COM turnstileToken → 503', async () => {
    mockInvokeEdge.mockRejectedValue(new Error('boom'));
    const block = await evaluateLoginGate(makeLog(), 'a@b.com', 'tok-123');
    expect(block?.status).toBe(503);
  });

  it('turnstile_token é repassado no body (edge só verifica com secret)', async () => {
    mockInvokeEdge.mockResolvedValue({ data: { allowed: true }, error: null });
    await evaluateLoginGate(makeLog(), 'a@b.com', 'tok-abc');
    expect(mockInvokeEdge).toHaveBeenCalledWith(
      'check-login',
      expect.objectContaining({
        body: { email: 'a@b.com', turnstile_token: 'tok-abc' },
      }),
    );
  });
});
