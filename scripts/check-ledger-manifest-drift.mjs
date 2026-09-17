#!/usr/bin/env node
/**
 * check-ledger-manifest-drift.mjs
 *
 * Etapa E46 (docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md).
 * Compara o ledger vivo (`supabase_migrations.schema_migrations`) contra os arquivos
 * locais em `supabase/migrations/**` e contra o baseline já reconciliado pela E06
 * (`docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json`), sinalizando **apenas
 * entradas novas** além do que já foi investigado:
 *
 *   - candidato a `aplicada-sem-ledger` : arquivo local com versão válida que não tem
 *     linha correspondente no ledger vivo, e que não está entre as 543 já conhecidas
 *     no baseline E06 (`local_versioned_files_without_ledger_version`).
 *   - candidato a `registrada-sem-arquivo` : versão presente no ledger vivo sem
 *     nenhum arquivo local com essa versão, e que não está entre as 3 já conhecidas
 *     no baseline E06 (entries com `reconciliation === 'ledger_only_version'`).
 *
 * IMPORTANTE — por que "candidato" e não a classificação final da E07:
 * A classificação fina `aplicada-sem-ledger` (vs. `pendente`/`indeterminada`/`no-op`)
 * feita na E07 (`docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`) verifica
 * cada migration por OBJETO no `pg_catalog` — uma checagem cara, feita uma vez, não
 * pensada para rodar toda semana em CI. Este script faz a checagem barata e contínua
 * que a E46 pede: "surgiu uma versão nova fora do que já foi investigado?" — se sim,
 * abre issue para investigação manual (mesmo tratamento da E07), sem tentar refazer o
 * trabalho de classificação por objeto.
 *
 * Por que não chama build-migration-ledger-manifest.mjs (E06) diretamente:
 * esse script consome um "ledger sanitizado" cujos hashes por statement foram
 * calculados DENTRO do banco (`extensions.digest`, via MCP `execute_sql`, ato manual
 * da E06) — não há hoje um caminho automatizável em Actions para reproduzir esse
 * cálculo sem duplicar a função de hash do lado do cliente (risco de divergência
 * silenciosa). Este script cobre o objetivo real da etapa (alertar sobre versões
 * *novas* fora do baseline) usando dado ao vivo mais barato — apenas version/name via
 * Management API read-only (mesmo padrão de scripts/check-ddl-out-of-band.mjs) — e o
 * manifesto da E06 como allowlist do que já é dívida conhecida.
 *
 * O que NÃO faz: nenhuma escrita no banco. Não roda `apply_migration`/`migration
 * repair`. Não recalcula o baseline E06.
 *
 * Fonte de dados viva: SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF (Management API,
 * mesmo padrão de scripts/check-secdef-anon-drift.mjs e scripts/check-ddl-out-of-band.mjs)
 * via scripts/supabase-read-only-query.mjs. Sem credenciais → `inconclusive`/`static-pass`
 * dependendo de --require-live (mesmo contrato de scripts/check-result-contract.mjs).
 *
 * Uso:
 *   node scripts/check-ledger-manifest-drift.mjs --out=/tmp/ledger-manifest-drift.json [--require-live]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — >=1 versão nova fora do baseline),
 *             2 (inconclusive/erro).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const DEFAULT_BASELINE_PATH = join(
  ROOT,
  'docs',
  'MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json',
);

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;
const baselineArg = argv.find((a) => a.startsWith('--baseline='));
const BASELINE_PATH = baselineArg ? resolve(baselineArg.slice('--baseline='.length)) : DEFAULT_BASELINE_PATH;

// Mesmo regex de scripts/build-local-migrations-manifest.mjs (declaredVersionOf) —
// não o contrato estrito de 14 dígitos (esse é responsabilidade de
// scripts/check-migration-filename-contract.mjs), só o suficiente para casar com a
// coluna `version` do ledger.
export function declaredVersionOf(filename) {
  const m = filename.match(/^([0-9]+)_/);
  return m ? m[1] : null;
}

export function localVersions(migrationsDir = MIGRATIONS_DIR) {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  const set = new Set();
  for (const f of files) {
    const v = declaredVersionOf(f);
    if (v) set.add(v);
  }
  return set;
}

async function fetchLiveLedgerVersions() {
  const sql = `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;`.trim();
  return querySupabaseReadOnly(sql);
}

export function parseBaseline(raw, path = BASELINE_PATH) {
  const knownLocalWithoutLedger = new Set(
    (raw.local_versioned_files_without_ledger_version || []).map((e) => e.version),
  );
  const knownLedgerWithoutLocal = new Set(
    (raw.entries || [])
      .filter((e) => e.reconciliation === 'ledger_only_version')
      .map((e) => e.version),
  );
  return {
    knownLocalWithoutLedger,
    knownLedgerWithoutLocal,
    capturedAt: raw.captured_at,
    path,
  };
}

export function loadBaseline(baselinePath = BASELINE_PATH) {
  const raw = JSON.parse(readFileSync(baselinePath, 'utf8'));
  return parseBaseline(raw, baselinePath);
}

/**
 * Função pura central: dado o conjunto de versões do ledger vivo, o conjunto
 * de versões locais e o baseline já parseado, devolve só os candidatos NOVOS
 * (fora do que a E06 já catalogou). Injetável — mesmo padrão de
 * evaluateSyncLogGate em check-migrations-sync-log-gate.mjs (E48).
 */
