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

// E039: ref do projeto proibido (Lovable Cloud antigo, sem catálogo) e ref canônico
const FORBIDDEN_PROJECT_REF = 'pqpdolkaeqlyzpdpbizo';
const CANONICAL_PROJECT_REF = 'doufsxqlfjyuvxuezpln';

export function findSecrets(sql) {
  const hits = [];
  let hasCanonical = false;
  sql.split('\n').forEach((line, i) => {
    for (const [name, re] of SECRET_PATTERNS) {
      if (!re.test(line)) continue;
      if (name === 'jwt' && (line.match(JWT_GLOBAL) ?? []).every(isPublicAnonJwt)) continue;
      hits.push({ line: i + 1, kind: name });
    }
    // E039: baseline gerado do projeto proibido aborta o export
    if (line.includes(FORBIDDEN_PROJECT_REF)) {
      hits.push({ line: i + 1, kind: 'forbidden-project-ref' });
    }
    if (line.includes(CANONICAL_PROJECT_REF)) hasCanonical = true;
  });
  // E039: baseline sem ref canônico sugere projeto errado
  if (sql.length > 10_000 && !hasCanonical) {
    hits.push({ line: 0, kind: 'missing-canonical-project-ref' });
  }
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

// Fim de um literal/identificador entre aspas que abre em `i`. `''`/`""` escapam a
// própria aspa; em string de escape (`E'…'`) o `\` também escapa o caractere seguinte
// (`E'a\'b'` é UM literal). Devolve o índice da aspa de fechamento (ou o tamanho do
// texto, se não fechar).
function quotedEnd(text, i) {
  const c = text[i];
  const prev = text[i - 1] ?? '';
  const escapes = c === "'" && /[eE]/.test(prev) && !/[A-Za-z0-9_$]/.test(text[i - 2] ?? '');
  let j = i + 1;
  while (j < text.length) {
    if (escapes && text[j] === '\\') j += 2;
    else if (text[j] === c) {
      if (text[j + 1] === c) j += 2;
      else break;
    } else j += 1;
  }
  return Math.min(j, text.length);
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
  // Demais classes de DDL que o `db diff` emite: um padrão como `^drop function`
  // ou `^create sequence` esconderia o drift de toda a classe.
  'drop function "public"."__drift_probe__"();',
  'drop view "public"."__drift_probe__";',
  'drop index "public"."__drift_probe__";',
  'drop policy "__drift_probe__" on "public"."__drift_probe__";',
  'drop trigger "__drift_probe__" on "public"."__drift_probe__";',
  'drop sequence "public"."__drift_probe__";',
  'drop type "public"."__drift_probe__";',
  'create sequence "public"."__drift_probe__";',
  'create trigger "__drift_probe__" after insert on "public"."__drift_probe__" for each row execute function "public"."__drift_probe__"();',
  'create type "public"."__drift_probe__" as enum (\'a\');',
  'create materialized view "public"."__drift_probe__" as select 1;',
  'alter table "public"."__drift_probe__" drop column "c";',
  'alter table "public"."__drift_probe__" add constraint "__drift_probe__" check ((id > 0));',
  'alter table "public"."__drift_probe__" drop constraint "__drift_probe__";',
  'alter table "public"."__drift_probe__" alter column "c" set default 0;',
  'alter table "public"."__drift_probe__" owner to "postgres";',
  'alter function "public"."__drift_probe__"() owner to "postgres";',
  'alter sequence "public"."__drift_probe__" owned by "public"."__drift_probe__"."id";',
  'alter policy "__drift_probe__" on "public"."__drift_probe__" to authenticated;',
  'comment on table "public"."__drift_probe__" is \'x\';',
  'comment on function "public"."__drift_probe__"() is \'x\';',
  'create extension if not exists "__drift_probe__" with schema "extensions";',
  // Variantes `if exists`/`or replace`/`unique`/`only` e classes restantes: o migra
  // emite `drop … if exists`, e um padrão genérico esconderia a classe inteira.
  'drop function if exists "public"."__drift_probe__"();',
  'drop trigger if exists "__drift_probe__" on "public"."__drift_probe__";',
  'drop index if exists "public"."__drift_probe__";',
  'drop view if exists "public"."__drift_probe__";',
  'drop policy if exists "__drift_probe__" on "public"."__drift_probe__";',
  'drop extension if exists "__drift_probe__";',
  'drop schema if exists "__drift_probe__";',
  'drop materialized view if exists "public"."__drift_probe__";',
  'create unique index "__drift_probe__" on "public"."__drift_probe__" using btree ("id");',
  'create or replace trigger "__drift_probe__" after insert on "public"."__drift_probe__" for each row execute function "public"."__drift_probe__"();',
  'create function "public"."__drift_probe__"() returns void language sql security definer as $function$ select 1 $function$;',
  'create view "public"."__drift_probe__" as select 1;',
  'create schema "__drift_probe__";',
  'create domain "public"."__drift_probe__" as integer;',
  'alter table only "public"."__drift_probe__" add constraint "__drift_probe__" foreign key ("id") references "public"."__drift_probe__" ("id") not valid;',
  'alter table "public"."__drift_probe__" validate constraint "__drift_probe__";',
  'alter table "public"."__drift_probe__" rename to "__drift_probe_2__";',
  'alter table "public"."__drift_probe__" alter column "c" type text;',
  'alter table "public"."__drift_probe__" alter column "c" drop not null;',
  'alter table "public"."__drift_probe__" force row level security;',
  'alter table "public"."__drift_probe__" disable row level security;',
  'alter table "public"."__drift_probe__" disable trigger "__drift_probe__";',
  'alter type "public"."__drift_probe__" add value \'x\';',
  'alter view "public"."__drift_probe__" owner to "postgres";',
  'alter publication "__drift_probe__" add table "public"."__drift_probe__";',
  'alter default privileges in schema "public" grant all on tables to "anon";',
  'grant execute on function "public"."__drift_probe__"() to "anon";',
  'comment on column "public"."__drift_probe__"."c" is \'x\';',
  'comment on policy "__drift_probe__" on "public"."__drift_probe__" is \'x\';',
];

// Sondas geradas: verbo × classe de objeto e GRANT/REVOKE × privilégio. A lista
// escrita à mão acima não cobre toda combinação (`^grant usage`, `^comment on view`
// passavam e escondiam a classe inteira); estas fecham o produto cartesiano.
const PROBE_OBJECT_KINDS = [
  'table', 'view', 'materialized view', 'foreign table', 'function', 'procedure', 'routine', 'sequence',
  'schema', 'type', 'domain', 'index', 'extension', 'publication', 'role', 'trigger', 'policy', 'column',
  'constraint', 'collation', 'aggregate', 'operator', 'event trigger', 'rule', 'language', 'server',
];
const PROBE_PRIVILEGES = [
  'maintain', 'set', 'alter system', 'select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger', 'usage', 'execute', 'create',
  'connect', 'temporary', 'all', 'all privileges',
];
for (const kind of PROBE_OBJECT_KINDS) {
  const obj = '"__drift_probe__"';
  ALLOWLIST_PROBES.push(
    `create ${kind} ${obj};`,
    `create or replace ${kind} ${obj};`,
    `create ${kind} if not exists ${obj};`,
    `alter ${kind} ${obj} owner to "postgres";`,
    `alter ${kind} ${obj} rename to "__drift_probe_2__";`,
    `drop ${kind} ${obj};`,
    `drop ${kind} if exists ${obj};`,
    `comment on ${kind} ${obj} is 'x';`,
  );
}
for (const priv of PROBE_PRIVILEGES) {
  for (const kind of ['table', 'schema', 'function', 'sequence', 'type', 'all tables in schema']) {
    const target = `${kind} "__drift_probe__"`;
    ALLOWLIST_PROBES.push(
      `grant ${priv} on ${target} to "anon";`,
      `revoke ${priv} on ${target} from "anon";`,
      `grant ${priv} on ${target} to "authenticated" with grant option;`,
    );
  }
}

// Nomes que não identificam um objeto sozinhos: schemas do Supabase/PG e papéis.
const NON_OBJECT_NAMES = new Set([
  'public', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'realtime', 'vault', 'pgsodium',
  'net', 'cron', 'supabase_functions', 'supabase_migrations', 'pg_catalog', 'information_schema', 'anon',
  'authenticated', 'service_role', 'postgres', 'supabase_admin',
]);

export function loadAllowlist(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l, idx) => {
      let re;
      try {
        re = new RegExp(l);
      } catch (err) {
        throw new Error(`drift-allowlist: regex inválida na linha ${idx + 1} (${l}) — ${err.message}`);
      }
      // Entrada = prefixo LITERAL de um comando: só `^`, `$` e pontuação escapada
      // (`\.`, `\(`). Classes, quantificadores, alternância e lookahead
      // (`(?!__drift_probe__)`) esconderiam uma classe inteira e escapam de qualquer lista
      // finita de sondas.
      const unescaped = l.replace(/\\[^A-Za-z0-9]/g, '');
      if (/\\/.test(unescaped) || /[.*+?[\](){}|]/.test(unescaped)) {
        throw new Error(`drift-allowlist: entrada genérica demais (${l}) — use só texto literal (^, $ e pontuação escapada); nomeie o objeto`);
      }
      // E precisa citar um identificador entre aspas que não seja só schema ou papel.
      const named = (l.match(/"[^"]+"/g) ?? []).map((q) => q.slice(1, -1));
      if (!named.some((name) => !NON_OBJECT_NAMES.has(name))) {
        throw new Error(`drift-allowlist: entrada genérica demais (${l}) — nenhum objeto entre aspas (só schema/papel ou nada); nomeie o objeto`);
      }
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
const DOLLAR_TAG = /\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/y;
// Atributos entre o fechamento do corpo e o `;` (`$$ SECURITY DEFINER;`, `STABLE`,
// `SET search_path = ''`): mudam comportamento e o `db diff` nunca os emite depois
// do corpo, então fazem parte da comparação. Varredura linear (sem regex com
// repetição aninhada): devolve o texto até o `;` fora de literal e o tamanho
// consumido (com o `;`), ou null se não houver `;`.
function trailingAttributes(text) {
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === ';') return { attrs: text.slice(0, i), length: i + 1 };
    if (c === "'") i = quotedEnd(text, i) + 1;
    else i += 1;
  }
  return null;
}

// máscara[i] = 1 quando a posição i começa em código SQL (fora de comentário,
// literal, identificador entre aspas e corpo dollar-quoted). Um `CREATE FUNCTION`
// dentro de `/* … */` ou de um `EXECUTE $y$ … $y$` não é uma definição vigente.
export function codeMask(sql) {
  const n = sql.length;
  const mask = new Uint8Array(n);
  let i = 0;
  while (i < n) {
    const c = sql[i];
    mask[i] = 1;
    if (c === "'" || c === '"') {
      i = quotedEnd(sql, i) + 1;
    } else if (c === '-' && sql[i + 1] === '-') {
      const j = sql.indexOf('\n', i);
      i = j < 0 ? n : j;
    } else if (c === '/' && sql[i + 1] === '*') {
      // Comentários de bloco aninham no PostgreSQL: só o `*/` do nível mais externo fecha.
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') {
          depth += 1;
          j += 2;
        } else if (sql[j] === '*' && sql[j + 1] === '/') {
          depth -= 1;
          j += 2;
        } else j += 1;
      }
      i = j;
    } else if (c === '$' && !/[A-Za-z0-9_$]/.test(sql[i - 1] ?? '')) {
      DOLLAR_TAG.lastIndex = i;
      const tag = DOLLAR_TAG.exec(sql);
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        i = end < 0 ? n : end + tag[0].length;
      } else i += 1;
    } else i += 1;
  }
  return mask;
}

