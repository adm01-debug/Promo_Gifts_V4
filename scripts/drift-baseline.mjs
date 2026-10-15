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
 * O dump não reconstrói o shadow byte a byte: ele descarta comentários de coluna 0
 * (inclusive dentro de corpo de função), reordena os roles de policies, reescreve
 * `ARRAY[...::varchar]::text[]` numa forma que o parser achata e não emite os
 * REVOKE dos privilégios padrão do shadow. Cada um desses vira ruído no `db diff`;
 * os três últimos são neutralizados ao montar a pasta de replay
 * (sanitizeBaselineForReplay + REPLAY_SEED_SQL), o primeiro ao filtrar o diff
 * (dropDumpLossyFunctions). Nenhuma regra esconde mudança de comportamento.
 *
 * Subcomandos:
 *   prepare-workdir --ledger <json do migration list> --out <dir>
 *   filter-diff --diff <arquivo> --allowlist <arquivo> [--workdir <dir>]   (imprime o resíduo)
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

// O shadow do CLI concede ALL em tabelas/sequências/funções novas de `public` a
// anon/authenticated/service_role (privilégios padrão da imagem). O dump só
// emite os GRANTs que existem em produção e nunca um REVOKE de role ausente,
// então sem esta semente o shadow nasce com mais privilégios que o remoto e o
// diff vira milhares de `revoke ... from anon`. Roda antes do baseline; o
// próprio baseline restaura os privilégios padrão de produção no fim do arquivo.
export const REPLAY_SEED_NAME = '00000000000001_drift_replay_seed.sql';
export const REPLAY_SEED_SQL = `-- Semente do replay do db-schema-drift-check (scripts/drift-baseline.mjs).
-- Não é migration do repositório: existe só na pasta temporária do drift-check.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
`;

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
  // projectRef entra numa string TOML: aspas/quebra de linha reescreveriam o
  // config.toml (ex.: trocar major_version do shadow).
  if (!/^[A-Za-z0-9_-]+$/.test(String(projectRef))) throw new Error(`project ref inválido: ${JSON.stringify(projectRef)}`);
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
  writeFileSync(join(outMigrations, REPLAY_SEED_NAME), REPLAY_SEED_SQL);
  writeFileSync(join(outMigrations, baseline.name), sanitized.sql);
  replay.forEach((f, i) => {
    copyFileSync(join(migrationsDir, f), join(outMigrations, replayFileName(baseline.version, i, f)));
  });
  return {
    baselineVersion: baseline.version,
    replayed: replay,
    workdir: outDir,
    removedStatements: sanitized.removed,
    rewrites: sanitized.rewrites,
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

// Round-trip do dump: o que o pg_dump imprime nem sempre volta ao mesmo catálogo
// quando reaplicado no shadow. Duas formas medidas no db-schema-drift-check de
// 2026-10-15 (baseline 20261015140000), cada uma neutralizada reescrevendo o
// texto de replay para a forma que reproduz o catálogo de produção:
//
// 1. `(ARRAY['a'::character varying, …])::"text"[]` — o parser achata o cast
//    quando ele incide direto sobre o ARRAY[] e guarda `ARRAY[('a')::text, …]`;
//    produção guarda o ArrayCoerceExpr. Passar por `::character varying[]`
//    antes impede o achatamento e o catálogo fica idêntico ao remoto
//    (27 CHECKs e 7 views no run de referência).
// 2. `CREATE POLICY … TO "authenticated", "anon"` — o dump lista os roles na
//    ordem dos oids do banco de origem; produção guarda a ordem de criação
//    (1008 de 1010 policies em ordem alfabética). A ordem não tem semântica e
//    o `db diff` compara o array bruto; ordenar alfabeticamente reproduz
//    produção.
const VARCHAR_ARRAY_CAST =
  /\(ARRAY\[((?:'(?:[^']|'')*'::character varying(?:, )?)+)\]\)::"text"\[\]/g;
const POLICY_ROLES =
  /^(CREATE POLICY "(?<name>(?:[^"]|"")+)" ON (?:"(?:[^"]|"")+"\.)?"(?<table>(?:[^"]|"")+)"(?: AS (?:PERMISSIVE|RESTRICTIVE))?(?: FOR (?:ALL|SELECT|INSERT|UPDATE|DELETE))? TO )((?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z_0-9]*)(?:, (?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z_0-9]*))*)(?=\s|;|$)/;

