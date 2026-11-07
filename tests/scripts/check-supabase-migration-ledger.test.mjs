import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  auditSupabaseMigrationLedger,
  parseCliOptions,
  parseSupabaseMigrationLedgerOutput,
  validateRemoteOnlyAllowlist,
  versionsDigest,
} from '../../scripts/check-supabase-migration-ledger.mjs';

const LEGACY_REMOTE_ONLY = [
  '001',
  '002',
  '003',
  '004',
  '005',
  '20260611014515',
  '20260623_bugalert1',
  '20260623_create_process_notifications_queue_rpcs',
  '20260623_fix_google_provider_secret_name',
  '2026062311292414001',
  '20260712',
  '20261101223908',
  '20261101232022',
];

function validAllowlist(overrides = {}) {
  return {
    schema_version: 1,
    project_ref: 'doufsxqlfjyuvxuezpln',
    versions: LEGACY_REMOTE_ONLY,
    versions_sha256: versionsDigest(LEGACY_REMOTE_ONLY),
    source: {
      workflow_run_id: 42384404829,
      artifact_id: 13579325560,
      artifact_sha256: '74cdf540be7f797fb9418cb7c1d1bf686075b36b35ae2a9b256380baede0101c',
      checked_at: '2026-11-07T15:08:50Z',
    },
    reason: 'Exceções históricas verificadas no ledger canônico e no artifact do gate.',
    approved_by: 'adm01-debug — autorização explícita em 2026-11-07',
    ...overrides,
  };
}

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

  it('reconcilia por conjunto quando a CLI separa a mesma versão em duas linhas', () => {
    const result = auditSupabaseMigrationLedger({
      migrations: [
        { local: '20260901000000', remote: '' },
        { local: '', remote: '20260901000000' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      matched: 1,
      local_only_count: 0,
      remote_only_count: 0,
      blocking_remote_only_count: 0,
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
        migrations: [{ local: '', remote: '20260901000001' }],
      },
      { remoteOnlyAllowlist: ['20260712'] },
    );

    expect(result.ok).toBe(false);
    expect(result.summary).toMatchObject({
      blocking_remote_only_count: 1,
      blocking_remote_only_sample: ['20260901000001'],
    });
  });

  it('bloqueia allowlist obsoleta para impedir exceção ampla ou não evidenciada', () => {
    const result = auditSupabaseMigrationLedger(
      { migrations: [{ local: '', remote: '20260712' }] },
      { remoteOnlyAllowlist: ['20260712', '20261107170000'] },
    );

    expect(result).toMatchObject({
      ok: false,
      summary: {
        blocking_remote_only_count: 0,
        stale_allowlisted_remote_only_count: 1,
        stale_allowlisted_remote_only_sample: ['20261107170000'],
      },
    });
  });

  it('trata colunas desalinhadas como conjuntos e bloqueia as versões remotas novas', () => {
    const result = auditSupabaseMigrationLedger({
      migrations: [
        { local: '', remote: '20260901000001' },
        { local: '20260901000002', remote: '20260901000003' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toMatchObject({
      local_only_count: 1,
      remote_only_count: 2,
      mismatched_count: 1,
      remote_only_sample: ['20260901000001', '20260901000003'],
      mismatched_sample: [{ local: '20260901000002', remote: '20260901000003' }],
    });
  });

  it('aceita exatamente as 13 exceções históricas e bloqueia uma décima quarta', () => {
    const legacyRows = LEGACY_REMOTE_ONLY.map((remote) => ({ local: '', remote }));
    const accepted = auditSupabaseMigrationLedger(
      { migrations: legacyRows },
      { remoteOnlyAllowlist: LEGACY_REMOTE_ONLY },
    );
    const rejected = auditSupabaseMigrationLedger(
      { migrations: [...legacyRows, { local: '', remote: '20261107170000' }] },
      { remoteOnlyAllowlist: LEGACY_REMOTE_ONLY },
    );

    expect(accepted).toMatchObject({
      ok: true,
      summary: { allowlisted_remote_only_count: 13, blocking_remote_only_count: 0 },
    });
    expect(rejected).toMatchObject({
      ok: false,
      summary: {
        allowlisted_remote_only_count: 13,
        blocking_remote_only_count: 1,
        blocking_remote_only_sample: ['20261107170000'],
      },
    });
  });

  it('usa o SELECT remoto autoritativo quando a CLI omite versões textuais', () => {
    const result = auditSupabaseMigrationLedger(
      {
        migrations: [{ local: '20260901000000', remote: '' }],
      },
      {
        remoteOnlyAllowlist: ['20260623_bugalert1'],
        authoritativeRemoteVersions: ['20260901000000', '20260623_bugalert1'],
      },
    );

    expect(result).toMatchObject({
      ok: true,
      summary: {
        remote_source: 'management-api-read-only-query',
        matched: 1,
        remote_only_count: 1,
        allowlisted_remote_only_sample: ['20260623_bugalert1'],
      },
    });

    const unexpected = auditSupabaseMigrationLedger(
      { migrations: [{ local: '20260901000000', remote: '20260901000000' }] },
      {
        authoritativeRemoteVersions: ['20260901000000', '20260623_nova_versao_oob'],
      },
    );
    expect(unexpected).toMatchObject({
      ok: false,
      summary: { blocking_remote_only_sample: ['20260623_nova_versao_oob'] },
    });
  });

  it('valida o manifesto de exceções em modo fail-closed', () => {
    expect(validateRemoteOnlyAllowlist(validAllowlist())).toEqual(LEGACY_REMOTE_ONLY);
    expect(() =>
      validateRemoteOnlyAllowlist(validAllowlist({ project_ref: 'projeto-errado' })),
    ).toThrow('project_ref');
    expect(() =>
      validateRemoteOnlyAllowlist(
        validAllowlist({ versions: [...LEGACY_REMOTE_ONLY, LEGACY_REMOTE_ONLY[0]] }),
      ),
    ).toThrow('duplicatas');
    expect(() =>
      validateRemoteOnlyAllowlist(validAllowlist({ versions: [...LEGACY_REMOTE_ONLY].reverse() })),
    ).toThrow('ordenado');
    expect(() =>
      validateRemoteOnlyAllowlist(validAllowlist({ versions_sha256: '0'.repeat(64) })),
    ).toThrow('sha256 divergente');
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

    const fromTable = auditSupabaseMigrationLedger(document, {
      remoteOnlyAllowlist: ['20260901000002'],
    });
    const fromJson = auditSupabaseMigrationLedger(
      {
        migrations: [
          { local: '20260901000000', remote: '20260901000000' },
          { local: '20260901000001', remote: '' },
          { local: '', remote: '20260901000002' },
        ],
      },
      { remoteOnlyAllowlist: ['20260901000002'] },
    );
    expect(fromTable).toEqual(fromJson);
  });

  it('mantém checker, manifesto, helper e teste nos gatilhos live', () => {
    const driftWorkflow = readFileSync('.github/workflows/db-schema-drift-check.yml', 'utf8');
    const deployWorkflow = readFileSync('.github/workflows/deploy-gates.yml', 'utf8');
    const requiredPaths = [
      'scripts/check-supabase-migration-ledger.mjs',
      'scripts/migration-ledger-remote-only-allowlist.json',
      'scripts/supabase-read-only-query.mjs',
      'tests/scripts/check-supabase-migration-ledger.test.mjs',
    ];

    for (const path of requiredPaths) {
      expect(driftWorkflow, `${path} ausente do trigger do drift-check`).toContain(path);
    }
    expect(deployWorkflow).toContain('check-supabase-migration-ledger');
    expect(deployWorkflow).toContain('migration-ledger-remote-only-allowlist');
    expect(deployWorkflow).toContain('supabase-read-only-query');
    expect(deployWorkflow).toContain('check-supabase-migration-ledger\\.test');
  });
});
