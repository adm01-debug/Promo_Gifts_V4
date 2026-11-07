#!/usr/bin/env node
/**
 * Valida uma remocao controlada do historico remoto de migrations.
 *
 * Este script nunca executa DDL e nunca altera o ledger. Ele so permite uma
 * versao explicitamente documentada no manifest e confirma, pela Management
 * API read-only, que a versao existe antes do repair e desapareceu depois.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

export const CANONICAL_PROJECT = 'doufsxqlfjyuvxuezpln';
export const VERSION_RE = /^\d{3,19}(?:_[A-Za-z0-9]+)*$/;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_MANIFEST_PATH = resolve(
  ROOT,
  'scripts/migration-history-revert-manifest.json',
);

export function loadHistoryRevertManifest(path = DEFAULT_MANIFEST_PATH) {
  if (!existsSync(path)) throw new Error(`manifest ausente: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateHistoryRevertManifest(manifest, root = ROOT) {
  const problems = [];
  if (manifest?.schema_version !== 1) problems.push('schema_version do manifest deve ser 1');
  if (manifest?.project_ref !== CANONICAL_PROJECT)
    problems.push('project_ref do manifest nao e canonico');
  if (!/^\d{14}$/.test(manifest?.baseline_version || ''))
    problems.push('baseline_version invalida');
  if (!Array.isArray(manifest?.entries) || manifest.entries.length === 0) {
    problems.push('manifest precisa de entries nao vazias');
    return problems;
  }

  const seen = new Set();
  for (const entry of manifest.entries) {
    if (!VERSION_RE.test(entry?.version || ''))
      problems.push(`version invalida: ${entry?.version}`);
    if (seen.has(entry?.version)) problems.push(`version duplicada: ${entry.version}`);
    seen.add(entry?.version);
    if (!/^(baseline|migration):\d{14}$/.test(entry?.covered_by || '')) {
      problems.push(`covered_by invalido em ${entry?.version}`);
    }
    if (!Array.isArray(entry?.evidence) || entry.evidence.length === 0) {
      problems.push(`evidence ausente em ${entry?.version}`);
      continue;
    }
    for (const relativePath of entry.evidence) {
      if (
        typeof relativePath !== 'string' ||
        relativePath.startsWith('/') ||
        relativePath.includes('..')
      ) {
        problems.push(`evidence insegura em ${entry?.version}`);
      } else if (!existsSync(resolve(root, relativePath))) {
        problems.push(`evidence inexistente em ${entry?.version}: ${relativePath}`);
      } else {
        const expectedHash = manifest.evidence_sha256?.[relativePath];
        const actualHash = createHash('sha256')
          .update(readFileSync(resolve(root, relativePath)))
          .digest('hex');
        if (!/^[0-9a-f]{64}$/.test(expectedHash || '')) {
          problems.push(`sha256 ausente ou invalido em ${entry?.version}: ${relativePath}`);
        } else if (actualHash !== expectedHash) {
          problems.push(`sha256 divergente em ${entry?.version}: ${relativePath}`);
        }
      }
    }
  }
  return problems;
}

export function evaluateHistoryRevert({
  version,
  manifest,
  isInLedger,
  expectReverted = false,
  root = ROOT,
}) {
  const problems = validateHistoryRevertManifest(manifest, root);
  if (!VERSION_RE.test(version || '')) problems.push(`version invalida: ${version}`);
  const entry = manifest?.entries?.find((candidate) => candidate.version === version);
  if (!entry) problems.push(`version ${version} nao esta autorizada no manifest`);

  if (expectReverted) {
    if (isInLedger)
      problems.push(`version ${version} ainda aparece no ledger apos o repair reverted`);
  } else if (!isInLedger) {
    problems.push(
      `version ${version} nao aparece no ledger; repair reverted seria vazio ou repetido`,
    );
  }

  return { ok: problems.length === 0, problems, entry: entry || null };
}

async function fetchLedgerHasVersion(version) {
  const escaped = version.replace(/'/g, "''");
  return querySupabaseReadOnly(
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '${escaped}';`,
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const requireLive = shouldRequireLive(argv);
  const expectReverted = argv.includes('--expect-reverted');
  const versionArg = argv.find((arg) => arg.startsWith('--version='));
  const version = versionArg?.slice('--version='.length) || null;
  if (!version) {
    process.stderr.write(
      '[preflight-migration-history-revert] erro: --version=<version> e obrigatorio.\n',
    );
    process.exit(2);
    return;
  }

  const manifest = loadHistoryRevertManifest();
  const staticProblems = validateHistoryRevertManifest(manifest);
  if (staticProblems.length || !manifest.entries.some((entry) => entry.version === version)) {
    return concludeCheck({
      check: 'preflight-migration-history-revert',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: [...staticProblems, `version ${version} nao esta autorizada no manifest`].join(
        ' | ',
      ),
      details: { version, expectReverted },
    });
  }

  const live = await fetchLedgerHasVersion(version);
  const maskedUrl = live.target ? maskUrl(live.target) : undefined;
  if (live.kind !== 'live') {
    const status =
      live.kind === 'missing-config' && !requireLive
        ? CHECK_RESULT_STATUS.STATIC_PASS
        : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'preflight-migration-history-revert',
      status,
      summary:
        live.kind === 'missing-config'
          ? 'manifest valido; ledger live nao consultado por falta de credenciais'
          : `Management API indisponivel (${live.kind})`,
      details: { version, expectReverted, reason: live.kind, maskedUrl },
    });
  }

  const result = evaluateHistoryRevert({
    version,
    manifest,
    isInLedger: live.rows.length > 0,
    expectReverted,
  });
  return concludeCheck({
    check: 'preflight-migration-history-revert',
    status: result.ok ? CHECK_RESULT_STATUS.PASSED : CHECK_RESULT_STATUS.FAILED,
    summary: result.ok
      ? expectReverted
        ? `version ${version} removida do ledger sem executar DDL.`
        : `version ${version} presente no ledger e autorizada para repair reverted.`
      : result.problems.join(' | '),
    details: {
      version,
      expectReverted,
      isInLedger: live.rows.length > 0,
      coveredBy: result.entry?.covered_by,
      evidence: result.entry?.evidence,
    },
  });
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    process.stderr.write(
      `[preflight-migration-history-revert] erro: ${error.stack || error.message}\n`,
    );
    process.exitCode = 2;
  });
}
