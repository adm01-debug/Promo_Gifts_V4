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
// Mesma regra do CLI (`^([0-9]+)_(.*)\.sql$`): a versão é o prefixo numérico, de
// qualquer largura. Produção tem versões de 3, 8 e 19 dígitos no ledger
// (001, 20260712, 2026062311292414001); exigir 14 dígitos aqui descartaria em
// silêncio uma migration dessas aplicada depois do dump e o drift-check
// acusaria drift falso.
const MIGRATION_RE = /^(\d+)_[^/]+\.sql$/;
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
  // Formatos que o schema pode embutir em corpo de função/COMMENT/OPTIONS:
  // chave secreta nova do Supabase (a anon/publishable é pública, esta não),
  // URL de conexão com senha, tokens de Slack/SendGrid/Google e `PASSWORD '…'`.
  ['supabase-secret-key', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ['db-url-password', /\bpostgres(?:ql)?:\/\/[^\s:/@'"]+:[^\s@'"]+@/i],
  ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['sendgrid-key', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['password-literal', /\bPASSWORD\s+'[^']{4,}'/i],
];

// A anon key é pública por desenho (vai no bundle do front) e o schema vivo
// a embute em public.get_edge_anon_key(); JWT com qualquer outra role
// (service_role, supabase_admin…) ou ilegível continua bloqueando.
export function isPublicAnonJwt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload?.role === 'anon';
  } catch {
    return false;
  }
}

const JWT_GLOBAL = new RegExp(SECRET_PATTERNS[0][1].source, 'g');

export function findSecrets(sql) {
  const hits = [];
  sql.split('\n').forEach((line, i) => {
    for (const [name, re] of SECRET_PATTERNS) {
      if (!re.test(line)) continue;
      if (name === 'jwt' && (line.match(JWT_GLOBAL) ?? []).every(isPublicAnonJwt)) continue;
      hits.push({ line: i + 1, kind: name });
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

// O CLI sai com 0 e corpo vazio/curto em alguns erros de rede; um baseline assim
// giraria um dump que não descreve nada e o próximo drift-check mostraria o
// banco inteiro como drift.
export function looksLikeSchemaDump(sql) {
  return typeof sql === 'string' && sql.length > 10_000 && /^CREATE TABLE\b/m.test(sql);
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
  const snapshot = readLedgerSnapshot(ledgerPath, version);
  return { version, file: join(dir, found[0]), name: found[0], versions: new Set(snapshot.versions) };
}

// Um JSON sem `versions` (ou com versões que não são texto) viraria um Set vazio
// e o drift-check replayaria o histórico inteiro por cima do baseline.
function readLedgerSnapshot(ledgerPath, version) {
  const label = ledgerSnapshotName(version);
  let document;
  try {
    document = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} ilegível: ${error.message}`);
  }
  if (!document || typeof document !== 'object') throw new Error(`${label} não é um objeto JSON`);
  if (String(document.baseline_version) !== version) {
    throw new Error(`${label}: baseline_version ${JSON.stringify(document.baseline_version)} difere da versão do arquivo (${version})`);
  }
  const { versions } = document;
  if (!Array.isArray(versions) || !versions.length || !versions.every((v) => typeof v === 'string' && v.trim())) {
    throw new Error(`${label}: "versions" ausente, vazio ou com item que não é texto`);
  }
  return document;
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
  const sanitized = sanitizeBaselineForReplay(readFileSync(baseline.file, 'utf8'));
  writeFileSync(join(outMigrations, baseline.name), sanitized.sql);
  replay.forEach((f, i) => {
    copyFileSync(join(migrationsDir, f), join(outMigrations, replayFileName(baseline.version, i, f)));
  });
  return {
    baselineVersion: baseline.version,
    replayed: replay,
    workdir: outDir,
    removedStatements: sanitized.removed,
  };
}

// `supabase db dump` não emite CREATE EVENT TRIGGER (os event triggers ficam de
// fora), mas emite o COMMENT ON EVENT TRIGGER / ALTER EVENT TRIGGER que os
// referencia: aplicado no shadow, o último comando do baseline falha com
// `event trigger "..." does not exist` e o db diff nem chega a comparar
// (db-schema-drift-check de 2026-10-15, baseline 20261015140000, linha 120985).
// O arquivo de baseline permanece idêntico ao dump; a limpeza é feita ao montar
// a pasta de replay.
const EVENT_TRIGGER_STATEMENT = /^\s*(?:ALTER|COMMENT\s+ON)\s+EVENT\s+TRIGGER\b/i;

// Mesma lacuna para publications: o dump traz ALTER PUBLICATION … OWNER/ADD TABLE
// sem o CREATE PUBLICATION. A única que o shadow do CLI já tem é a da própria
// plataforma (supabase_realtime — o replay do baseline atual passa por ela);
// qualquer outra que passe a existir em produção quebraria o replay com
// `publication "..." does not exist`.
const PUBLICATION_STATEMENT = /^\s*(?:ALTER|COMMENT\s+ON)\s+PUBLICATION\s+(?:"((?:[^"]|"")+)"|([^\s;]+))/i;
const PUBLICATIONS_IN_SHADOW = new Set(['supabase_realtime']);

function isStatementMissingFromDump(line) {
  if (EVENT_TRIGGER_STATEMENT.test(line)) return true;
  const publication = PUBLICATION_STATEMENT.exec(line);
  if (!publication) return false;
  const name = publication[1] !== undefined ? publication[1].replaceAll('""', '"') : publication[2].toLowerCase();
  return !PUBLICATIONS_IN_SHADOW.has(name);
}

// Avança o estado léxico (aspas simples, identificador entre aspas duplas,
// dollar-quote) por uma linha e diz se houve `;` fora de literal e de comentário
// de linha. Identificador com apóstrofo (`"can't"`) ou `--` dentro de aspas
// duplas não pode virar início de string/comentário.
function scanLine(line, state) {
  let terminated = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (state.dollar) {
      if (line.startsWith(state.dollar, i)) {
        i += state.dollar.length - 1;
        state.dollar = null;
      }
    } else if (state.quote) {
      if (c === "'") {
        if (line[i + 1] === "'") i += 1;
        else state.quote = false;
      }
    } else if (state.ident) {
      if (c === '"') {
        if (line[i + 1] === '"') i += 1;
        else state.ident = false;
      }
    } else if (c === "'") {
      state.quote = true;
    } else if (c === '"') {
      state.ident = true;
    } else if (c === '$') {
      // Tag pode ter dígitos ($q1$) e só abre dollar-quote fora de identificador
      // (`col$1$x` é nome, não literal).
      const tag = /[A-Za-z0-9_$]/.test(line[i - 1] ?? '') ? null : /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(line.slice(i));
      if (tag) {
        state.dollar = tag[0];
        i += tag[0].length - 1;
      }
    } else if (c === '-' && line[i + 1] === '-') {
      break;
    } else if (c === ';') {
      terminated = true;
    }
  }
  return terminated;
}

export function sanitizeBaselineForReplay(sql) {
  const kept = [];
  const removed = [];
  const state = { quote: false, ident: false, dollar: null };
  const inLiteral = () => state.quote || state.ident || state.dollar;
  let skipping = false;
  sql.split('\n').forEach((line, index) => {
    const atStatementStart = !skipping && !inLiteral();
    if (atStatementStart && isStatementMissingFromDump(line)) {
      skipping = true;
      removed.push({ line: index + 1, statement: line.trim().slice(0, 90) });
    }
    const terminated = scanLine(line, state);
    if (skipping) {
      if (terminated && !inLiteral()) skipping = false;
      return;
    }
    kept.push(line);
  });
  return { sql: kept.join('\n'), removed };
}

// Linhas de DDL de um objeto que não existe: uma entrada que casa com qualquer
// uma delas esconde drift de TODO objeto (ex.: `.*`, `^create table`, `public`).
// Entrada legítima nomeia o objeto e não casa com um nome de sonda.
const ALLOWLIST_PROBES = [
  'create table "public"."__drift_probe__" (id integer);',
  'create index "__drift_probe__" on "public"."__drift_probe__" using btree ("id");',
  'create policy "__drift_probe__" on "public"."__drift_probe__" for select to authenticated using (true);',
  'create or replace function "public"."__drift_probe__"() returns void language sql as $function$ select 1 $function$;',
  'create or replace view "public"."__drift_probe__" as select 1;',
  'alter table "public"."__drift_probe__" add column "c" integer;',
  'alter table "public"."__drift_probe__" enable row level security;',
  'drop table "public"."__drift_probe__";',
  'grant select on table "public"."__drift_probe__" to "anon";',
  'revoke all on table "public"."__drift_probe__" from "anon";',
];

export function loadAllowlist(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const re = new RegExp(l);
      const probe = ALLOWLIST_PROBES.find((p) => re.test(p));
      if (probe !== undefined || re.test('')) {
        throw new Error(`drift-allowlist: entrada genérica demais (${l}) — casaria "${probe ?? ''}"; nomeie o objeto`);
      }
      return re;
    });
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
