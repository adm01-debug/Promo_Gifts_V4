import { describe, it, expect } from 'vitest';
import {
  DAR_VALID_TRANSITIONS,
  darDecisionTarget,
  isValidDiscountApprovalTransition,
  assertDiscountApprovalTransition,
  type DiscountApprovalStatus,
} from '@/lib/discount-approval-status-config';

/**
 * FE ⇄ DB transition-consistency guard para `discount_approval_requests`.
 *
 * O DB é a autoridade final (ver cabeçalho do módulo):
 *   - INSERT só nasce 'pending' (fn_dar_enforce_initial_status);
 *   - terminal -> 'pending' é REJEITADO (fn_dar_forbid_reopen);
 *   - respond_discount_approval_transactional rejeita decisão sobre linha
 *     não-pending ('Decisão terminal conflitante');
 *   - 'expired' é reservado a automação DB — nunca alvo de escrita do app.
 *
 * Invariante: o FE nunca oferece uma transição que o DB rejeitaria.
 */
const ALL: DiscountApprovalStatus[] = ['pending', 'approved', 'rejected', 'expired'];

/** Modelo do que o DB aceita hoje para escrita humana/app. */
function dbAllows(from: DiscountApprovalStatus, to: DiscountApprovalStatus): boolean {
  if (from === to) return true; // no-op update
  // fn_dar_forbid_reopen: terminal -> pending sempre rejeitado
  if (to === 'pending') return false;
  // validate_discount_approval_status: 'expired' não é valor gravável
  if (to === 'expired') return false;
  return true; // approved/rejected em qualquer origem passam no CHECK/trigger
}

describe('DAR transitions — FE ⊆ DB (sem ação quebrada na UI)', () => {
  it('FE nunca oferece transição que o DB rejeita', () => {
    const violations: string[] = [];
    for (const from of ALL)
      for (const to of ALL) {
        if (from === to) continue;
        if (isValidDiscountApprovalTransition(from, to) && !dbAllows(from, to))
          violations.push(`${from}->${to}`);
      }
    expect(violations).toEqual([]);
  });

  it('só pending decide; approved/rejected/expired são terminais', () => {
    expect([...DAR_VALID_TRANSITIONS.pending]).toEqual(['approved', 'rejected']);
    expect([...DAR_VALID_TRANSITIONS.approved]).toEqual([]);
    expect([...DAR_VALID_TRANSITIONS.rejected]).toEqual([]);
    expect([...DAR_VALID_TRANSITIONS.expired]).toEqual([]);
  });

  it('pares inválidos explícitos (regressão)', () => {
    const BLOCKED: ReadonlyArray<[DiscountApprovalStatus, DiscountApprovalStatus]> = [
      ['approved', 'rejected'],
      ['rejected', 'approved'],
      ['approved', 'pending'],
      ['rejected', 'pending'],
      ['expired', 'pending'],
      ['pending', 'expired'],
      ['pending', 'pending'],
      ['approved', 'expired'],
    ];
    for (const [from, to] of BLOCKED) {
      expect(isValidDiscountApprovalTransition(from, to), `${from}->${to}`).toBe(false);
    }
  });

  it('estrutural: sem self-loops; alvos são status reais', () => {
    for (const s of ALL) {
      const outs = DAR_VALID_TRANSITIONS[s] as readonly DiscountApprovalStatus[];
      expect(outs.includes(s), `${s} self-loop`).toBe(false);
      for (const t of outs) expect(ALL.includes(t), `${s}->${t} alvo desconhecido`).toBe(true);
    }
  });

  it('from-status desconhecido/lixo → false (sem throw)', () => {
    for (const g of ['NOPE', undefined, null, '', 'PENDING', 'cancelled']) {
      expect(
        isValidDiscountApprovalTransition(g as unknown as DiscountApprovalStatus, 'approved'),
      ).toBe(false);
    }
  });
});

describe('darDecisionTarget — SSOT do ternário de decisão', () => {
  it('mapeia approved→approved / rejected→rejected', () => {
    expect(darDecisionTarget(true)).toBe('approved');
    expect(darDecisionTarget(false)).toBe('rejected');
  });

  it('todo alvo de decisão é alcançável a partir de pending', () => {
    for (const approved of [true, false]) {
      expect(isValidDiscountApprovalTransition('pending', darDecisionTarget(approved))).toBe(true);
    }
  });
});

describe('assertDiscountApprovalTransition', () => {
  it('não lança para transições válidas e no-op (from === to)', () => {
    expect(() => assertDiscountApprovalTransition('pending', 'approved')).not.toThrow();
    expect(() => assertDiscountApprovalTransition('approved', 'approved')).not.toThrow();
  });

  it('lança erro descritivo para transição inválida', () => {
    expect(() => assertDiscountApprovalTransition('approved', 'pending')).toThrow(
      /Transição de status inválida/,
    );
  });
});
