import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PLAN_PATH,
  classifyStages,
  parsePlan,
  summarizeStages,
  validateReceipts,
} from '../../scripts/plan-status.mjs';

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
    expect(summary.claimed).toBe(85);
    expect(summary.blocked).toBe(11);
    expect(summary.todo).toBe(104);
    expect(firstWave).toMatchObject({ done: 0, claimed: 6, blocked: 3, todo: 1 });
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

  it('falha fechado quando o plano perde uma etapa ou um critério Pronto', () => {
    const completeFixture = Array.from({ length: 200 }, (_, index) => {
      const id = `E${String(index + 1).padStart(3, '0')}`;
      return `#### P200-${id} · [A] · P0 · etapa ${id}\n**Pronto:** teste ${id}\n`;
    }).join('\n');
    expect(() => parsePlan(completeFixture.replace('#### P200-E200', '#### OTHER-E200'))).toThrow(/200 etapas únicas/);
    expect(() => parsePlan('#### P200-E001 · [A] · P0 · etapa\n\nSem critério.\n')).toThrow(/sem critério Pronto/);
  });
});
