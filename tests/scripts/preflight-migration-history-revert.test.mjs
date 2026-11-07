import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MANIFEST_PATH,
  evaluateHistoryRevert,
  loadHistoryRevertManifest,
  validateHistoryRevertManifest,
} from '../../scripts/preflight-migration-history-revert.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/preflight-migration-history-revert.mjs');
const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'history-revert-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
  writeFileSync(join(root, 'supabase/migrations/20260101000000_x.sql'), 'select 1;');
  const evidenceHash = createHash('sha256').update('select 1;').digest('hex');
  return {
    root,
    manifest: {
      schema_version: 1,
      project_ref: 'doufsxqlfjyuvxuezpln',
      baseline_version: '20261015140000',
      evidence_sha256: {
        'supabase/migrations/20260101000000_x.sql': evidenceHash,
      },
      entries: [
        {
          version: '20260101000000',
          covered_by: 'migration:20260101000000',
          evidence: ['supabase/migrations/20260101000000_x.sql'],
        },
      ],
    },
  };
}

describe('manifest de repair reverted', () => {
  it('manifest versionado e todas as evidências existem', () => {
    const manifest = loadHistoryRevertManifest(DEFAULT_MANIFEST_PATH);
    expect(manifest.entries).toHaveLength(13);
    expect(new Set(manifest.entries.map((entry) => entry.version)).size).toBe(13);
    expect(validateHistoryRevertManifest(manifest)).toEqual([]);
  });

  it('rejeita versão fora do manifest', () => {
    const { root, manifest } = fixture();
    const result = evaluateHistoryRevert({
      version: '20260101000001',
      manifest,
      isInLedger: true,
      root,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('nao esta autorizada');
  });

  it('pré-check exige versão presente no ledger', () => {
    const { root, manifest } = fixture();
    expect(
      evaluateHistoryRevert({
        version: '20260101000000',
        manifest,
        isInLedger: true,
        root,
      }).ok,
    ).toBe(true);
    expect(
      evaluateHistoryRevert({
        version: '20260101000000',
        manifest,
        isInLedger: false,
        root,
      }).ok,
    ).toBe(false);
  });

  it('pós-check exige versão ausente no ledger', () => {
    const { root, manifest } = fixture();
    expect(
      evaluateHistoryRevert({
        version: '20260101000000',
        manifest,
        isInLedger: false,
        expectReverted: true,
        root,
      }).ok,
    ).toBe(true);
    expect(
      evaluateHistoryRevert({
        version: '20260101000000',
        manifest,
        isInLedger: true,
        expectReverted: true,
        root,
      }).ok,
    ).toBe(false);
  });

  it('rejeita evidência ausente, duplicidade e projeto diferente', () => {
    const { root, manifest } = fixture();
    manifest.project_ref = 'outro-projeto';
    manifest.entries.push({ ...manifest.entries[0], evidence: ['missing.sql'] });
    const problems = validateHistoryRevertManifest(manifest, root).join(' | ');
    expect(problems).toContain('nao e canonico');
    expect(problems).toContain('version duplicada');
    expect(problems).toContain('evidence inexistente');
  });

  it('rejeita evidência alterada depois da revisão', () => {
    const { root, manifest } = fixture();
    writeFileSync(join(root, 'supabase/migrations/20260101000000_x.sql'), 'select 2;');
    expect(validateHistoryRevertManifest(manifest, root).join(' ')).toContain('sha256 divergente');
  });
});

describe('CLI sem credenciais', () => {
  it('falha sem version', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    expect(spawnSync('node', [SCRIPT], { cwd: ROOT, env }).status).toBe(2);
  });

  it('static-pass apenas com manifest válido e versão autorizada', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT, '--version=001'], {
      cwd: ROOT,
      env,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
  });

  it('require-live falha fechado sem credenciais', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT, '--version=001', '--require-live'], {
      cwd: ROOT,
      env,
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });
});