export function computeDriftCandidates({ ledgerVersions, localSet, baseline }) {
  const newAplicadaSemLedger = [...localSet]
    .filter((v) => !ledgerVersions.has(v) && !baseline.knownLocalWithoutLedger.has(v))
    .sort();
  const newRegistradaSemArquivo = [...ledgerVersions]
    .filter((v) => !localSet.has(v) && !baseline.knownLedgerWithoutLocal.has(v))
    .sort();
  return { newAplicadaSemLedger, newRegistradaSemArquivo };
}

async function main() {
  const baseline = loadBaseline();
  const live = await fetchLiveLedgerVersions();

  if (live.kind !== 'live') {
    const status =
      live.kind === 'missing-config'
        ? REQUIRE_LIVE
          ? CHECK_RESULT_STATUS.INCONCLUSIVE
          : CHECK_RESULT_STATUS.STATIC_PASS
        : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'ledger-manifest-drift',
      status,
      summary:
        live.kind === 'missing-config'
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem ficou em modo estático'
          : `Management API indisponível para consulta live (${live.kind})`,
      details: { reason: live.kind },
    });
  }

  const ledgerVersions = new Set(live.rows.map((r) => r.version));
  const localSet = localVersions();

  const { newAplicadaSemLedger, newRegistradaSemArquivo } = computeDriftCandidates({
    ledgerVersions,
    localSet,
    baseline,
  });

  const report = {
    checkedAt: new Date().toISOString(),
    baselinePath: baseline.path,
    baselineCapturedAt: baseline.capturedAt,
    liveLedgerVersionCount: ledgerVersions.size,
    localFileVersionCount: localSet.size,
    baselineKnownLocalWithoutLedgerCount: baseline.knownLocalWithoutLedger.size,
    baselineKnownLedgerWithoutLocalCount: baseline.knownLedgerWithoutLocal.size,
    // Candidatos — requerem revisão por objeto (metodologia E07) antes de virar
    // classificação final. Ver comentário de cabeçalho.
    newAplicadaSemLedgerCandidates: newAplicadaSemLedger,
    newRegistradaSemArquivoCandidates: newRegistradaSemArquivo,
  };
  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  const totalNew = newAplicadaSemLedger.length + newRegistradaSemArquivo.length;
  if (totalNew > 0) {
    return concludeCheck({
      check: 'ledger-manifest-drift',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${totalNew} versão(ões) nova(s) fora do baseline E06 (${newAplicadaSemLedger.length} candidata(s) a aplicada-sem-ledger, ${newRegistradaSemArquivo.length} candidata(s) a registrada-sem-arquivo)`,
      details: report,
    });
  }

  return concludeCheck({
    check: 'ledger-manifest-drift',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `Sem drift novo além do baseline E06 (${baseline.knownLocalWithoutLedger.size} já conhecidas sem ledger, ${baseline.knownLedgerWithoutLocal.size} já conhecidas sem arquivo)`,
    details: report,
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[ledger-manifest-drift] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
