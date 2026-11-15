import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PLAN_PATH,
  classifyStages,
  parsePlan,
  summarizeStages,
  validateReceipts,
} from '../../scripts/plan-status.mjs';

function stage(id, wave, status) {
  return { id, wave, status };
}

const plan = readFileSync(PLAN_PATH, 'utf8');

describe('plan-status — evidência verificável', () => {
  it('conta as 200 etapas e reconhece ✅ antes dos metadados do título', () => {
    const stages = parsePlan(plan);
    const ids = new Set(stages.map(({ id }) => id));

    expect(stages).toHaveLength(200);
    expect(ids.size).toBe(200);
    expect(stages.find(({ id }) => id === 'E126')).toMatchObject({ claimedDone: true, trail: 'D' });
    expect(stages.find(({ id }) => id === 'E127')).toMatchObject({ claimedDone: true, trail: 'D' });
  });

  it('não transforma checkmark manual em etapa verificada', () => {
    const stages = classifyStages(parsePlan(plan), {});
    const summary = summarizeStages(stages);
    const firstWave = summary.waves.find(({ wave }) => wave === 0);
    const nextWave = summary.waves.find(({ wave }) => wave === 1);

    expect(summary.done).toBe(0);
    expect(summary.claimed).toBe(86);
    expect(summary.blocked).toBe(11);
    expect(summary.todo).toBe(103);
    expect(firstWave).toMatchObject({ done: 0, claimed: 7, blocked: 3, todo: 0 });
    expect(summary.waveZeroClosed).toBe(false);
    expect(nextWave.eligible).toBe(false);
    expect(stages.filter(({ status }) => status === 'verified')).toHaveLength(0);
  });

  it('só aceita recibo com comando idêntico, saída zero, evidência, data e SHA completo', () => {
    const stage = parsePlan(plan).find(({ id }) => id === 'E010');
    const receipt = {
      schemaVersion: 1,
      records: {
        E010: {
          criterion: stage.criterion,
          exitCode: 0,
          evidence: 'node scripts/plan-status.mjs --json: total=200',
          verifiedAt: '2026-10-30T18:00:00.000Z',
          commit: 'a'.repeat(40),
        },
      },
    };
    const records = validateReceipts(receipt);
    const status = classifyStages([stage], records);

    expect(status[0].status).toBe('verified');
    expect(() => validateReceipts({ ...receipt, records: { E010: { ...receipt.records.E010, exitCode: 1 } } })).toThrow(/exitCode 0/);
    expect(classifyStages([stage], { E010: { ...receipt.records.E010, criterion: 'outro critério' } })[0].status).toBe('claimed');
  });

  it('calcula eligible pelo NÚMERO da onda, não pelo índice do array, quando há uma onda sem etapas', () => {
    // wave 2 não tem nenhuma etapa (ex.: resultado de um filtro por --wave/--priority/--trail
    // aplicado direto em summarizeStages). O array `waves` fica [w0, w1, w3] — o índice 2
    // deixa de corresponder à onda 2, e passa a apontar pra própria onda 3 (ainda sem
    // `eligible` atribuído nesta mesma iteração do loop).
    const stages = [
      ...Array.from({ length: 10 }, (_, i) => stage(`E${String(i + 1).padStart(3, '0')}`, 0, 'verified')),
      ...Array.from({ length: 10 }, (_, i) => stage(`E${String(i + 11).padStart(3, '0')}`, 1, 'verified')),
      // onda 2 — propositalmente vazia (gap)
      ...Array.from({ length: 10 }, (_, i) => stage(`E${String(i + 31).padStart(3, '0')}`, 3, 'verified')),
    ];
    const summary = summarizeStages(stages);
    const wave3 = summary.waves.find(({ wave }) => wave === 3);

    // Antes da correção: `waves[wave.wave - 1]` (índice 2) resolvia pra própria
    // onda 3 (self-reference) antes de `eligible` ser atribuído — o resultado
    // virava `undefined` (campo ausente no JSON), nunca um boolean `false`.
    expect(wave3.eligible).toBe(false);
    expect(typeof wave3.eligible).toBe('boolean');
  });

  it('falha fechado quando o plano perde uma etapa ou um critério Pronto', () => {
    const completeFixture = Array.from({ length: 200 }, (_, index) => {
      const id = `E${String(index + 1).padStart(3, '0')}`;
      return `#### P200-${id} · [A] · P0 · etapa ${id}\n**Pronto:** teste ${id}\n`;
    }).join('\n');
    expect(() => parsePlan(completeFixture.replace('#### P200-E200', '#### OTHER-E200'))).toThrow(/200 etapas únicas/);
    expect(() => parsePlan('#### P200-E001 · [A] · P0 · etapa\n\nSem critério.\n')).toThrow(/sem critério Pronto/);
  });
});
