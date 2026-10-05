/**
 * Copy de erro de login (validação exaustiva 2026-10) — cada status/mensagem
 * mapeia para a copy pt-BR correta; o 503 do gate Turnstile se distingue do
 * 503 real de manutenção.
 */
import { describe, it, expect } from 'vitest';
import { loginErrorCopy } from '@/pages/auth/loginErrorCopy';
import { TURNSTILE_GATE_UNAVAILABLE_MESSAGE } from '@/lib/auth/checkLoginGate';

describe('loginErrorCopy', () => {
  it('credenciais inválidas (400 ou mensagem GoTrue)', () => {
    expect(loginErrorCopy({ message: 'Invalid login credentials' }).title).toBe(
      'E-mail ou Senha Incorretos',
    );
    expect(loginErrorCopy({ message: 'x', status: 400 }).title).toBe('E-mail ou Senha Incorretos');
  });

  it('email não confirmado', () => {
    expect(loginErrorCopy({ message: 'Email not confirmed' }).title).toBe('E-mail não confirmado');
  });

  it('403 do gate server-side → repassa a mensagem (com blocked_until)', () => {
    const copy = loginErrorCopy({
      message: 'Login bloqueado pelas regras de segurança até 01/01/2030.',
      status: 403,
    });
    expect(copy.title).toBe('Acesso Bloqueado');
    expect(copy.description).toContain('01/01/2030');
  });

  it('429 com "after N seconds" → countdown do próprio valor', () => {
    const copy = loginErrorCopy({
      message: 'For security purposes, retry after 47 seconds',
      status: 429,
    });
    expect(copy.title).toBe('Acesso Temporariamente Suspenso');
    expect(copy.waitSeconds).toBe(47);
    expect(copy.hint).toContain('47');
  });

  it('429 sem tempo na mensagem → countdown default 60s', () => {
    const copy = loginErrorCopy({ message: 'rate limit exceeded', status: 429 });
    expect(copy.waitSeconds).toBe(60);
  });

  it.each([
    { message: 'network error' },
    { message: 'Failed to Fetch' },
    { message: 'x', status: 0 },
  ])('erro de conexão %o', (err) => {
    expect(loginErrorCopy(err).title).toBe('Erro de Conexão');
  });

  it('503 sintético do gate Turnstile → copy de verificação de segurança', () => {
    const copy = loginErrorCopy({
      message: TURNSTILE_GATE_UNAVAILABLE_MESSAGE,
      status: 503,
    });
    expect(copy.title).toBe('Verificação de segurança');
  });

  it('503 real (outra mensagem) → manutenção, não Turnstile', () => {
    expect(loginErrorCopy({ message: 'Service Unavailable', status: 503 }).title).toBe(
      'Sistema em Manutenção',
    );
  });

  it('5xx genérico → manutenção', () => {
    expect(loginErrorCopy({ message: 'x', status: 500 }).title).toBe('Sistema em Manutenção');
    expect(loginErrorCopy({ message: 'Database error on save' }).title).toBe(
      'Sistema em Manutenção',
    );
  });

  it('erro desconhecido → copy genérica', () => {
    expect(loginErrorCopy({ message: '???' }).title).toBe('Não foi possível entrar');
  });
});
