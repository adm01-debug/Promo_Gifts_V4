#!/usr/bin/env node
/**
 * check-ledger-statements-gate.mjs
 *
 * Etapa E11 (docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md,
 * linhas 379-386). Torna `statements` obrigatório para toda linha NOVA de
 * `supabase_migrations.schema_migrations` (o ledger de migrations do projeto
 * canônico `doufsxqlfjyuvxuezpln`), e oferece um mecanismo determinístico de
 * comparação por hash (md5) contra o arquivo local correspondente em
 * `supabase/migrations/<version>_*.sql`, quando esse arquivo existe.
 *
 * Por que importa: sem `statements`, uma linha do ledger não pode ser
 * comparada por hash com o arquivo local (E33 do plano 09-15 fica impossível
 * para esse subconjunto) — a única forma de auditoria vira verificação manual
 * por objeto no pg_catalog (E07), que não escala. Medição ao vivo em
 * 2026-09-16: 483/2504 linhas (20 %) sem `statements`, TODAS concentradas em
 * `version` <= 20260623111612 (ou não-canônicas). Ver
 * docs/E11_LEDGER_STATEMENTS_2026-09-16.md para a evidência completa.
 *
 * O que o gate verifica (escopo = docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json):
 *   1. HARD (falha o gate): toda linha com `version` canônico (14 dígitos)
 *      MAIOR que `cutoffVersion`, e toda linha não-canônica fora de
 *      `nonCanonicalExemptVersions`, precisa ter `statements` não vazio.
 *      Linhas históricas (<= cutoffVersion, ou na lista de exceção) são
 *      isentas — não podem ser corrigidas retroativamente.
 *   2. ADVISORY (reportado, não falha por padrão — use `--strict-hash` para
 *      promover a HARD): quando existe um arquivo local
 *      `supabase/migrations/<version>_*.sql` sem colisão de versão, compara
 *      `md5(statements.join('\n'))` contra `md5(conteúdo do arquivo)`, em
 *      forma crua E em forma normalizada (espaços/`;` finais colapsados —
 *      ver `normalizeSqlForHash`). Por quê advisory por padrão: verificado
 *      nesta etapa que a reconstrução não é sempre byte-exata mesmo para
 *      linhas dentro do escopo (ex. `20260623111856` tem um `;` solto extra
 *      no arquivo que o parser do ledger não capturou como statement
 *      separado) — um hard-fail aqui teria falsos positivos até que E15
 *      (workflow de aplicação controlada) garanta paridade byte-a-byte na
 *      origem.
 *
 * O que NÃO faz: nenhuma escrita no banco nem no repo. Não roda
 * `apply_migration`/`migration repair`. Não recalcula o cutoff automaticamente
 * — `cutoffVersion` é um valor medido e congelado no allowlist; revisão futura
 * do corte é uma decisão humana documentada, não um recálculo silencioso a
 * cada run (isso moveria a baseline sem revisão, o mesmo erro que o proxy de
 * contagem da REGRA #4 cometia antes da E41).
 *
 * Fonte de dados viva: SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF
 * (Management API read-only, mesmo padrão de scripts/check-ddl-out-of-band.mjs
 * e scripts/check-ledger-manifest-drift.mjs) via
 * scripts/supabase-read-only-query.mjs. Sem credenciais →
 * `inconclusive`/`static-pass` dependendo de `--require-live` (mesmo contrato
 * de scripts/check-result-contract.mjs). A query live já filtra no SQL
 * (`WHERE ... version > cutoff OR não-canônico`) para não trafegar as ~1.900
 * linhas históricas isentas a cada run.
 *
 * Uso:
 *   node scripts/check-ledger-statements-gate.mjs [--out=/tmp/report.json]
 *     [--require-live] [--strict-hash]
 *     [--allowlist=docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json]
 *     [--migrations-dir=supabase/migrations]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — >=1 linha em escopo sem
 * `statements`, ou hash divergente com `--strict-hash`), 2 (inconclusive/erro).
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const DEFAULT_ALLOWLIST_PATH = join(ROOT, 'docs', 'E11_LEDGER_STATEMENTS_ALLOWLIST.json');
const DEFAULT_MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

const CANONICAL_VERSION_RE = /^[0-9]{14}$/;

// ─── Utilidades puras (testadas em tests/scripts/check-ledger-statements-gate.test.mjs) ───

export function isCanonicalVersion(version) {
  return CANONICAL_VERSION_RE.test(String(version ?? ''));
}

/** Postgres devolve text[] já tipado via a Management API (JSON puro). Blindagem
 * defensiva para o caso raro de vir como literal `{a,b,c}` (string) — mesmo padrão
 * de scripts/check-ddl-out-of-band.mjs (asArray). */
export function asStatementsArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1).trim();
      return inner ? inner.split(',').map((x) => x.trim().replace(/^"|"$/g, '')) : [];
    }
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasStatements(row) {
  return asStatementsArray(row?.statements).length > 0;
}

