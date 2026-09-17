// PLANO_DBA E46 — testa scripts/check-ledger-manifest-drift.mjs, o gate que
// compara o ledger vivo (`supabase_migrations.schema_migrations`) contra os
// arquivos locais em `supabase/migrations/**` e sinaliza só as versões NOVAS
// fora do baseline já reconciliado pela E06
// (docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json).
//
// Adicionado nesta sessão de verificação independente: docs/E46_DRIFT_SEMANAL_LEDGER_CI_2026-09-16.md
// documentava só verificação manual ad-hoc do script, sem teste automatizado
// — gap real, diferente de todo script irmão desta etapa (E11/E42/E48 têm
// tests/scripts/*.test.mjs). O script foi levemente refatorado (exports +
// extração de computeDriftCandidates como função pura) para viabilizar este
// teste sem mudar comportamento — reconfirmado por smoke test manual
// (static-pass sem credenciais, inconclusive com --require-live) antes e
// depois da refatoração.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeDriftCandidates,
  declaredVersionOf,
  localVersions,
  parseBaseline,
} from '../../scripts/check-ledger-manifest-drift.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-ledger-manifest-drift.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

// ─── declaredVersionOf ──────────────────────────────────────────────────────

describe('declaredVersionOf', () => {
  it('extrai o prefixo numérico de um nome de arquivo canônico', () => {
    expect(declaredVersionOf('20260916155725_catalog_stats.sql')).toBe('20260916155725');
  });

  it('extrai também prefixos não-canônicos (menos de 14 dígitos)', () => {
    expect(declaredVersionOf('20260623_bugalert1.sql')).toBe('20260623');
  });

  it('devolve null quando o arquivo não começa com dígitos', () => {
    expect(declaredVersionOf('verify_rls_policies.sql')).toBeNull();
    expect(declaredVersionOf('README.md')).toBeNull();
  });
});

// ─── localVersions ──────────────────────────────────────────────────────────

describe('localVersions', () => {
  it('lê só arquivos .sql com prefixo numérico do diretório informado', () => {
    const dir = tempDir('ledger-manifest-local-');
    writeFileSync(join(dir, '20260916100000_a.sql'), '-- a');
    writeFileSync(join(dir, '20260916200000_b.sql'), '-- b');
    writeFileSync(join(dir, 'README.md'), '# não é migration');
    writeFileSync(join(dir, 'no_prefix.sql'), '-- sem versão');

    const versions = localVersions(dir);
    expect(versions).toEqual(new Set(['20260916100000', '20260916200000']));
  });

  it('devolve conjunto vazio para diretório sem migrations válidas', () => {
    const dir = tempDir('ledger-manifest-empty-');
    writeFileSync(join(dir, 'sem_versao.sql'), '-- x');
    expect(localVersions(dir)).toEqual(new Set());
  });
});

// ─── parseBaseline ──────────────────────────────────────────────────────────

describe('parseBaseline', () => {
  it('extrai os dois conjuntos de allowlist do formato do manifesto E06', () => {
    const raw = {
      captured_at: '2026-09-16T00:00:00Z',
      local_versioned_files_without_ledger_version: [
        { version: '20260101000001' },
        { version: '20260101000002' },
      ],
      entries: [
        { version: '20260102000001', reconciliation: 'ledger_only_version' },
        { version: '20260102000002', reconciliation: 'matched' },
      ],
    };
    const baseline = parseBaseline(raw, '/fake/path.json');
    expect(baseline.knownLocalWithoutLedger).toEqual(
      new Set(['20260101000001', '20260101000002']),
    );
    expect(baseline.knownLedgerWithoutLocal).toEqual(new Set(['20260102000001']));
    expect(baseline.capturedAt).toBe('2026-09-16T00:00:00Z');
    expect(baseline.path).toBe('/fake/path.json');
  });

  it('tolera campos ausentes (arrays vazios)', () => {
    const baseline = parseBaseline({}, '/fake/path.json');
    expect(baseline.knownLocalWithoutLedger.size).toBe(0);
    expect(baseline.knownLedgerWithoutLocal.size).toBe(0);
  });
});

