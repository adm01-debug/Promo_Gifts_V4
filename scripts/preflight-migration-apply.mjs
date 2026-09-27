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
 *   4. DDL não-transacional (E63) — BLOQUEIA a menos que o cabeçalho declare
 *      opt-out explícito ("-- transaction: none" + "-- approved-by: <nome>"):
 *        - CREATE/DROP/REINDEX … CONCURRENTLY
 *        - BEGIN / COMMIT / ROLLBACK de topo (conflita com psql -1)
 *        - ALTER TYPE … ADD VALUE (não-transacional no PG)
 *      DROP sem IF EXISTS e VACUUM / ALTER SYSTEM bloqueiam sempre (sem opt-out).
 *   5. DDL não-transacional residual fica em `details.nonTransactionalDdl` para
 *      o job summary (mantido por compatibilidade; CONCURRENTLY agora bloqueia
 *      quando sem opt-out — ver item 4).
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

/** Padrões que bloqueiam APENAS quando não há opt-out `-- transaction: none`. */
const CONCURRENTLY_PATTERNS = [
  /\bCONCURRENTLY\b/i,
];
const TOP_LEVEL_TX_PATTERNS = [
  /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/m,
];
const ALTER_TYPE_ADD_VALUE = /ALTER\s+TYPE\s+\S+\s+ADD\s+VALUE\b/i;

/** Padrões que bloqueiam SEMPRE (sem opt-out). */
const DROP_WITHOUT_IF_EXISTS = /DROP\s+(?:TABLE|VIEW|FUNCTION|PROCEDURE|SCHEMA|TYPE|SEQUENCE|POLICY)\s+(?!IF\s+EXISTS\b)/i;

const VERSION_RE = /^\d{6,19}(?:_[A-Za-z0-9]+)*$/;

/**
 * Lê as primeiras `headLines` linhas e extrai o opt-out de checagem transacional.
 * Para passar por `CONCURRENTLY`, `BEGIN/COMMIT`, `ALTER TYPE ADD VALUE`:
 *   -- transaction: none
 *   -- approved-by: <nome>
 * Ambas as linhas devem estar presentes no cabeçalho.
 */
export function parseOptOut(sqlContent, headLines = 40) {
  const lines = sqlContent.split('\n').slice(0, headLines);
  const transactionNone = lines.some((l) => /--\s*transaction\s*:\s*none\b/i.test(l));
  const approvedByLine = lines.find((l) => /--\s*approved-by\s*:/i.test(l));
  const approvedBy = approvedByLine
    ? (approvedByLine.split(/approved-by\s*:/i)[1] || '').trim() || null
    : null;
  return { transactionNone, approvedBy };
}

/**
 * Detecta DDL que bloqueia a aplicação (E63).
 * Retorna um array de strings descrevendo cada problema.
 *
 * `hasTransactionNoneOptOut` — true quando o cabeçalho declara
 * `-- transaction: none` + `-- approved-by:`. Quando verdadeiro, suprime
 * os checks de CONCURRENTLY, BEGIN/COMMIT/ROLLBACK e ALTER TYPE ADD VALUE.
 * DROP sem IF EXISTS bloqueia mesmo com opt-out.
 */
export function detectBlockingDdl(sqlContent, { hasTransactionNoneOptOut = false } = {}) {
  const blocking = [];
  // Strip single-line SQL comments so patterns in rollback headers don't trigger.
  const executable = sqlContent.replace(/--[^\n]*/g, '');

  if (!hasTransactionNoneOptOut) {
    if (CONCURRENTLY_PATTERNS.some((re) => re.test(executable))) {
      blocking.push(
        'CONCURRENTLY detectado: não é transacional e conflita com psql -1. ' +
        'Adicione "-- transaction: none" + "-- approved-by:" no cabeçalho para opt-out.',
      );
    }
    if (TOP_LEVEL_TX_PATTERNS.some((re) => re.test(executable))) {
      blocking.push(
        'BEGIN/COMMIT/ROLLBACK de topo detectado: conflita com psql -1 (-1 = transação única). ' +
        'Adicione "-- transaction: none" + "-- approved-by:" no cabeçalho para opt-out.',
      );
    }
    if (ALTER_TYPE_ADD_VALUE.test(executable)) {
      blocking.push(
        'ALTER TYPE … ADD VALUE detectado: não é transacional no PG. ' +
        'Adicione "-- transaction: none" + "-- approved-by:" no cabeçalho para opt-out.',
      );
    }
  }

  if (DROP_WITHOUT_IF_EXISTS.test(executable)) {
    blocking.push(
      'DROP sem IF EXISTS detectado: use DROP … IF EXISTS para evitar erro se o objeto não existir.',
    );
  }

  return blocking;
}

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

  // E63 — checagem de DDL bloqueante (nova)
  if (files.length === 1 && sqlContent != null) {
    const optOut = parseOptOut(sqlContent);
    const hasTransactionNoneOptOut = optOut.transactionNone && optOut.approvedBy !== null;
    const blockingDdl = detectBlockingDdl(sqlContent, { hasTransactionNoneOptOut });
    problems.push(...blockingDdl);
  }

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