export function loadAllowlist(path = DEFAULT_ALLOWLIST_PATH) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!isCanonicalVersion(raw.cutoffVersion)) {
    throw new Error(
      `[ledger-statements] cutoffVersion inválido em ${path}: "${raw.cutoffVersion}" (esperado 14 dígitos)`,
    );
  }
  return {
    cutoffVersion: raw.cutoffVersion,
    nonCanonicalExemptVersions: new Set(raw.nonCanonicalExemptVersions || []),
    path,
    raw,
  };
}

/** true = linha é histórico isento (não precisa de `statements`). */
export function isHistoricallyExempt(version, allowlist) {
  const v = String(version ?? '');
  if (isCanonicalVersion(v)) {
    return v <= allowlist.cutoffVersion;
  }
  return allowlist.nonCanonicalExemptVersions.has(v);
}

export function findMissingStatements(rows, allowlist) {
  return rows
    .filter((row) => !isHistoricallyExempt(row.version, allowlist) && !hasStatements(row))
    .map((row) => ({ version: row.version, name: row.name ?? null }));
}

export function md5(text) {
  return createHash('md5').update(String(text ?? ''), 'utf8').digest('hex');
}

export function joinStatements(statements) {
  return asStatementsArray(statements).join('\n');
}

/**
 * Normalização best-effort para a comparação de hash ADVISORY (ver comentário de
 * cabeçalho — não é prova de integridade byte-exata). Colapsa quebras de linha
 * Windows, espaços à direita, e o run de `;`/whitespace no final do texto
 * (achado concreto, confirmado ao vivo: `20260623111856` tem uma linha `;`
 * solta extra no arquivo local — um "statement" vazio de fato — que o
 * parser do ledger não capturou; `statements[0]` termina em "...info;\n" e o
 * arquivo continua com mais "\n;\n". Um `;+\s*$` simples NÃO apanha esse
 * caso porque o `;` final e o `;` anterior estão separados por um `\n` —
 * por isso o strip é da classe combinada `[;\s]` inteira, não só de `;`).
 */
export function normalizeSqlForHash(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[;\s]+$/, '')
    .replace(/\n{3,}/g, '\n\n');
}

export function compareStatementsToFile(statements, fileContent) {
  const rawStatements = joinStatements(statements);
  const rawFile = String(fileContent ?? '');
  const normStatements = normalizeSqlForHash(rawStatements);
  const normFile = normalizeSqlForHash(rawFile);
  return {
    statementsMd5Raw: md5(rawStatements),
    fileMd5Raw: md5(rawFile),
    rawMatch: rawStatements === rawFile,
    statementsMd5Normalized: md5(normStatements),
    fileMd5Normalized: md5(normFile),
    normalizedMatch: normStatements === normFile,
  };
}

/** Localiza `supabase/migrations/<version>_*.sql`. Devolve `{found:false}` se
 * não existir, `{found:false, ambiguous:true, candidates}` se houver colisão
 * de versão (31 prefixos duplicados conhecidos na E10 — todos históricos,
 * fora do escopo deste gate, mas a defesa é genérica). */
export function findLocalMigrationFile(version, filenames) {
  const prefix = `${version}_`;
  const matches = filenames.filter((f) => f.startsWith(prefix) && f.endsWith('.sql'));
  if (matches.length === 0) return { found: false };
  if (matches.length > 1) return { found: false, ambiguous: true, candidates: matches.sort() };
  return { found: true, filename: matches[0] };
}

export function buildLocalFilesIndex(rows, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const filenames = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    : [];
  const index = new Map();
  for (const row of rows) {
    if (index.has(row.version)) continue;
    const found = findLocalMigrationFile(row.version, filenames);
    if (found.found) {
      index.set(row.version, {
        filename: found.filename,
        content: readFileSync(join(migrationsDir, found.filename), 'utf8'),
      });
    } else if (found.ambiguous) {
      index.set(row.version, { ambiguous: true, candidates: found.candidates });
    }
  }
  return index;
}

/**
 * Núcleo puro do gate: sem I/O, testável com fixtures em memória. `rows` já
 * deve estar restrito ao escopo relevante (ou não — linhas históricas isentas
 * são filtradas aqui mesmo se vierem no array).
 */
export function evaluateLedger({ rows, allowlist, localFiles }) {
  const missingStatements = findMissingStatements(rows, allowlist);

  const hashComparisons = [];
  for (const row of rows) {
    if (isHistoricallyExempt(row.version, allowlist)) continue;
    if (!hasStatements(row)) continue; // já capturado em missingStatements
    const local = localFiles.get(row.version);
    if (!local || local.ambiguous || local.content == null) continue;
    hashComparisons.push({
      version: row.version,
      filename: local.filename,
      ...compareStatementsToFile(row.statements, local.content),
    });
  }
  const hashMismatches = hashComparisons.filter((c) => !c.normalizedMatch);

  return { missingStatements, hashComparisons, hashMismatches };
}

// ─── Orquestração (I/O: live fetch + filesystem) ───────────────────────────