// ─── computeDriftCandidates ─────────────────────────────────────────────────

describe('computeDriftCandidates', () => {
  const baseline = parseBaseline({
    local_versioned_files_without_ledger_version: [{ version: 'KNOWN_LOCAL_ONLY' }],
    entries: [{ version: 'KNOWN_LEDGER_ONLY', reconciliation: 'ledger_only_version' }],
  });

  it('não sinaliza nada quando ledger e local batem exatamente', () => {
    const ledgerVersions = new Set(['V1', 'V2']);
    const localSet = new Set(['V1', 'V2']);
    const result = computeDriftCandidates({ ledgerVersions, localSet, baseline });
    expect(result.newAplicadaSemLedger).toEqual([]);
    expect(result.newRegistradaSemArquivo).toEqual([]);
  });

  it('não sinaliza divergências já conhecidas pelo baseline E06', () => {
    const ledgerVersions = new Set(['KNOWN_LEDGER_ONLY']);
    const localSet = new Set(['KNOWN_LOCAL_ONLY']);
    const result = computeDriftCandidates({ ledgerVersions, localSet, baseline });
    expect(result.newAplicadaSemLedger).toEqual([]);
    expect(result.newRegistradaSemArquivo).toEqual([]);
  });

  it('sinaliza arquivo local novo sem linha no ledger (candidato a aplicada-sem-ledger)', () => {
    const ledgerVersions = new Set([]);
    const localSet = new Set(['20260916210000']);
    const result = computeDriftCandidates({ ledgerVersions, localSet, baseline });
    expect(result.newAplicadaSemLedger).toEqual(['20260916210000']);
    expect(result.newRegistradaSemArquivo).toEqual([]);
  });

  it('sinaliza versão do ledger nova sem arquivo local (candidato a registrada-sem-arquivo)', () => {
    // Reproduz o achado real desta sessão: 20260916155725 aplicada direto,
    // sem arquivo local até a regularização.
    const ledgerVersions = new Set(['20260916155725']);
    const localSet = new Set([]);
    const result = computeDriftCandidates({ ledgerVersions, localSet, baseline });
    expect(result.newAplicadaSemLedger).toEqual([]);
    expect(result.newRegistradaSemArquivo).toEqual(['20260916155725']);
  });

  it('ordena os candidatos', () => {
    const ledgerVersions = new Set([]);
    const localSet = new Set(['30000000000000', '10000000000000', '20000000000000']);
    const result = computeDriftCandidates({ ledgerVersions, localSet, baseline });
    expect(result.newAplicadaSemLedger).toEqual([
      '10000000000000',
      '20000000000000',
      '30000000000000',
    ]);
  });
});

// ─── Integração: CLI real, sem credenciais ──────────────────────────────────

describe('CLI (sem credenciais Supabase)', () => {
  // check-result-contract.mjs (emitCheckResult) escreve o resultado em
  // stderr por padrão (stream: 'stderr') — por isso combinamos stdout+stderr
  // em vez de checar só stdout.
  it('degrada para static-pass (exit 0) sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
  });

  it('degrada para inconclusive (exit 2) com --require-live e sem credenciais', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT, '--require-live'], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });
});

// ─── Integração: baseline real do repo ──────────────────────────────────────

describe('baseline real (E06)', () => {
  it('docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json parseia e produz allowlists não-vazias', () => {
    const path = resolve(ROOT, 'docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json');
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const baseline = parseBaseline(raw, path);
    expect(baseline.knownLocalWithoutLedger.size).toBeGreaterThan(0);
    expect(baseline.knownLedgerWithoutLocal.size).toBeGreaterThan(0);
  });

  it('supabase/migrations/ real produz um conjunto de versões não-vazio', () => {
    const dir = resolve(ROOT, 'supabase/migrations');
    const versions = localVersions(dir);
    expect(versions.size).toBeGreaterThan(1000);
  });
});