// As duas únicas policies de produção cujo array de roles NÃO está em ordem
// alfabética (pg_policy, 2026-10-15: 2 de 1010). O dump já as imprime na ordem
// de produção, então elas ficam como vieram; ordenar criaria drift falso.
const POLICY_ROLE_ORDER_KEPT = new Set([
  'supplier_sub_brands.supplier_sub_brands_public_read',
  'product_badge_definitions.pbd_public_read',
]);

function roleName(token) {
  return token.startsWith('"') ? token.slice(1, -1).replaceAll('""', '"') : token;
}

// Só chamada em linha que começa e termina fora de literal/dollar-quote: corpo
// de função e string não podem ter o texto reescrito (viraria diferença de corpo).
function roundTripRewrite(line, counts) {
  let out = line;
  out = out.replace(VARCHAR_ARRAY_CAST, (_all, elements) => {
    counts.varcharArrayCasts += 1;
    return `((ARRAY[${elements}])::character varying[])::"text"[]`;
  });
  out = out.replace(POLICY_ROLES, (...match) => {
    const [_all, head, , , roles] = match;
    const { name, table } = match.at(-1);
    if (POLICY_ROLE_ORDER_KEPT.has(`${table}.${name}`)) return _all;
    const list = roles.split(', ');
    const sorted = [...list].sort((a, b) => byCodeUnit(roleName(a), roleName(b)));
    if (sorted.join(', ') === roles) return _all;
    counts.policyRoleOrders += 1;
    return `${head}${sorted.join(', ')}`;
  });
  return out;
}