function scopedLiveSql(cutoffVersion) {
  // cutoffVersion já validado por isCanonicalVersion em loadAllowlist (14
  // dígitos) — seguro para interpolar. Filtra no SQL para não trafegar as
  // ~1.900 linhas históricas isentas a cada execução do gate.
  return `
    SELECT version, name, statements
    FROM supabase_migrations.schema_migrations
    WHERE (version ~ '^[0-9]{14}$' AND version > '${cutoffVersion}')
       OR version !~ '^[0-9]{14}$'
    ORDER BY version;
  `.trim();
}

export async function runCheck({
  allowlistPath = DEFAULT_ALLOWLIST_PATH,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  rows: injectedRows = null,
  strictHash = false,
} = {}) {
  const allowlist = loadAllowlist(allowlistPath);

  let rows;
  let liveMeta;
  if (injectedRows) {
    rows = injectedRows;
    liveMeta = { kind: 'injected' };
  } else {
    const live = await querySupabaseReadOnly(scopedLiveSql(allowlist.cutoffVersion));
    if (live.kind !== 'live') {
      return {
        degraded: true,
        reason: live.kind,
        maskedUrl: maskUrl(live.target),
        httpStatus: live.httpStatus,
        allowlist: { path: allowlist.path, cutoffVersion: allowlist.cutoffVersion },
      };
    }
    rows = live.rows.map((r) => ({ ...r, statements: asStatementsArray(r.statements) }));
    liveMeta = { kind: 'live', source: live.source, maskedUrl: maskUrl(live.target) };
  }

  const localFiles = buildLocalFilesIndex(rows, migrationsDir);
  const evaluation = evaluateLedger({ rows, allowlist, localFiles });

  const failed =
    evaluation.missingStatements.length > 0 ||
    (strictHash && evaluation.hashMismatches.length > 0);

  return {
    degraded: false,
    ok: !failed,
    liveMeta,
    allowlist: {
      path: allowlist.path,
      cutoffVersion: allowlist.cutoffVersion,
      nonCanonicalExemptCount: allowlist.nonCanonicalExemptVersions.size,
    },
    strictHash,
    rowsEvaluated: rows.length,
    ...evaluation,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const REQUIRE_LIVE = shouldRequireLive(argv);
  const STRICT_HASH = argv.includes('--strict-hash');
  const outArg = argv.find((a) => a.startsWith('--out='));
  const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;
  const allowlistArg = argv.find((a) => a.startsWith('--allowlist='));
  const ALLOWLIST_PATH = allowlistArg
    ? resolve(allowlistArg.slice('--allowlist='.length))
    : DEFAULT_ALLOWLIST_PATH;
  const migrationsDirArg = argv.find((a) => a.startsWith('--migrations-dir='));
  const MIGRATIONS_DIR = migrationsDirArg
    ? resolve(migrationsDirArg.slice('--migrations-dir='.length))
    : DEFAULT_MIGRATIONS_DIR;

  const report = await runCheck({
    allowlistPath: ALLOWLIST_PATH,
    migrationsDir: MIGRATIONS_DIR,
    strictHash: STRICT_HASH,
  });

  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  if (report.degraded) {
    const status =
      report.reason === 'missing-config'
        ? REQUIRE_LIVE
          ? CHECK_RESULT_STATUS.INCONCLUSIVE
          : CHECK_RESULT_STATUS.STATIC_PASS
        : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'ledger-statements',
      status,
      summary:
        report.reason === 'missing-config'
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem ficou em modo estático'
          : `Management API indisponível para consulta live (${report.reason})`,
      details: { reason: report.reason, maskedUrl: report.maskedUrl, httpStatus: report.httpStatus },
    });
  }

  const details = {
    cutoffVersion: report.allowlist.cutoffVersion,
    rowsEvaluated: report.rowsEvaluated,
    missingStatementsCount: report.missingStatements.length,
    missingStatements: report.missingStatements,
    hashComparisonsCount: report.hashComparisons.length,
    hashMismatchesCount: report.hashMismatches.length,
    hashMismatches: report.hashMismatches.map((m) => ({
      version: m.version,
      filename: m.filename,
      statementsMd5Normalized: m.statementsMd5Normalized,
      fileMd5Normalized: m.fileMd5Normalized,
    })),
    strictHash: report.strictHash,
  };

  if (!report.ok) {
    const parts = [];
    if (report.missingStatements.length > 0) {
      parts.push(`${report.missingStatements.length} linha(s) em escopo sem \`statements\``);
    }
    if (report.strictHash && report.hashMismatches.length > 0) {
      parts.push(`${report.hashMismatches.length} divergência(s) de hash (--strict-hash)`);
    }
    return concludeCheck({
      check: 'ledger-statements',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: parts.join('; '),
      details,
    });
  }

  return concludeCheck({
    check: 'ledger-statements',
    status: CHECK_RESULT_STATUS.PASSED,
    summary:
      `${report.rowsEvaluated} linha(s) em escopo (version > ${report.allowlist.cutoffVersion} ou ` +
      `não-canônica fora da allowlist) — todas com \`statements\`; ` +
      `${report.hashComparisons.length} comparável(is) por hash com arquivo local ` +
      `(${report.hashMismatches.length} divergência(s) normalizada(s), advisory)`,
    details,
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[ledger-statements] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