export function extractFunctionStatements(sql) {
  const found = [];
  const mask = codeMask(sql);
  FUNCTION_START.lastIndex = 0;
  let start;
  while ((start = FUNCTION_START.exec(sql)) !== null) {
    const keyword = start.index + (start[0].length - start[0].trimStart().length);
    if (!mask[keyword]) continue;
    const rest = sql.slice(start.index);
    const as = DOLLAR_AS.exec(rest);
    if (!as) continue;
    const bodyStart = as.index + as[0].length;
    const close = rest.indexOf(as[1], bodyStart);
    if (close < 0) continue;
    let end = close + as[1].length;
    const tail = trailingAttributes(rest.slice(end));
    const trailing = tail ? tail.attrs.trim() : '';
    if (tail) end += tail.length;
    found.push({ start: start.index, end: start.index + end, text: rest.slice(0, end), tag: as[1], asIndex: as.index, bodyStart, close, trailing });
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

// Normaliza só o que o Postgres trata como equivalente: espaçamento e caixa de
// palavra-chave/identificador sem aspas, e aspas redundantes (`"public"."f"` =
// `public.f`). Literais ('A' ≠ 'a') e identificadores entre aspas que dependem
// delas (`"F"` ≠ `f`, `"my col"`) ficam intactos — são diferença de comportamento.
// `"char"` (tipo interno) ≠ `char` (bpchar), `"user"` ≠ `user` (função): para
// palavras reservadas/de tipo as aspas mudam o significado e ficam intactas.
const QUOTE_SENSITIVE = new Set([
  'char', 'user', 'current_user', 'session_user', 'current_role', 'current_date', 'current_time',
  'current_timestamp', 'current_catalog', 'current_schema', 'localtime', 'localtimestamp', 'any', 'all',
  'array', 'case', 'cast', 'check', 'default', 'select', 'table', 'null', 'true', 'false', 'end', 'in',
  'order', 'group', 'limit', 'offset', 'primary', 'references', 'unique', 'when', 'then', 'else', 'from',
  'where', 'and', 'or', 'not', 'as', 'on', 'to', 'for', 'using', 'with', 'column', 'constraint',
  'analyse', 'analyze', 'asc', 'desc', 'distinct', 'do', 'except', 'fetch', 'foreign', 'grant', 'having',
  'initially', 'intersect', 'into', 'lateral', 'leading', 'trailing', 'only', 'placing', 'returning',
  'some', 'symmetric', 'union', 'variadic', 'window', 'both', 'collate', 'create', 'deferrable',
  'asymmetric', 'system_user',
  // COL_NAME_KEYWORD (inclui os apelidos de tipo: `integer` é o built-in, `"integer"` é
  // um tipo de usuário) e TYPE_FUNC_NAME_KEYWORD do PostgreSQL 17: com aspas deixam de
  // ser a palavra-chave, então a equivalência com a forma sem aspas não é provável.
  'between', 'bigint', 'bit', 'boolean', 'character', 'coalesce', 'dec', 'decimal', 'exists', 'extract',
  'float', 'greatest', 'grouping', 'inout', 'int', 'integer', 'interval', 'json', 'json_array',
  'json_arrayagg', 'json_exists', 'json_object', 'json_objectagg', 'json_query', 'json_scalar',
  'json_serialize', 'json_table', 'json_value', 'least', 'merge_action', 'national', 'nchar', 'none',
  'normalize', 'nullif', 'numeric', 'out', 'overlay', 'position', 'precision', 'real', 'row', 'setof',
  'smallint', 'substring', 'time', 'timestamp', 'treat', 'trim', 'values', 'varchar', 'xmlattributes',
  'xmlconcat', 'xmlelement', 'xmlexists', 'xmlforest', 'xmlnamespaces', 'xmlparse', 'xmlpi', 'xmlroot',
  'xmlserialize', 'xmltable',
  'authorization', 'binary', 'collation', 'concurrently', 'cross', 'freeze', 'full', 'ilike', 'inner', 'is',
  'isnull', 'join', 'left', 'like', 'natural', 'notnull', 'outer', 'overlaps', 'right', 'similar',
  'tablesample', 'verbose',
]);

// Fim (exclusivo) do literal dollar-quoted que abre em `i`, ou -1 se `i` não abre um:
// o `$` precisa vir depois de não-identificador (`a$b` não é tag) e a tag precisa fechar.
function dollarQuoteEnd(text, i) {
  if (text[i] !== '$' || /[A-Za-z0-9_$]/.test(text[i - 1] ?? '')) return -1;
  DOLLAR_TAG.lastIndex = i;
  const tag = DOLLAR_TAG.exec(text);
  if (!tag) return -1;
  const end = text.indexOf(tag[0], i + tag[0].length);
  return end < 0 ? text.length : end + tag[0].length;
}

function normalizeHeader(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const dollarEnd = dollarQuoteEnd(text, i);
    if (dollarEnd > 0) {
      // DEFAULT $$A  B$$ / SET x = $$Y$$: conteúdo é dado, nem caixa nem espaço mudam.
      out += text.slice(i, dollarEnd);
      i = dollarEnd;
    } else if (c === "'" || c === '"') {
      const j = quotedEnd(text, i);
      const token = text.slice(i, j + 1);
      const plain = c === '"' && /^"[a-z_][a-z0-9_]*"$/.test(token) && !QUOTE_SENSITIVE.has(token.slice(1, -1));
      out += plain ? token.slice(1, -1) : token;
      i = j + 1;
    } else {
      let j = i;
      while (j < text.length && text[j] !== "'" && text[j] !== '"' && dollarQuoteEnd(text, j) < 0) j += 1;
      out += text.slice(i, j).replace(/\s+/g, ' ').toLowerCase();
      i = j;
    }
  }
  return out.trim();
}

// Colapsa o espaçamento do corpo SEM tocar em literais: 'a  b' e 'a b' são
// valores diferentes (e identificadores entre aspas e dollar-quotes internos
// idem), então só o espaço fora de string/identificador/comentário é normalizado.
// Comentário de linha é copiado até o fim da linha e o \n é preservado, para o
// que vem depois dele não virar comentário.
export function collapseSqlWhitespace(text) {
  let out = '';
  let i = 0;
  let pendingSpace = false;
  const emit = (chunk) => {
    if (pendingSpace && out && !out.endsWith('\n')) out += ' ';
    pendingSpace = false;
    out += chunk;
  };
  while (i < text.length) {
    const c = text[i];
    if (c === "'" || c === '"') {
      const j = quotedEnd(text, i);
      emit(text.slice(i, j + 1));
      i = j + 1;
    } else if (c === '$') {
      const tag = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(text.slice(i));
      const prev = text[i - 1] ?? '';
      if (tag && !/[A-Za-z0-9_$]/.test(prev)) {
        const end = text.indexOf(tag[0], i + tag[0].length);
        const stop = end < 0 ? text.length : end + tag[0].length;
        emit(text.slice(i, stop));
        i = stop;
      } else {
        emit(c);
        i += 1;
      }
    } else if (c === '-' && text[i + 1] === '-') {
      let j = text.indexOf('\n', i);
      if (j < 0) j = text.length;
      emit(text.slice(i, j).trimEnd());
      out += '\n';
      i = j + 1;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      emit(text.slice(i, stop));
      i = stop;
    } else if (/\s/.test(c)) {
      pendingSpace = true;
      i += 1;
    } else {
      emit(c);
      i += 1;
    }
  }
  return out.trim();
}

// Remove só a linha `--` de coluna 0 que começa em código: dentro de um literal
// multilinha (SQL dinâmico) ela é dado e continua no corpo.
function stripColumnZeroComments(body) {
  const mask = codeMask(body);
  let offset = 0;
  return body
    .split('\n')
    .filter((line) => {
      const keep = !(line.startsWith('--') && mask[offset]);
      offset += line.length + 1;
      return keep;
    })
    .join('\n');
}

function normalizeFunction(statement) {
  const header = statement.text.slice(0, statement.asIndex);
  const signature = functionSignature(header);
  if (!signature) return null;
  const body = collapseSqlWhitespace(stripColumnZeroComments(statement.text.slice(statement.bodyStart, statement.close)));
  const head = normalizeHeader(header).replace(/^create (?:or replace )?(function|procedure)/, 'create $1');
  const trailing = statement.trailing ? ` ${normalizeHeader(statement.trailing)}` : '';
  return { signature, text: `${head} as $$ ${body} $$${trailing}` };
}

// shadowSql = baseline sanitizado + migrations replayadas, na ordem em que o
// shadow as aplicou: a última definição de cada assinatura é a vigente.
// Índice do `;` que termina o comando (fora de literal/identificador entre aspas) ou
// o tamanho do texto, se não houver.
function statementEnd(text) {
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === ';') return i;
    if (c === "'" || c === '"') i = quotedEnd(text, i) + 1;
    else i += 1;
  }
  return text.length;
}

