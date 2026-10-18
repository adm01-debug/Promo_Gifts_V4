import { describe, it, expect } from 'vitest';
import {
  PASSWORD_RESET_VALID_TRANSITIONS,
  isValidPasswordResetTransition,
  assertPasswordResetTransition,
  type PasswordResetStatus,
} from '@/lib/password-reset-status-config';

/**
 * FE ⇄ DB transition-consistency guard para `password_reset_requests`.
 * O CHECK `password_reset_requests_status_check` (migration
 * 20260522113250_lote_a_03) restringe o conjunto a
 * {pending, approved, rejected}; a decisão do gestor é terminal
 * (re-decisão = nova solicitação).
 */
const ALL: PasswordResetStatus[] = ['pending', 'approved', 'rejected'];

describe('password-reset transitions — máquina de estados', () => {
  it('só pending decide; approved/rejected são terminais', () => {
    expect([...PASSWORD_RESET_VALID_TRANSITIONS.pending]).toEqual(['approved', 'rejected']);
    expect([...PASSWORD_RESET_VALID_TRANSITIONS.approved]).toEqual([]);
    expect([...PASSWORD_RESET_VALID_TRANSITIONS.rejected]).toEqual([]);
  });

  it('pares inválidos explícitos (regressão)', () => {
    const BLOCKED: ReadonlyArray<[PasswordResetStatus, PasswordResetStatus]> = [
      ['approved', 'rejected'],
      ['rejected', 'approved'],
      ['approved', 'pending'],
      ['rejected', 'pending'],
    ];
    for (const [from, to] of BLOCKED) {
      expect(isValidPasswordResetTransition(from, to), `${from}->${to}`).toBe(false);
    }
  });

  it('estrutural: sem self-loops; alvos são status reais', () => {
    for (const s of ALL) {
      const outs = PASSWORD_RESET_VALID_TRANSITIONS[s] as readonly PasswordResetStatus[];
      expect(outs.includes(s), `${s} self-loop`).toBe(false);
      for (const t of outs) expect(ALL.includes(t), `${s}->${t} alvo desconhecido`).toBe(true);
    }
  });

  it('from-status desconhecido/lixo → false (sem throw)', () => {
    for (const g of ['NOPE', undefined, null, '', 'PENDING', 'expired']) {
      expect(isValidPasswordResetTransition(g as unknown as PasswordResetStatus, 'approved')).toBe(
        false,
      );
    }
  });
});

describe('assertPasswordResetTransition', () => {
  it('não lança para transições válidas e no-op (from === to)', () => {
    expect(() => assertPasswordResetTransition('pending', 'approved')).not.toThrow();
    expect(() => assertPasswordResetTransition('rejected', 'rejected')).not.toThrow();
  });

  it('lança erro descritivo para transição inválida', () => {
    expect(() => assertPasswordResetTransition('approved', 'pending')).toThrow(
      /Transição de status inválida/,
    );
  });
});