export function sanitizeBaselineForReplay(sql) {
  const kept = [];
  const removed = [];
  const rewrites = { varcharArrayCasts: 0, policyRoleOrders: 0 };
  const state = { quote: false, ident: false, dollar: null };
  const inLiteral = () => state.quote || state.ident || state.dollar;
  let skipping = false;
  sql.split('\n').forEach((line, index) => {
    const atStatementStart = !skipping && !inLiteral();
    if (atStatementStart && isStatementMissingFromDump(line)) {
      skipping = true;
      removed.push({ line: index + 1, statement: line.trim().slice(0, 90) });
    }
    const startedOutside = !skipping && !inLiteral();
    const terminated = scanLine(line, state);
    // `$` na linha só impede a reescrita quando pode ser dollar-quote (corpo de
    // função inline); policy tem `$` legítimo em regex de string ('…$').
    const rewritable = startedOutside && !inLiteral() && (!line.includes('$') || line.startsWith('CREATE POLICY '));
    if (skipping) {
      if (terminated && !inLiteral()) skipping = false;
      return;
    }
    kept.push(rewritable ? roundTripRewrite(line, rewrites) : line);
  });
  return { sql: kept.join('\n'), removed, rewrites };
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

// O dump descarta toda linha que começa na coluna 0 com `--`, inclusive dentro
// do corpo de função (`-- fix_version: …`): o shadow guarda o corpo sem esses
// comentários e o `db diff` mostra a função inteira como diferente (26 funções
// no run de referência, todas só com comentário de coluna 0 a menos). Comentário
// não muda comportamento; a função só sai do resíduo se, ignorando essas linhas
// e o espaçamento, cabeçalho (assinatura, retorno, linguagem, SECURITY, SET) e
// corpo forem iguais à definição vigente no replay. Qualquer outra diferença
// continua no resíduo.
const FUNCTION_START = /^[ \t]*CREATE[ \t]+(?:OR[ \t]+REPLACE[ \t]+)?(FUNCTION|PROCEDURE)\b/gim;
const DOLLAR_AS = /\bAS\s+(\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$)/i;

export function extractFunctionStatements(sql) {
  const found = [];
  FUNCTION_START.lastIndex = 0;
  let start;
  while ((start = FUNCTION_START.exec(sql)) !== null) {
    const rest = sql.slice(start.index);
    const as = DOLLAR_AS.exec(rest);
    if (!as) continue;
    const bodyStart = as.index + as[0].length;
    const close = rest.indexOf(as[1], bodyStart);
    if (close < 0) continue;
    let end = close + as[1].length;
    const tail = /^\s*;/.exec(rest.slice(end));
    if (tail) end += tail[0].length;
    found.push({ start: start.index, end: start.index + end, text: rest.slice(0, end), tag: as[1], asIndex: as.index, bodyStart, close });
    FUNCTION_START.lastIndex = start.index + end;
  }
  return found;
}

// Nome qualificado + lista de argumentos (parênteses balanceados, ignorando
// aspas): identifica "a mesma função" entre definições sucessivas.
function functionSignature(header) {
  const m = /^\s*create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+/i.exec(header);
  if (!m) return null;
  const rest = header.slice(m[0].length);
  const open = rest.indexOf('(');
  if (open < 0) return null;
  let depth = 0;
  let quote = false;
  let end = -1;
  for (let i = open; i < rest.length; i += 1) {
    const c = rest[i];
    if (quote) {
      if (c === "'") quote = false;
    } else if (c === "'") quote = true;
    else if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  return normalizeHeader(rest.slice(0, end + 1));
}

function normalizeHeader(text) {
  return text.replaceAll('"', '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeFunction(statement) {
  const header = statement.text.slice(0, statement.asIndex);
  const signature = functionSignature(header);
  if (!signature) return null;
  const body = statement.text
    .slice(statement.bodyStart, statement.close)
    .split('\n')
    .filter((l) => !l.startsWith('--'))
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
  const head = normalizeHeader(header).replace(/^create (?:or replace )?(function|procedure)/, 'create $1');
  return { signature, text: `${head} as $$ ${body} $$` };
}

// shadowSql = baseline sanitizado + migrations replayadas, na ordem em que o
// shadow as aplicou: a última definição de cada assinatura é a vigente.
export function dropDumpLossyFunctions(diffSql, shadowSql) {
  const current = new Map();
  for (const statement of extractFunctionStatements(shadowSql)) {
    const norm = normalizeFunction(statement);
    if (norm) current.set(norm.signature, norm.text);
  }
  const dropped = [];
  let out = '';
  let cursor = 0;
  for (const statement of extractFunctionStatements(diffSql)) {
    const norm = normalizeFunction(statement);
    if (!norm || current.get(norm.signature) !== norm.text) continue;
    out += diffSql.slice(cursor, statement.start);
    cursor = statement.end;
    dropped.push(norm.signature);
  }
  out += diffSql.slice(cursor);
  return { sql: out, dropped };
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
    let diffSql = readFileSync(arg(argv, '--diff'), 'utf8');
    const workdir = arg(argv, '--workdir');
    if (workdir) {
      const dir = join(workdir, 'supabase', 'migrations');
      const shadowSql = readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort(byCodeUnit)
        .map((f) => readFileSync(join(dir, f), 'utf8'))
        .join('\n');
      const lossy = dropDumpLossyFunctions(diffSql, shadowSql);
      diffSql = lossy.sql;
      console.error(`drift-baseline: ${lossy.dropped.length} função(ões) iguais ao replay exceto comentário de coluna 0 (ruído do dump) fora do resíduo`);
    }
    const residue = filterDiff(diffSql, allowlist);
    if (residue.length) console.log(residue.join('\n'));
    return 0;
  }
  console.error('uso: drift-baseline.mjs prepare-workdir --ledger <json> --out <dir> | filter-diff --diff <f> --allowlist <f> [--workdir <dir>]');
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
