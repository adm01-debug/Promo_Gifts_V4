#!/usr/bin/env node
/**
 * drift-baseline.mjs — baseline do schema de produção para o drift-check.
 *
 * O histórico de supabase/migrations/ não reconstrói o banco do zero (793 de
 * ~2400 arquivos falham no replay: tabelas de `public` criadas fora de
 * migration desde maio/2026). Em vez de replayar o histórico, o drift-check
 * replaya: baseline (dump do schema vivo na versão B) + migrations com versão
 * > B que já estão no ledger. O `db diff` então mostra só o que existe em
 * produção sem migration.
 *
 * Nada aqui escreve no banco nem no ledger. O repositório de migrations não
 * muda de estrutura: a pasta de replay é montada em diretório temporário e o
 * CLI roda com --workdir.
 *
 * Subcomandos:
 *   prepare-workdir --ledger <json do migration list> --out <dir>
 *   filter-diff --diff <arquivo> --allowlist <arquivo>   (imprime o resíduo)
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseSupabaseMigrationLedgerOutput } from './check-supabase-migration-ledger.mjs';

export const BASELINE_DIR = join('supabase', 'baseline');
export const BASELINE_NAME_RE = /^(\d{14})_baseline_schema\.sql$/;
const MIGRATION_RE = /^(\d{14})_[^/]+\.sql$/;
// Produção roda PG 17.6; sem isto o shadow do CLI usa PG 15 e os GRANTs com
// MAINTAIN (privilégio do PG 17) falham no replay.
export const SHADOW_MAJOR_VERSION = 17;

const SECRET_PATTERNS = [
  ['jwt', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['supabase-pat', /\bsbp_[a-f0-9]{30,}\b/],
  ['github-token', /\b(?:ghp|gho|ghs)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/],
  ['stripe-key', /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/],
  ['cloudflare-token', /\bcfat_[A-Za-z0-9_-]{20,}\b/],
  ['aws-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['openai-key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

export function findSecrets(sql) {
  const hits = [];
  sql.split('\n').forEach((line, i) => {
    for (const [name, re] of SECRET_PATTERNS) {
      if (re.test(line)) hits.push({ line: i + 1, kind: name });
    }
  });
  return hits;
}

// Ordem por code unit: versões de 14 dígitos e nomes de migration ordenam
// igual ao CLI (que aplica por nome de arquivo).
export const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function maxNumericVersion(versions) {
  const numeric = versions.filter((v) => /^\d{14}$/.test(String(v))).sort(byCodeUnit);
  return numeric.length ? numeric[numeric.length - 1] : null;
}

export function appliedVersionsFromLedger(document) {
  return document.migrations.map((m) => String(m.remote ?? '').trim()).filter(Boolean);
}

export function buildBaselineSql({ dump, version, projectRef, generatedAt }) {
  return [
    '-- =============================================================================',
    `-- Baseline do schema de produção (${projectRef}) — versão ${version}`,
    `-- Gerado em ${generatedAt} por scripts/export-schema-snapshot.mjs (supabase db dump --linked).`,
    '-- Uso exclusivo: ponto de partida do replay do db-schema-drift-check.',
    '-- NÃO é migration: não aplicar em produção, não copiar para supabase/migrations/.',
    '-- Não contém: dados, jobs do pg_cron, storage, vault, schema auth, publications,',
    '-- event triggers, configurações por role. Não serve para criar ambiente novo.',
    '-- =============================================================================',
    '',
    dump.trimEnd(),
    '',
  ].join('\n');
}

export function ledgerSnapshotName(version) {
  return `${version}_ledger_versions.json`;
}

export function findBaseline(rootDir) {
  const dir = join(rootDir, BASELINE_DIR);
  if (!existsSync(dir)) return null;
  const found = readdirSync(dir).filter((f) => BASELINE_NAME_RE.test(f)).sort(byCodeUnit);
  if (found.length > 1) throw new Error(`mais de um baseline em ${BASELINE_DIR}: ${found.join(', ')}`);
  if (!found.length) return null;
  const version = BASELINE_NAME_RE.exec(found[0])[1];
  const ledgerPath = join(dir, ledgerSnapshotName(version));
  if (!existsSync(ledgerPath)) throw new Error(`baseline ${found[0]} sem ${ledgerSnapshotName(version)}`);
  const { versions } = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  return { version, file: join(dir, found[0]), name: found[0], versions: new Set(versions) };
}

// Replaya toda versão aplicada que não estava no ledger quando o baseline foi
// gerado — inclusive versões numericamente menores que B aplicadas depois do
// dump. A ordem relativa entre elas é a das versões originais.
export function selectReplayMigrations({ files, baselineVersions, appliedVersions }) {
  const applied = new Set(appliedVersions);
  return files
    .map((f) => ({ f, m: MIGRATION_RE.exec(f) }))
    .filter(({ m }) => m && applied.has(m[1]) && !baselineVersions.has(m[1]))
    .map(({ f }) => f)
    .sort(byCodeUnit);
}

// O shadow aplica em ordem de nome; tudo que vem depois do baseline ganha
// versão B+1, B+2, … preservando a ordem e o nome original.
export function replayFileName(baselineVersion, index, original) {
  const version = (BigInt(baselineVersion) + BigInt(index + 1)).toString().padStart(14, '0');
  return `${version}_${original}`;
}

export function prepareWorkdir({ rootDir, outDir, appliedVersions, projectRef }) {
  const baseline = findBaseline(rootDir);
  if (!baseline) throw new Error(`nenhum baseline em ${BASELINE_DIR}`);
  const migrationsDir = join(rootDir, 'supabase', 'migrations');
  const replay = selectReplayMigrations({
    files: readdirSync(migrationsDir),
    baselineVersions: baseline.versions,
    appliedVersions,
  });
  const outMigrations = join(outDir, 'supabase', 'migrations');
  mkdirSync(outMigrations, { recursive: true });
  writeFileSync(
    join(outDir, 'supabase', 'config.toml'),
    `project_id = "${projectRef}"\n\n[db]\nmajor_version = ${SHADOW_MAJOR_VERSION}\n`,
  );
  copyFileSync(baseline.file, join(outMigrations, baseline.name));
  replay.forEach((f, i) => {
    copyFileSync(join(migrationsDir, f), join(outMigrations, replayFileName(baseline.version, i, f)));
  });
  return { baselineVersion: baseline.version, replayed: replay, workdir: outDir };
}

export function loadAllowlist(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => new RegExp(l));
}

export function filterDiff(diffSql, allowlist) {
  return diffSql
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('--'))
    .filter((l) => !/no schema changes found/i.test(l))
    .filter((l) => !allowlist.some((re) => re.test(l)));
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function runCli(argv = process.argv.slice(2), rootDir = process.cwd()) {
  const [cmd] = argv;
  if (cmd === 'prepare-workdir') {
    const ledger = parseSupabaseMigrationLedgerOutput(readFileSync(arg(argv, '--ledger'), 'utf8'));
    const result = prepareWorkdir({
      rootDir,
      outDir: arg(argv, '--out'),
      appliedVersions: appliedVersionsFromLedger(ledger),
      projectRef: process.env.SUPABASE_PROJECT_REF || 'doufsxqlfjyuvxuezpln',
    });
    console.log(JSON.stringify({ ...result, replayed_count: result.replayed.length }, null, 2));
    return 0;
  }
  if (cmd === 'filter-diff') {
    const allowlistPath = arg(argv, '--allowlist');
    const allowlist = allowlistPath && existsSync(allowlistPath)
      ? loadAllowlist(readFileSync(allowlistPath, 'utf8'))
      : [];
    const residue = filterDiff(readFileSync(arg(argv, '--diff'), 'utf8'), allowlist);
    if (residue.length) console.log(residue.join('\n'));
    return 0;
  }
  console.error('uso: drift-baseline.mjs prepare-workdir --ledger <json> --out <dir> | filter-diff --diff <f> --allowlist <f>');
  return 2;
}

// realpath: chamado por symlink, import.meta.url já vem resolvido e a
// comparação direta transformaria o CLI num no-op silencioso.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(`drift-baseline: ${error.message}`);
    process.exitCode = 1;
  }
}