// Fim (exclusivo) do identificador qualificado que começa em `start`: segmentos sem
// aspas ou entre aspas (`public."my f"`), separados por `.`.
function qualifiedNameEnd(text, start) {
  let i = start;
  for (;;) {
    if (text[i] === '"') i = quotedEnd(text, i) + 1;
    else while (i < text.length && !/[\s(,.;"]/.test(text[i])) i += 1;
    if (text[i] === '.') i += 1;
    else return i;
  }
}

// Alvos de um `DROP/ALTER FUNCTION`: nome (texto cru), se há lista de argumentos e o
// que vem depois do alvo. DROP aceita `a, b(int), c`; ALTER tem um alvo só.
function routineTargets(statement, single) {
  const targets = [];
  const skipSpace = (from) => {
    let j = from;
    while (j < statement.length && /\s/.test(statement[j])) j += 1;
    return j;
  };
  let i = skipSpace(0);
  for (;;) {
    const end = qualifiedNameEnd(statement, i);
    if (end === i) break;
    const nameText = statement.slice(i, end);
    i = skipSpace(end);
    let hasArgs = false;
    if (statement[i] === '(') {
      hasArgs = true;
      let depth = 0;
      while (i < statement.length) {
        const c = statement[i];
        if (c === "'" || c === '"') i = quotedEnd(statement, i) + 1;
        else {
          if (c === '(') depth += 1;
          else if (c === ')') depth -= 1;
          i += 1;
          if (depth === 0) break;
        }
      }
    }
    targets.push({ nameText, hasArgs, tail: statement.slice(i) });
    if (single) break;
    i = skipSpace(i);
    if (statement[i] !== ',') break;
    i = skipSpace(i + 1);
  }
  return targets;
}

export function dropDumpLossyFunctions(diffSql, shadowSql) {
  const current = new Map();
  for (const statement of extractFunctionStatements(shadowSql)) {
    const norm = normalizeFunction(statement);
    if (norm) current.set(norm.signature, norm.text);
  }
  // ALTER/DROP FUNCTION posterior (SECURITY DEFINER, SET search_path, drop+recria)
  // muda a função sem passar pelo texto do CREATE: a assinatura sai do mapa. Só
  // `OWNER TO` (que o dump emite para toda função) é inócuo.
  const mask = codeMask(shadowSql);
  const touchesFunction = /^[ \t]*(alter|drop)[ \t]+(?:function|procedure|routine)[ \t]+/gim;
  let touch;
  while ((touch = touchesFunction.exec(shadowSql)) !== null) {
    if (!mask[touch.index + (touch[0].length - touch[0].trimStart().length)]) continue;
    // Só o próprio comando: `DROP FUNCTION IF EXISTS f CASCADE;` (sem lista de
    // argumentos) não pode puxar o `(` de um comando posterior. O `;` e os nomes são
    // lidos respeitando aspas (`public."my f"`), e o DROP aceita vários alvos
    // separados por vírgula.
    const rest = shadowSql.slice(touch.index + touch[0].length);
    const statement = rest.slice(0, statementEnd(rest)).replace(/^if[ \t]+exists[ \t]+/i, '');
    const isAlter = touch[1].toLowerCase() === 'alter';
    for (const target of routineTargets(statement, isAlter)) {
      const name = normalizeHeader(target.nameText);
      if (!name) continue;
      // `ALTER … OWNER TO` é inócuo; qualquer outra forma tira o nome do mapa.
      if (isAlter && target.hasArgs && /^owner[ \t]+to[ \t]/i.test(target.tail.trimStart())) continue;
      // Sem lista de argumentos, o DROP vale para todas as sobrecargas do nome.
      for (const signature of [...current.keys()]) {
        if (signature.startsWith(`${name}(`) || signature.startsWith(`public.${name}(`)) current.delete(signature);
      }
    }
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
  const lines = diffSql
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('--'));

  // Agrupa linhas em statements (acumula até ';' terminal).
  const statements = [];
  let current = [];
  for (const line of lines) {
    current.push(line);
    if (line.trimEnd().endsWith(';')) {
      statements.push(current);
      current = [];
    }
  }
  if (current.length > 0) statements.push(current);

  return statements
    .filter((stmt) => {
      const header = stmt[0];
      if (/^\s*no schema changes found[.;]?\s*$/i.test(header)) return false;
      return !allowlist.some((re) => re.test(header));
    })
    .map((stmt) => stmt.join('\n'));
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
