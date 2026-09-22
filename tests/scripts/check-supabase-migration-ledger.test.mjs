import { describe, expect, it } from 'vitest';
import {
  auditSupabaseMigrationLedger,
  parseCliOptions,
  parseSupabaseMigrationLedgerOutput,
} from '../../scripts/check-supabase-migration-ledger.mjs';

describe('check-supabase-migration-ledger', () => {
  it('aprova ledger integralmente alinhado', () => {
    const result = auditSupabaseMigrationLedger({
      migrations: [
        { local: '20260901000000', remote: '20260901000000' },
        { local: '20260901000001', remote: '20260901000001' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      rows: 2,
      matched: 2,
      local_only_count: 0,
      remote_only_count: 0,
      mismatched_count: 0,
    });
  });

  it('bloqueia migrations locais ainda não aplicadas', () => {
    const result = auditSupabaseMigrationLedger({
      migrations: [
        { local: '20260901000000', remote: '20260901000000' },
        { local: '20260901000001', remote: '' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toMatchObject({
      local_only_count: 1,
      local_only_sample: ['20260901000001'],
    });
  });

  it('bloqueia versões exclusivas do remoto e pares incompatíveis', () => {
    const result = auditSupabaseMigrationLedger({
      migrations: [
        { local: '', remote: '20260901000001' },
        { local: '20260901000002', remote: '20260901000003' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toMatchObject({
      remote_only_count: 1,
      mismatched_count: 1,
      remote_only_sample: ['20260901000001'],
      mismatched_sample: [{ local: '20260901000002', remote: '20260901000003' }],
    });
  });

  it('rejeita formatos incompletos e argumentos ambíguos', () => {
    expect(auditSupabaseMigrationLedger({ rows: [] })).toMatchObject({ ok: false });
    expect(() => parseCliOptions([])).toThrow('Uso:');
    expect(() => parseCliOptions(['ledger.json', '--summary'])).toThrow('--summary exige');
  });

  it('aceita a tabela textual emitida por versões antigas da CLI', () => {
    const document = parseSupabaseMigrationLedgerOutput(`
      Local                 | Remote                | Time (UTC)
      ----------------------|-----------------------|-----------------------
      \`20260901000000\`      | \`20260901000000\`      | \`2026-09-01 00:00:00\`
      \`20260901000001\`      | \` \`                   | \`2026-09-01 00:00:01\`
      \` \`                   | \`20260901000002\`      | \`2026-09-01 00:00:02\`
    `);

    expect(document).toEqual({
      migrations: [
        { local: '20260901000000', remote: '20260901000000', time: '2026-09-01 00:00:00' },
        { local: '20260901000001', remote: '', time: '2026-09-01 00:00:01' },
        { local: '', remote: '20260901000002', time: '2026-09-01 00:00:02' },
      ],
    });
  });
});
