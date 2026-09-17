#!/usr/bin/env node
/**
 * preflight-migration-apply.mjs
 *
 * PLANO_DBA E15 — checagem somente-leitura usada por
 * `.github/workflows/db-apply-migration.yml` antes (job `preflight`) e depois
 * (job `post-check`, com `--expect-applied`) de aplicar uma migration única.
 * Não aplica DDL nenhuma — só decide se é seguro prosseguir.
 *
 * Verificações (modo padrão, pré-aplicação):
 *   1. Existe exatamente um arquivo `supabase/migrations/<version>_*.sql`
 *      (zero → falha; mais de um → falha, mesma classe de problema que E10).
 *   2. `version` ainda NÃO está em `supabase_migrations.schema_migrations`
 *      (live) — falha se já estiver (evita reaplicação/duplicidade).
 *   3. O arquivo tem cabeçalho de rollback lógico: uma linha `-- Rollback:`
 *      (case-insensitive) nas primeiras 40 linhas — exigência do checklist
 *      de E15 ("Rollback lógico obrigatório no cabeçalho do arquivo").
 *   4. DDL não-transacional (`CREATE INDEX CONCURRENTLY`, `VACUUM`, `ALTER
 *      SYSTEM`, ...) é reportado como aviso em `details.nonTransactionalDdl`
 *      — não bloqueia sozinho (psql -1 já falha por conta própria nesses
 *      casos porque força uma transação), mas fica registrado no job summary
 *      para o humano que aprova o `environment: production` decidir.
 *
 * Com `--expect-applied` (modo pós-aplicação, chamado pelo job `post-check`):
 *   inverte a checagem 2 — falha se `version` NÃO estiver no ledger.
 *
 * Uso:
 *   node scripts/preflight-migration-apply.mjs --version=<version> [--require-live] [--expect-applied]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed), 2 (inconclusive/erro).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations');

const NON_TX_DDL = [
  /CREATE\s+INDEX\s+CONCURRENTLY/i,
  /DROP\s+INDEX\s+CONCURRENTLY/i,
  /REINDEX\s+.*CONCURRENTLY/i,
  /VACUUM\b/i,
  /ALTER\s+SYSTEM\b/i,
];

const VERSION_RE = /^\d{6,19}(?:_[A-Za-z0-9]+)*$/;

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const EXPECT_APPLIED = argv.includes('--expect-applied');
const versionArg = argv.find((a) => a.startsWith('--version='));
const VERSION = versionArg ? versionArg.slice('--version='.length) : null;

/** Lista, dentro de `dir`, os arquivos `.sql` cujo nome começa com `<version>_`. */
export function findMigrationFiles(version, dir = MIGRATIONS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith(`${version}_`) && f.endsWith('.sql'))
    .sort();
}

/** `true` se houver uma linha `-- Rollback:` (case-insensitive) nas primeiras `headLines` linhas. */
export function hasRollbackHeader(sqlContent, headLines = 40) {
  const lines = sqlContent.split('\n').slice(0, headLines);
  return lines.some((l) => /--\s*rollback\s*:/i.test(l));
}

/** Padrões de DDL não-transacional encontrados no conteúdo (para aviso, não bloqueio). */
export function detectNonTransactionalDdl(sqlContent) {
  return NON_TX_DDL.filter((re) => re.test(sqlContent)).map((re) => re.source);
}

/**
 * Função pura central — decide passed/failed a partir de fatos já coletados
 * (arquivos encontrados, conteúdo do arquivo, presença no ledger). Sem I/O,
 * testável por mutação (mesmo padrão de computeViolations em E22).
 */
export function evaluatePreflight({ version, files, sqlContent, isInLedger, expectApplied }) {
  const problems = [];

  if (!VERSION_RE.test(version || '')) {
    problems.push(`versão "${version}" não bate com o formato esperado (\\d{6,19} + sufixos opcionais).`);
  }

  if (files.length === 0) {
    problems.push(`nenhum arquivo supabase/migrations/${version}_*.sql encontrado.`);
  } else if (files.length > 1) {
    problems.push(`${files.length} arquivos colidem no prefixo ${version}_ (ver E10): ${files.join(', ')}.`);
  }

  if (files.length === 1 && sqlContent != null && !hasRollbackHeader(sqlContent)) {
    problems.push('arquivo não tem cabeçalho de rollback lógico ("-- Rollback:" nas primeiras 40 linhas).');
  }

  if (expectApplied) {
    if (!isInLedger) {
      problems.push(`version ${version} ainda NÃO aparece em supabase_migrations.schema_migrations após a aplicação.`);
    }
  } else if (isInLedger) {
    problems.push(`version ${version} já está em supabase_migrations.schema_migrations — reaplicação bloqueada.`);
  }

  const nonTransactionalDdl = files.length === 1 && sqlContent != null ? detectNonTransactionalDdl(sqlContent) : [];

  return {
    ok: problems.length === 0,
    problems,
    nonTransactionalDdl,
  };
}

async function fetchLedgerHasVersion(version) {
  const escaped = version.replace(/'/g, "''");
  return querySupabaseReadOnly(
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '${escaped}';`,
  );
}

async function main() {
  if (!VERSION) {
    process.stderr.write('[preflight-migration-apply] erro: --version=<version> é obrigatório.\n');
    process.exit(2);
    return;
  }

  const files = findMigrationFiles(VERSION);
  const sqlContent =
    files.length === 1 ? readFileSync(join(MIGRATIONS_DIR, files[0]), 'utf8') : null;

  const live = await fetchLedgerHasVersion(VERSION);
  const maskedUrl = live.target ? maskUrl(live.target) : undefined;

  if (live.kind !== 'live') {
    const status =
      live.kind === 'missing-config'
        ? REQUIRE_LIVE
          ? CHECK_RESULT_STATUS.INCONCLUSIVE
          : CHECK_RESULT_STATUS.STATIC_PASS
        : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'preflight-migration-apply',
      status,
      summary:
        live.kind === 'missing-config'
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem do ledger não pôde rodar ao vivo'
          : `Management API indisponível para consulta live (${live.kind})`,
      details: { version: VERSION, reason: live.kind, maskedUrl },
    });
  }

  const isInLedger = live.rows.length > 0;
  const result = evaluatePreflight({
    version: VERSION,
    files,
    sqlContent,
    isInLedger,
    expectApplied: EXPECT_APPLIED,
  });

  const details = {
    version: VERSION,
    files,
    isInLedger,
    nonTransactionalDdl: result.nonTransactionalDdl,
    expectApplied: EXPECT_APPLIED,
  };

  if (!result.ok) {
    return concludeCheck({
      check: 'preflight-migration-apply',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${result.problems.length} problema(s): ${result.problems.join(' | ')}`,
      details,
    });
  }

  return concludeCheck({
    check: 'preflight-migration-apply',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: EXPECT_APPLIED
      ? `version ${VERSION} confirmada no ledger pós-aplicação.`
      : `version ${VERSION} pronta para aplicação (arquivo único, rollback documentado, ainda não no ledger)${
          result.nonTransactionalDdl.length ? ` — aviso: DDL não-transacional detectada (${result.nonTransactionalDdl.join(', ')})` : ''
        }.`,
    details,
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[preflight-migration-apply] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
