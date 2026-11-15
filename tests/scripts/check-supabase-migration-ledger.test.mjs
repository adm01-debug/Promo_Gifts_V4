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

  it('não bloqueia migrations locais ainda não aplicadas (staged/pendentes)', () => {
    const result = auditSupabaseMigrationLedger({
      migrations: [
        { local: '20260901000000', remote: '20260901000000' },
        { local: '20260901000001', remote: '' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      local_only_count: 1,
      local_only_sample: ['20260901000001'],
    });
  });

  it('versão remote_only na allowlist não bloqueia', () => {
    const result = auditSupabaseMigrationLedger(
      {
        migrations: [
          { local: '20260901000000', remote: '20260901000000' },
          { local: '', remote: '20260712' },
        ],
      },
      { remoteOnlyAllowlist: ['20260712'] },
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      blocking_remote_only_count: 0,
      allowlisted_remote_only_count: 1,
      allowlisted_remote_only_sample: ['20260712'],
    });
  });

  it('versão remote_only fora da allowlist ainda bloqueia', () => {
    const result = auditSupabaseMigrationLedger(
      {
        migrations: [
          { local: '', remote: '20260901000001' },
        ],
      },
      { remoteOnlyAllowlist: ['20260712'] },
    );

    expect(result.ok).toBe(false);
    expect(result.summary).toMatchObject({
      blocking_remote_only_count: 1,
      blocking_remote_only_sample: ['20260901000001'],
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

describe('pareamento sequencial da CLI (2026-11-12)', () => {
  it('versão listada como local-only E remote-only em linhas separadas conta como alinhada', () => {
    // Formato real visto no Gate E40: após o primeiro desalinhamento a CLI deixa de casar
    // versões iguais e emite a mesma versão nas duas colunas, em linhas diferentes.
    const doc = {
      migrations: [
        { local: '20260101000000', remote: '20260101000000' },
        { local: '20260511235950', remote: '' },
        { local: '20261104100000', remote: '' },
        { local: '', remote: '20261104100000' },
        { local: '', remote: '001' },
      ],
    };
    const r = auditSupabaseMigrationLedger(doc, { remoteOnlyAllowlist: ['001'] });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatchObject({ matched: 2, paired_late_count: 1, local_only_count: 1, remote_only_count: 1, blocking_remote_only_count: 0 });
  });

  it('remote-only real (sem arquivo local e fora da allowlist) continua bloqueando', () => {
    const doc = { migrations: [{ local: '', remote: '20261104100000' }, { local: '20260511235950', remote: '' }] };
    const r = auditSupabaseMigrationLedger(doc, { remoteOnlyAllowlist: [] });
    expect(r.ok).toBe(false);
    expect(r.summary.blocking_remote_only_sample).toEqual(['20261104100000']);
  });
});

describe('pareamento sequencial — multiconjunto (revisão 12/11)', () => {
  it('colisão legada: 2 arquivos locais com a mesma versão e 1 aplicada → sobra 1 local-only (igual ao caso sem desync)', () => {
    const v = '20260101000000';
    const semDesync = auditSupabaseMigrationLedger({ migrations: [{ local: v, remote: v }, { local: v, remote: '' }] });
    const comDesync = auditSupabaseMigrationLedger({
      migrations: [{ local: '', remote: v }, { local: v, remote: '' }, { local: v, remote: '' }],
    });
    expect(semDesync.summary.local_only_count).toBe(1);
    expect(comDesync.summary.local_only_count).toBe(semDesync.summary.local_only_count);
    expect(comDesync.summary.local_only_sample).toEqual([v]);
  });
});

describe('pareamento por CONTAGEM — reforço de mutantes L2/L5 (12/11)', () => {
  const v = '20261104100000';

  it('L2: versão 2× local-only e 1× remote-only → 1 pareada + 1 local-only, sumário exato', () => {
    const r = auditSupabaseMigrationLedger({
      migrations: [
        { local: '20260101000000', remote: '20260101000000' },
        { local: v, remote: '' },
        { local: v, remote: '' },
        { local: '', remote: v },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatchObject({
      rows: 4,
      matched: 2, // 1 alinhada na linha + 1 pareada tardia
      paired_late_count: 1,
      local_only_count: 1,
      local_only_sample: [v],
      remote_only_count: 0,
      blocking_remote_only_count: 0,
    });
  });

  it('L2: versão 1× local-only e 2× remote-only → 1 pareada + 1 remote-only bloqueante', () => {
    const r = auditSupabaseMigrationLedger({
      migrations: [{ local: v, remote: '' }, { local: '', remote: v }, { local: '', remote: v }],
    });
    expect(r.ok).toBe(false);
    expect(r.summary).toMatchObject({
      matched: 1,
      paired_late_count: 1,
      local_only_count: 0,
      remote_only_count: 1,
      blocking_remote_only_count: 1,
      blocking_remote_only_sample: [v],
    });
  });

  it('L5: paired_late_count conta OCORRÊNCIAS pareadas (não versões distintas) e entra em matched', () => {
    const w = '20261105100000';
    const r = auditSupabaseMigrationLedger({
      migrations: [
        { local: v, remote: '' },
        { local: v, remote: '' },
        { local: w, remote: '' },
        { local: '', remote: v },
        { local: '', remote: v },
        { local: '', remote: w },
        { local: '20261106100000', remote: '' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatchObject({
      matched: 3,
      paired_late_count: 3,
      local_only_count: 1,
      local_only_sample: ['20261106100000'],
      remote_only_count: 0,
    });
  });
});
