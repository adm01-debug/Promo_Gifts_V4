// Testa scripts/drift-baseline.mjs: montagem da pasta de replay do
// db-schema-drift-check (baseline + migrations aplicadas depois do dump),
// filtro de ruído do diff e varredura de segredos do dump.
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  REPLAY_SEED_NAME,
  REPLAY_SEED_SQL,
  byCodeUnit,
  collapseSqlWhitespace,
  dropDumpLossyFunctions,
  extractFunctionStatements,
  filterDiff,
  findBaseline,
  findSecrets,
  loadAllowlist,
  looksLikeSchemaDump,
  maxNumericVersion,
  prepareWorkdir,
  sanitizeBaselineForReplay,
  replayFileName,
  selectReplayMigrations,
} from '../../scripts/drift-baseline.mjs';

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'drift-baseline-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

function fixtureRepo({ baselineVersion, ledgerVersions, migrations }) {
  const root = tmp();
  mkdirSync(join(root, 'supabase', 'baseline'), { recursive: true });
  mkdirSync(join(root, 'supabase', 'migrations'), { recursive: true });
  writeFileSync(join(root, 'supabase', 'baseline', `${baselineVersion}_baseline_schema.sql`), '-- baseline\nselect 1;\n');
  writeFileSync(
    join(root, 'supabase', 'baseline', `${baselineVersion}_ledger_versions.json`),
    JSON.stringify({ baseline_version: baselineVersion, versions: ledgerVersions }),
  );
  for (const f of migrations) writeFileSync(join(root, 'supabase', 'migrations', f), `-- ${f}\n`);
  return root;
}

describe('selectReplayMigrations', () => {
  it('replaya só o que foi aplicado depois do dump, inclusive versão menor que B', () => {
    const files = [
      '20260928212000_back_link.sql', // < B, aplicada depois do dump
      '20261015120000_ja_no_baseline.sql', // estava no ledger no dump
      '20261016090000_nova_aplicada.sql',
      '20261016100000_pendente.sql', // não aplicada
      'README.md',
      '20260623_bugalert1.sql', // nome não canônico
    ];
    const out = selectReplayMigrations({
      files,
      baselineVersions: new Set(['20261015120000']),
      appliedVersions: ['20261015120000', '20260928212000', '20261016090000'],
    });
    expect(out).toEqual(['20260928212000_back_link.sql', '20261016090000_nova_aplicada.sql']);
  });
});

describe('replayFileName', () => {
  it('renumera para depois do baseline mantendo o nome original', () => {
    expect(replayFileName('20261015140000', 0, '20260928212000_x.sql')).toBe('20261015140001_20260928212000_x.sql');
    expect(replayFileName('20261015140000', 1, '20261016090000_y.sql')).toBe('20261015140002_20261016090000_y.sql');
  });
});

describe('prepareWorkdir', () => {
  it('monta config.toml com PG 17, o baseline e o replay renumerado em ordem', () => {
    const root = fixtureRepo({
      baselineVersion: '20261015140000',
      ledgerVersions: ['20261015140000'],
      migrations: ['20261015140000_backfill.sql', '20260928212000_back_link.sql', '20261016090000_nova.sql'],
    });
    const out = join(tmp(), 'wd');
    const res = prepareWorkdir({
      rootDir: root,
      outDir: out,
      appliedVersions: ['20261015140000', '20260928212000', '20261016090000'],
      projectRef: 'doufsxqlfjyuvxuezpln',
    });
    expect(res.replayed).toEqual(['20260928212000_back_link.sql', '20261016090000_nova.sql']);
    expect(readdirSync(join(out, 'supabase', 'migrations')).sort(byCodeUnit)).toEqual([
      REPLAY_SEED_NAME,
      '20261015140000_baseline_schema.sql',
      '20261015140001_20260928212000_back_link.sql',
      '20261015140002_20261016090000_nova.sql',
    ]);
    const toml = readFileSync(join(out, 'supabase', 'config.toml'), 'utf8');
    expect(toml).toContain('major_version = 17');
    expect(toml).toContain('project_id = "doufsxqlfjyuvxuezpln"');
  });

  it('falha sem baseline e com baseline sem a lista de versões do ledger', () => {
    const root = tmp();
    mkdirSync(join(root, 'supabase', 'migrations'), { recursive: true });
    expect(() => prepareWorkdir({ rootDir: root, outDir: join(root, 'wd'), appliedVersions: [], projectRef: 'x' }))
      .toThrow(/nenhum baseline/);
    mkdirSync(join(root, 'supabase', 'baseline'));
    writeFileSync(join(root, 'supabase', 'baseline', '20261015140000_baseline_schema.sql'), 'select 1;');
    expect(() => findBaseline(root)).toThrow(/sem 20261015140000_ledger_versions\.json/);
  });

  it('falha com mais de um baseline', () => {
    const root = fixtureRepo({ baselineVersion: '20261015140000', ledgerVersions: [], migrations: [] });
    writeFileSync(join(root, 'supabase', 'baseline', '20261001000000_baseline_schema.sql'), 'select 1;');
    expect(() => findBaseline(root)).toThrow(/mais de um baseline/);
  });
});

describe('filterDiff', () => {
  it('remove comentários, linhas vazias, "no schema changes" e o que a allowlist cobre', () => {
    const allowlist = loadAllowlist('# ruído conhecido\n^grant maintain on table "public"\\."x" to\n');
    const diff = [
      '-- comentário',
      '',
      'No schema changes found',
      'grant maintain on table "public"."x" to "anon";',
      'create table "public"."criada_fora_de_migration" (id int);',
    ].join('\n');
    expect(filterDiff(diff, allowlist)).toEqual(['create table "public"."criada_fora_de_migration" (id int);']);
  });

  it('allowlist vazia não esconde nada', () => {
    expect(filterDiff('alter table "public"."t" add column c int;', [])).toHaveLength(1);
  });
});

describe('findSecrets', () => {
  it('acha JWT, PAT do Supabase e token Cloudflare, e ignora o ID do projeto', () => {
    // Montados em tempo de execução: literais com cara de token disparam o
    // push protection do GitHub.
    const hex = '0123456789abcdef';
    const jwt = ['eyJ' + 'hbGciOiJIUzI1NiJ9', 'eyJ' + 'yb2xlIjoieCJ9', 'abcdefghijklmnop'].join('.');
    const sql = [
      "select 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/x';",
      `-- token: ${jwt}`,
      `select '${'sbp' + '_' + hex + hex + '01234567'}';`,
      `comment on table t is '${'cfat' + '_' + 'Xy'.repeat(12)}';`,
    ].join('\n');
    expect(findSecrets(sql).map((h) => h.kind)).toEqual(['jwt', 'supabase-pat', 'cloudflare-token']);
  });
});

describe('findSecrets — anon key pública', () => {
  const jwtFor = (claims) => [
    'eyJ' + 'hbGciOiJIUzI1NiJ9',
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'abcdefghijklmnop',
  ].join('.');

  it('aceita a anon key (role anon) embutida no schema, como em get_edge_anon_key()', () => {
    const sql = `  SELECT '${jwtFor({ iss: 'supabase', ref: 'doufsxqlfjyuvxuezpln', role: 'anon' })}'::text;`;
    expect(findSecrets(sql)).toEqual([]);
  });

  it('bloqueia service_role, inclusive na mesma linha de uma anon key', () => {
    const anon = jwtFor({ role: 'anon' });
    const service = jwtFor({ role: 'service_role' });
    expect(findSecrets(`select '${service}';`).map((h) => h.kind)).toEqual(['jwt']);
    expect(findSecrets(`select '${anon}', '${service}';`).map((h) => h.kind)).toEqual(['jwt']);
  });
});

describe('sanitizeBaselineForReplay', () => {
  it('remove COMMENT/ALTER ON EVENT TRIGGER, que o dump emite sem o CREATE correspondente', () => {
    const sql = [
      'CREATE TABLE "public"."t" (id int);',
      'ALTER EVENT TRIGGER "evt_x" OWNER TO "postgres";',
      `COMMENT ON EVENT TRIGGER "evt_revoke_view_write_grants" IS 'Dispara fn() após CREATE [OR REPLACE] VIEW; só SELECT.';`,
      'COMMENT ON TABLE "public"."t" IS \'ok\';',
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.sql.split('\n')).toEqual([
      'CREATE TABLE "public"."t" (id int);',
      'COMMENT ON TABLE "public"."t" IS \'ok\';',
    ]);
    expect(out.removed.map((r) => r.line)).toEqual([2, 3]);
  });

  it('remove o comando inteiro quando o texto do comentário ocupa várias linhas e tem ponto-e-vírgula', () => {
    const sql = [
      "COMMENT ON EVENT TRIGGER \"evt_y\" IS 'primeira linha;",
      'segunda linha com \'\'aspas\'\' e ; solto',
      "fim';",
      'SELECT 1;',
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.sql).toBe('SELECT 1;');
    expect(out.removed).toHaveLength(1);
  });

  it('não toca na mesma frase dentro de corpo de função (dollar-quote) nem em string', () => {
    const sql = [
      'CREATE FUNCTION f() RETURNS void LANGUAGE plpgsql AS $fn$',
      'BEGIN',
      'COMMENT ON EVENT TRIGGER evt IS \'x\';',
      'END;',
      '$fn$;',
      "SELECT 'texto',",
      "'ALTER EVENT TRIGGER y OWNER TO z';",
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.sql).toBe(sql);
    expect(out.removed).toEqual([]);
  });

  it('prepareWorkdir entrega ao shadow o baseline já sem event trigger, sem alterar o arquivo original', () => {
    const root = fixtureRepo({ baselineVersion: '20261015140000', ledgerVersions: ['20261015140000'], migrations: [] });
    const file = join(root, 'supabase', 'baseline', '20261015140000_baseline_schema.sql');
    const raw = 'CREATE TABLE t (id int);\nCOMMENT ON EVENT TRIGGER "e" IS \'c\';\n';
    writeFileSync(file, raw);
    const out = join(tmp(), 'wd');
    const res = prepareWorkdir({ rootDir: root, outDir: out, appliedVersions: ['20261015140000'], projectRef: 'x' });
    const delivered = readFileSync(join(out, 'supabase', 'migrations', '20261015140000_baseline_schema.sql'), 'utf8');
    expect(/EVENT TRIGGER/.test(delivered)).toBe(false);
    expect(delivered).toContain('CREATE TABLE t');
    expect(res.removedStatements).toHaveLength(1);
    expect(readFileSync(file, 'utf8')).toBe(raw);
  });

  it('prepareWorkdir semeia os jobs do pg_cron em migration própria B+1, fora do baseline', () => {
    const root = fixtureRepo({ baselineVersion: '20261015140000', ledgerVersions: ['20261015140000'], migrations: [] });
    writeFileSync(join(root, 'supabase', 'baseline', '20261015140000_baseline_schema.sql'), 'CREATE TABLE t (id int);\n');
    const out = join(tmp(), 'wd');
    prepareWorkdir({ rootDir: root, outDir: out, appliedVersions: ['20261015140000'], projectRef: 'x' });
    const mig = join(out, 'supabase', 'migrations');
    expect(readFileSync(join(mig, '20261015140000_baseline_schema.sql'), 'utf8')).not.toContain('cron.schedule');
    const delivered = readFileSync(join(mig, '20261015140001_drift_replay_cron_seed.sql'), 'utf8');
    expect(delivered).toContain("cron.schedule('auto-block-offenders'");
    expect(delivered).toContain("cron.schedule('image-dimensions-backfill'");
    expect(delivered).toContain('cron.unschedule(v_id)');
    expect(delivered).not.toContain('UPDATE cron.job');
  });
});

describe('maxNumericVersion', () => {
  it('ignora versões não numéricas do ledger', () => {
    expect(maxNumericVersion(['20261015140000', '20260623_bugalert1', '20261013180000'])).toBe('20261015140000');
    expect(maxNumericVersion([])).toBeNull();
  });
});

describe('selectReplayMigrations — versões não canônicas do ledger', () => {
  it('replaya migration aplicada depois do dump com versão de 8 ou 19 dígitos (produção tem as duas)', () => {
    const out = selectReplayMigrations({
      files: [
        '20260712_legacy_initial.sql', // 8 dígitos, já no baseline
        '2026101609000012345_x.sql', // 19 dígitos, aplicada depois do dump
        '20261017_curta.sql', // 8 dígitos, aplicada depois do dump
        '20261018000000_normal.sql',
        '20261019000000_pendente.sql', // fora do ledger
        'notas.sql', // sem prefixo numérico
      ],
      baselineVersions: new Set(['20260712']),
      appliedVersions: ['20260712', '2026101609000012345', '20261017', '20261018000000'],
    });
    expect(out).toEqual(['2026101609000012345_x.sql', '20261017_curta.sql', '20261018000000_normal.sql']);
  });
});

describe('findBaseline — JSON do ledger inválido', () => {
  const write = (root, body) =>
    writeFileSync(join(root, 'supabase', 'baseline', '20261015140000_ledger_versions.json'), body);
  const fresh = () => fixtureRepo({ baselineVersion: '20261015140000', ledgerVersions: ['20261015140000'], migrations: [] });

  it('aceita o JSON válido', () => {
    expect(findBaseline(fresh()).versions.has('20261015140000')).toBe(true);
  });

  it('recusa JSON corrompido, citando o arquivo', () => {
    const root = fresh();
    write(root, '{"baseline_ver');
    expect(() => findBaseline(root)).toThrow(/20261015140000_ledger_versions\.json ilegível/);
  });

  it('recusa "versions" ausente, vazio ou com item que não é texto (Set vazio replayaria o histórico inteiro)', () => {
    const root = fresh();
    for (const body of [
      '{"baseline_version":"20261015140000"}',
      '{"baseline_version":"20261015140000","versions":[]}',
      '{"baseline_version":"20261015140000","versions":[20261015140000]}',
      '{"baseline_version":"20261015140000","versions":"20261015140000"}',
      'null',
    ]) {
      write(root, body);
      expect(() => findBaseline(root)).toThrow(/ledger_versions\.json/);
    }
  });

  it('recusa JSON de outra versão de baseline', () => {
    const root = fresh();
    write(root, '{"baseline_version":"20261001000000","versions":["20261001000000"]}');
    expect(() => findBaseline(root)).toThrow(/difere da versão do arquivo/);
  });
});

describe('prepareWorkdir — nomes de migration com caracteres especiais', () => {
  it('copia sem interpretar espaço, aspas, $(), crase, ponto-e-vírgula e acento', () => {
    const names = [
      '20261016090000_a b$(touch PWNED)`id`.sql',
      "20261016090100_it's;rm -rf x.sql",
      '20261016090200_ação.sql',
    ];
    const root = fixtureRepo({
      baselineVersion: '20261015140000',
      ledgerVersions: ['20261015140000'],
      migrations: names,
    });
    const out = join(tmp(), 'wd');
    const res = prepareWorkdir({
      rootDir: root,
      outDir: out,
      appliedVersions: ['20261015140000', '20261016090000', '20261016090100', '20261016090200'],
      projectRef: 'x',
    });
    expect(res.replayed).toEqual(names);
    expect(readdirSync(join(out, 'supabase', 'migrations')).sort(byCodeUnit)).toEqual([
      REPLAY_SEED_NAME,
      '20261015140000_baseline_schema.sql',
      '20261015140001_drift_replay_cron_seed.sql',
      `20261015140002_${names[0]}`,
      `20261015140003_${names[1]}`,
      `20261015140004_${names[2]}`,
    ]);
    expect(readdirSync(out).includes('PWNED')).toBe(false);
  });
});

describe('prepareWorkdir — project ref', () => {
  it('recusa ref que quebraria a string TOML do config.toml', () => {
    const root = fixtureRepo({ baselineVersion: '20261015140000', ledgerVersions: ['20261015140000'], migrations: [] });
    const attempt = (projectRef) =>
      prepareWorkdir({ rootDir: root, outDir: join(tmp(), 'wd'), appliedVersions: [], projectRef });
    expect(() => attempt('x"\n[db]\nmajor_version = 15\n#')).toThrow(/project ref inválido/);
    expect(() => attempt('')).toThrow(/project ref inválido/);
    expect(attempt('doufsxqlfjyuvxuezpln').baselineVersion).toBe('20261015140000');
  });
});

describe('sanitizeBaselineForReplay — lacunas além do event trigger', () => {
  it('remove ALTER/COMMENT de publication que o shadow não tem, e mantém supabase_realtime', () => {
    const sql = [
      'ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";',
      'ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";',
      'ALTER PUBLICATION supabase_realtime ADD TABLE ONLY "public"."quotes";',
      'ALTER PUBLICATION "minha_pub" OWNER TO "postgres";',
      'ALTER PUBLICATION "minha_pub" ADD TABLE ONLY "public"."orders";',
      "COMMENT ON PUBLICATION \"minha_pub\" IS 'x;';",
      'SELECT 1;',
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.sql.split('\n')).toEqual([
      'ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";',
      'ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";',
      'ALTER PUBLICATION supabase_realtime ADD TABLE ONLY "public"."quotes";',
      'SELECT 1;',
    ]);
    expect(out.removed.map((r) => r.line)).toEqual([4, 5, 6]);
  });

  it('identificador entre aspas duplas com apóstrofo não abre string (senão o COMMENT seguinte não é removido)', () => {
    const sql = [
      'CREATE POLICY "Users can\'t read" ON "public"."t" FOR SELECT USING (true);',
      "COMMENT ON EVENT TRIGGER \"e\" IS 'x';",
      'SELECT 1;',
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.sql.split('\n')).toEqual([sql.split('\n')[0], 'SELECT 1;']);
    expect(out.removed).toHaveLength(1);
  });

  it('dollar-quote com dígito na tag e `$` dentro de identificador', () => {
    const sql = [
      'CREATE FUNCTION f() RETURNS text LANGUAGE sql AS $q1$',
      "SELECT E'\\'';",
      '$q1$;',
      'CREATE TABLE t (col$a$b int);',
      "COMMENT ON EVENT TRIGGER \"e\" IS 'x';",
      'SELECT 1;',
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.sql.split('\n')).toEqual(sql.split('\n').filter((l) => !l.startsWith('COMMENT ON EVENT')));
    expect(out.removed.map((r) => r.line)).toEqual([5]);
  });
});

describe('loadAllowlist — entrada genérica', () => {
  it('recusa regex que esconderia drift de qualquer objeto', () => {
    for (const entry of ['.*', '^create table', '^alter table', 'public', '^grant', '^create or replace function']) {
      expect(() => loadAllowlist(entry)).toThrow(/genérica demais/);
    }
    expect(loadAllowlist('')).toEqual([]);
  });

  it('recusa padrão que esconderia uma classe inteira de DDL (Codex P2)', () => {
    for (const entry of [
      '^drop function',
      '^drop view',
      '^drop index',
      '^drop policy',
      '^drop trigger',
      '^drop sequence',
      '^create sequence',
      '^create trigger',
      '^create type',
      '^alter function',
      '^alter policy',
      '^comment on',
      '^alter table "public"\\."[a-z_]+" drop constraint',
    ]) {
      expect(() => loadAllowlist(entry), entry).toThrow(/genérica demais/);
    }
  });

  it('rejeita também variantes if exists / unique / only e classes restantes (revisão adversarial)', () => {
    for (const entry of [
      'if exists',
      '^drop function if exists',
      '^drop trigger if exists',
      '^drop index if exists',
      '^create unique index',
      '^create or replace trigger',
      '^create function',
      '^create view',
      '^create schema',
      '^create domain',
      '^alter table only',
      '^alter type',
      '^alter view',
      '^alter publication',
      '^alter default privileges',
      '^alter table .* alter column .* type',
      '^alter table .* validate constraint',
      '^alter table .* force row level',
      '^grant .* on function',
      '^comment on column',
      '^drop extension',
      '^drop schema',
      'references',
      'foreign key',
      'not valid',
      'security definer',
    ]) {
      expect(() => loadAllowlist(entry), entry).toThrow(/genérica demais/);
    }
    expect(loadAllowlist('^drop function if exists "public"\\."fn_x"\\(')).toHaveLength(1);
  });

  it('aceita entrada que nomeia o objeto', () => {
    expect(loadAllowlist('^alter table "public"\\."tabela_x" ')).toHaveLength(1);
    expect(loadAllowlist('^create or replace function "public"\\."fn_x"\\(')).toHaveLength(1);
    expect(loadAllowlist('^drop function "public"\\."fn_antiga"\\(')).toHaveLength(1);
    expect(loadAllowlist('^create sequence "public"\\."seq_x"')).toHaveLength(1);
  });

  it('o arquivo versionado continua carregando', () => {
    // Suíte roda da raiz do repo (vitest.config.ts); `import.meta.url` no ambiente
    // jsdom não é um URL `file:` confiável.
    const file = join(process.cwd(), 'supabase/baseline/drift-allowlist.txt');
    expect(existsSync(file)).toBe(true);
    expect(Array.isArray(loadAllowlist(readFileSync(file, 'utf8')))).toBe(true);
  });
});

describe('findSecrets — formatos além de JWT', () => {
  // Montados em tempo de execução: literais com cara de token disparam o push protection.
  it('acha chave secreta nova do Supabase, URL de banco com senha, Slack, Google e PASSWORD literal', () => {
    const cases = {
      'supabase-secret-key': `select '${'sb' + '_secret_' + 'A1b2'.repeat(8)}';`,
      'db-url-password': `select '${'postgresql' + '://postgres.abcd:' + 'S3nh4' + '@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'}';`,
      'slack-token': `select '${'xox' + 'b-' + '1234567890-abcdefghij'}';`,
      'google-api-key': `select '${'AI' + 'za' + 'A'.repeat(35)}';`,
      'password-literal': `CREATE USER MAPPING FOR postgres SERVER s OPTIONS (user 'u', ${'PASS' + 'WORD'} 'hunter22');`,
    };
    for (const [kind, sql] of Object.entries(cases)) expect(findSecrets(sql).map((h) => h.kind)).toEqual([kind]);
  });

  it('não acusa chave publicável, URL sem senha nem a palavra password em nome de objeto', () => {
    const sql = [
      `select '${'sb' + '_publishable_' + 'A1b2'.repeat(8)}';`,
      "select 'postgresql://localhost:5432/postgres';",
      "select 'postgres://usuario@host/db';",
      'CREATE TABLE "public"."password_reset_requests" (id int);',
    ].join('\n');
    expect(findSecrets(sql)).toEqual([]);
  });
});

describe('looksLikeSchemaDump', () => {
  it('recusa dump vazio ou curto e aceita um dump com tabelas', () => {
    expect(looksLikeSchemaDump('')).toBe(false);
    expect(looksLikeSchemaDump('CREATE TABLE t (id int);')).toBe(false);
    expect(looksLikeSchemaDump('-- x\n'.repeat(5000))).toBe(false);
    expect(looksLikeSchemaDump(`${'-- x\n'.repeat(5000)}CREATE TABLE IF NOT EXISTS "public"."t" (id int);\n`)).toBe(true);
  });
});

describe('export-schema-snapshot — credenciais presentes e CLI ausente', () => {
  const script = join(process.cwd(), 'scripts/export-schema-snapshot.mjs');
  function run(env) {
    const root = tmp();
    mkdirSync(join(root, 'supabase', 'migrations'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'migrations', '20260101000000_a.sql'), 'select 1;\n');
    const emptyBin = join(root, 'bin');
    mkdirSync(emptyBin);
    return spawnSync(process.execPath, [script], { cwd: root, env: { PATH: emptyBin, ...env }, encoding: 'utf8' });
  }

  it('com token (schedule/dispatch) sai com erro em vez de verde sem dump', () => {
    expect(run({ SUPABASE_ACCESS_TOKEN: 'x', SUPABASE_DB_PASSWORD: 'y' }).status).toBe(1);
  });

  it('sem token (PR/push) só pula o dump', () => {
    expect(run({}).status).toBe(0);
  });
});

describe('sanitizeBaselineForReplay — round-trip do dump', () => {
  it('passa o ARRAY de varchar por `::character varying[]` antes do cast para text[]', () => {
    const sql = `CREATE TABLE "public"."t" (
    "kind" character varying,
    CONSTRAINT "t_kind_check" CHECK ((("kind")::"text" = ANY ((ARRAY['a'::character varying, 'b c'::character varying])::"text"[])))
);`;
    const out = sanitizeBaselineForReplay(sql);
    expect(out.rewrites.varcharArrayCasts).toBe(1);
    expect(out.sql).toContain(`ANY (((ARRAY['a'::character varying, 'b c'::character varying])::character varying[])::"text"[])`);
  });

  it('não reescreve dentro de corpo de função (dollar-quote)', () => {
    const body = `x := (ARRAY['a'::character varying])::"text"[];`;
    const sql = `CREATE FUNCTION "public"."f"() RETURNS void LANGUAGE plpgsql AS $$\nBEGIN\n${body}\nEND;\n$$;`;
    const out = sanitizeBaselineForReplay(sql);
    expect(out.rewrites.varcharArrayCasts).toBe(0);
    expect(out.sql).toContain(body);
  });

  it('ordena os roles de CREATE POLICY e preserva as policies de ordem própria em produção', () => {
    const sql = [
      'CREATE POLICY "p1" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (true);',
      'CREATE POLICY "p2" ON "public"."t" TO "service_role", "anon", "authenticated" USING (false) WITH CHECK (false);',
      'CREATE POLICY "pbd_public_read" ON "public"."product_badge_definitions" FOR SELECT TO "authenticated", "anon" USING (true);',
      'CREATE POLICY "p3" ON "public"."t" FOR SELECT USING (true);',
    ].join('\n');
    const out = sanitizeBaselineForReplay(sql);
    expect(out.rewrites.policyRoleOrders).toBe(2);
    const lines = out.sql.split('\n');
    expect(lines[0]).toContain('TO "anon", "authenticated" USING');
    expect(lines[1]).toContain('TO "anon", "authenticated", "service_role" USING (false) WITH CHECK (false)');
    expect(lines[2]).toContain('TO "authenticated", "anon" USING');
    expect(lines[3]).toBe('CREATE POLICY "p3" ON "public"."t" FOR SELECT USING (true);');
  });

  it('policy com `$` em regex de string continua reescrita', () => {
    const sql = `CREATE POLICY "p" ON "public"."t" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("email")::"text" ~* '^[a-z]+$'::"text"));`;
    expect(sanitizeBaselineForReplay(sql).rewrites.policyRoleOrders).toBe(1);
  });
});

describe('prepareWorkdir — semente de privilégios padrão', () => {
  it('grava a semente antes do baseline e ela revoga os privilégios padrão do shadow', () => {
    const root = fixtureRepo({ baselineVersion: '20261015140000', ledgerVersions: ['20261015140000'], migrations: [] });
    const out = join(tmp(), 'wd');
    prepareWorkdir({ rootDir: root, outDir: out, appliedVersions: ['20261015140000'], projectRef: 'x' });
    const dir = join(out, 'supabase', 'migrations');
    expect(readdirSync(dir).sort(byCodeUnit)[0]).toBe(REPLAY_SEED_NAME);
    expect(readFileSync(join(dir, REPLAY_SEED_NAME), 'utf8')).toBe(REPLAY_SEED_SQL);
    for (const kind of ['TABLES', 'SEQUENCES', 'FUNCTIONS']) {
      expect(REPLAY_SEED_SQL).toContain(`REVOKE ALL ON ${kind} FROM anon, authenticated, service_role`);
    }
  });
});

describe('dropDumpLossyFunctions', () => {
  const shadow = `CREATE OR REPLACE FUNCTION "public"."fn_a"("p_x" "text" DEFAULT 'k'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v int;
BEGIN
  v := 1;

  RAISE WARNING 'x %', v;
END;
$$;

ALTER FUNCTION "public"."fn_a"("p_x" "text") OWNER TO "postgres";`;
  const diff = (extra = '', attrs = 'SECURITY DEFINER\n') => `CREATE OR REPLACE FUNCTION public.fn_a(p_x text DEFAULT 'k'::text)
 RETURNS void
 LANGUAGE plpgsql
 ${attrs} SET search_path TO 'public'
AS $function$
-- fix_version: comentário de coluna 0
DECLARE
  v int;
BEGIN
  v := 1;
  RAISE WARNING 'x %', v;${extra}
END;
$function$
;
create policy "z" on "public"."t" for select to anon using (true);
`;

  it('descarta a função que só difere por comentário de coluna 0 e espaçamento', () => {
    const out = dropDumpLossyFunctions(diff(), shadow);
    expect(out.dropped).toEqual(['public.fn_a(p_x text default \'k\'::text)']);
    expect(out.sql).not.toContain('fn_a');
    expect(out.sql).toContain('create policy "z"');
  });

  it('mantém a função quando o corpo muda de verdade', () => {
    const out = dropDumpLossyFunctions(diff('\n  v := 2;'), shadow);
    expect(out.dropped).toEqual([]);
    expect(out.sql).toContain('v := 2;');
  });

  it('mantém a função quando só o cabeçalho muda (SECURITY DEFINER removido)', () => {
    expect(dropDumpLossyFunctions(diff('', ''), shadow).dropped).toEqual([]);
  });

  it('usa a última definição do replay: migration posterior que mudou a função mantém o drift', () => {
    const later = shadow.replace('v := 1;', 'v := 9;');
    expect(dropDumpLossyFunctions(diff(), `${shadow}\n${later}`).dropped).toEqual([]);
  });

  it('extractFunctionStatements ignora CREATE FUNCTION sem corpo em dollar-quote', () => {
    expect(extractFunctionStatements("CREATE FUNCTION f() RETURNS int AS 'select 1' LANGUAGE sql;")).toEqual([]);
  });
});

describe('collapseSqlWhitespace — literais preservados', () => {
  it('normaliza espaço fora de literal e mantém o de dentro', () => {
    expect(collapseSqlWhitespace("SELECT   'a  b'\n  FROM   t")).toBe("SELECT 'a  b' FROM t");
    expect(collapseSqlWhitespace('SELECT "col  x"   , 1')).toBe('SELECT "col  x" , 1');
    expect(collapseSqlWhitespace('x := $q$a  b$q$;   y')).toBe('x := $q$a  b$q$; y');
  });

  it('mantém o \\n depois de comentário de linha', () => {
    expect(collapseSqlWhitespace('a  -- nota   aqui  \n  b')).toBe('a -- nota   aqui\nb');
  });

  it('literal com espaço diferente mantém a função no resíduo (Codex P1)', () => {
    const mk = (lit) => `CREATE OR REPLACE FUNCTION "public"."f"() RETURNS "text"
    LANGUAGE "sql"
    AS $$ SELECT '${lit}' $$;`;
    const mkDiff = (lit) => `CREATE OR REPLACE FUNCTION public.f()
 RETURNS text
 LANGUAGE sql
AS $function$ SELECT '${lit}' $function$
;
`;
    expect(dropDumpLossyFunctions(mkDiff('a  b'), mk('a b')).dropped).toEqual([]);
    expect(dropDumpLossyFunctions(mkDiff('a b'), mk('a b')).dropped).toEqual(['public.f()']);
  });
});

describe('dropDumpLossyFunctions — cabeçalho preserva literais e identificadores (Codex P1)', () => {
  // `shadow` = migration/baseline (nomes com aspas, como o dump); `remote` = db diff.
  const shadow = (name, args, set) => `CREATE OR REPLACE FUNCTION ${name}(${args}) RETURNS "text"
    LANGUAGE "sql"${set}
    AS $$ SELECT 1 $$;`;
  const remote = (name, args, set) => `CREATE OR REPLACE FUNCTION ${name}(${args})
 RETURNS text
 LANGUAGE sql${set}
AS $function$ SELECT 1 $function$
;
`;

  it('DEFAULT com caixa diferente é diferença real e fica no resíduo', () => {
    const same = dropDumpLossyFunctions(
      remote('public.f', "p text DEFAULT 'A'::text", ''),
      shadow('"public"."f"', "\"p\" \"text\" DEFAULT 'A'::\"text\"", ''),
    );
    expect(same.dropped).toEqual(["public.f(p text default 'A'::text)"]);
    const differ = dropDumpLossyFunctions(
      remote('public.f', "p text DEFAULT 'a'::text", ''),
      shadow('"public"."f"', "\"p\" \"text\" DEFAULT 'A'::\"text\"", ''),
    );
    expect(differ.dropped).toEqual([]);
    expect(differ.sql).toContain("'a'::text");
  });

  it('identificador entre aspas com maiúscula não equivale ao minúsculo', () => {
    expect(dropDumpLossyFunctions(remote('public.f', '', ''), shadow('"public"."F"', '', '')).dropped).toEqual([]);
    expect(dropDumpLossyFunctions(remote('public."F"', '', ''), shadow('"public"."f"', '', '')).dropped).toEqual([]);
    expect(dropDumpLossyFunctions(remote('public."F"', '', ''), shadow('"public"."F"', '', '')).dropped).toEqual(['public."F"()']);
  });

  it('aspas redundantes e caixa de palavra-chave seguem equivalentes', () => {
    const out = dropDumpLossyFunctions(
      remote('public.f', 'p text', '\n SECURITY DEFINER'),
      shadow('"public"."f"', '"p" "text"', '\n    security   definer'),
    );
    expect(out.dropped).toEqual(['public.f(p text)']);
  });

  it('literal do SET no cabeçalho com caixa diferente fica no resíduo', () => {
    const set = (v) => `\n SET search_path TO '${v}'`;
    expect(dropDumpLossyFunctions(remote('public.f', '', set('Public')), shadow('"public"."f"', '', set('public'))).dropped).toEqual([]);
    expect(dropDumpLossyFunctions(remote('public.f', '', set('public')), shadow('"public"."f"', '', set('public'))).dropped).toEqual([
      'public.f()',
    ]);
  });
});

describe('dropDumpLossyFunctions — mudanças posteriores ao CREATE não são escondidas (revisão adversarial)', () => {
  const create = `CREATE OR REPLACE FUNCTION "public"."g"() RETURNS void LANGUAGE "sql" AS $$ select 1 $$;\n`;
  const remote = `create or replace function public.g() returns void language sql as $function$ select 1 $function$;\n`;
  const dropped = (shadow, diff = remote) => dropDumpLossyFunctions(diff, shadow).dropped;

  it('controle: CREATE idêntico é removido do resíduo; OWNER TO é inócuo', () => {
    expect(dropped(create)).toEqual(['public.g()']);
    expect(dropped(`${create}ALTER FUNCTION "public"."g"() OWNER TO "postgres";\n`)).toEqual(['public.g()']);
  });

  it('ALTER FUNCTION (SECURITY DEFINER / SET) e DROP FUNCTION posteriores mantêm a função no resíduo', () => {
    expect(dropped(`${create}ALTER FUNCTION "public"."g"() SECURITY DEFINER;\n`)).toEqual([]);
    expect(dropped(`${create}ALTER FUNCTION "public"."g"() SET search_path = '';\n`)).toEqual([]);
    expect(dropped(`${create}DROP FUNCTION "public"."g"();\n`)).toEqual([]);
  });

  it('DROP FUNCTION sem lista de argumentos (IF EXISTS … CASCADE) invalida o nome e não puxa "(" de outro comando', () => {
    expect(dropped(`${create}DROP FUNCTION IF EXISTS public.g CASCADE;\n`)).toEqual([]);
    expect(dropped(`${create}DROP FUNCTION public.g;\nCREATE FUNCTION public.o(a int) RETURNS void LANGUAGE sql AS $$ select 1 $$;\n`)).toEqual([]);
    // Outra função dropada não afeta `g`.
    expect(dropped(`${create}DROP FUNCTION IF EXISTS public.zzz CASCADE;\n`)).toEqual(['public.g()']);
  });

  it('CREATE dentro de comentário de bloco não é definição vigente', () => {
    expect(dropped(`/* ${create} */\n`)).toEqual([]);
  });

  it('comentário de bloco aninhado só fecha no `*/` mais externo', () => {
    expect(dropped(`/* externo /* interno */ ${create} */\n`)).toEqual([]);
    // Depois do fechamento externo o CREATE volta a ser código.
    expect(dropped(`/* externo /* interno */ ainda comentário */\n${create}`)).toEqual(['public.g()']);
  });

  it('atributos depois do corpo ($$ … $$ SECURITY DEFINER;) são comparados', () => {
    const attrs = (a) => `CREATE FUNCTION "public"."g"() RETURNS void LANGUAGE sql AS $$ select 1 $$ ${a};\n`;
    expect(dropped(attrs('SECURITY DEFINER'))).toEqual([]);
    expect(dropped(attrs('STABLE'))).toEqual([]);
  });

  it('linha "--" de coluna 0 dentro de literal multilinha é dado, fora dele é comentário', () => {
    const mk = (kw, inner) => `${kw} FUNCTION public.q() RETURNS text LANGUAGE sql AS $$ select ${inner} $$;\n`;
    expect(
      dropped(mk('CREATE', "'a\n-- SELECT 1\nb'"), mk('create or replace', "'a\n-- DROP TABLE x\nb'").replace('$$', '$function$').replace(/\$\$;/, '$function$;')),
    ).toEqual([]);
    const outside = `create or replace function public.q() returns text language sql as $function$\n-- nota\nselect 1 $function$;\n`;
    expect(dropped(mk('CREATE', '1'), outside)).toEqual(['public.q()']);
  });

  it('"char" (tipo interno) não equivale a char', () => {
    const sh = `CREATE FUNCTION public.h(x char) RETURNS void LANGUAGE sql AS $$ select 1 $$;\n`;
    const rm = `create or replace function public.h(x "char") returns void language sql as $function$ select 1 $function$;\n`;
    expect(dropped(sh, rm)).toEqual([]);
  });
});

describe('filterDiff — "No schema changes found" só como linha inteira', () => {
  it('não esconde DDL que apenas menciona a frase', () => {
    const line = `comment on table "public"."t" is 'No schema changes found';`;
    expect(filterDiff(line, [])).toEqual([line]);
    expect(filterDiff('No schema changes found', [])).toEqual([]);
  });
});

describe("collapseSqlWhitespace — string de escape E'…' (Codex P1)", () => {
  it('a barra invertida escapa a aspa: o espaçamento dentro do literal é dado', () => {
    expect(collapseSqlWhitespace("SELECT E'a\\'  b'")).not.toBe(collapseSqlWhitespace("SELECT E'a\\' b'"));
    expect(collapseSqlWhitespace("SELECT e'a\\'  b'  ")).toBe("SELECT e'a\\'  b'");
  });

  it('sem o prefixo E a barra invertida é literal (standard_conforming_strings)', () => {
    expect(collapseSqlWhitespace("SELECT 'a\\'   x")).toBe("SELECT 'a\\' x");
  });

  it('função cujo corpo muda só dentro de E\'…\' continua no resíduo', () => {
    const shadow = (lit) => `CREATE OR REPLACE FUNCTION "public"."e"() RETURNS "text" LANGUAGE "sql" AS $$ select E'${lit}' $$;\n`;
    const remote = (lit) => `create or replace function public.e() returns text language sql as $function$ select E'${lit}' $function$;\n`;
    expect(dropDumpLossyFunctions(remote("a\\'  b"), shadow("a\\'  b")).dropped).toEqual(['public.e()']);
    expect(dropDumpLossyFunctions(remote("a\\' b"), shadow("a\\'  b")).dropped).toEqual([]);
  });
});

describe('loadAllowlist — produto verbo × classe e GRANT × privilégio (Codex P2)', () => {
  for (const entry of [
    '^grant usage',
    '^grant usage on schema',
    '^revoke all privileges',
    '^comment on view',
    '^comment on schema',
    '^alter view',
    '^drop domain',
    '^create collation',
    '^alter default privileges',
  ]) {
    it(`recusa ${entry}`, () => {
      expect(() => loadAllowlist(entry)).toThrow(/genérica demais/);
    });
  }

  it('aceita entrada que nomeia o objeto', () => {
    expect(loadAllowlist('^comment on view "public"\\."v_relatorio_x" is')).toHaveLength(1);
    expect(loadAllowlist('^grant usage on schema "legacy_x" to')).toHaveLength(1);
  });
});

describe('dropDumpLossyFunctions — dollar-quote no cabeçalho (Codex P1)', () => {
  const shadow = (dflt) => `CREATE OR REPLACE FUNCTION "public"."d"("p" "text" DEFAULT ${dflt}) RETURNS "text"
    LANGUAGE "sql"
    AS $$ SELECT 1 $$;`;
  const remote = (dflt) => `CREATE OR REPLACE FUNCTION public.d(p text DEFAULT ${dflt})
 RETURNS text
 LANGUAGE sql
AS $function$ SELECT 1 $function$
;
`;

  it('DEFAULT $$…$$ com caixa ou espaço diferente é diferença real e fica no resíduo', () => {
    expect(dropDumpLossyFunctions(remote('$$a b$$'), shadow('$$A  B$$')).dropped).toEqual([]);
    expect(dropDumpLossyFunctions(remote('$$a  b$$'), shadow('$$a b$$')).dropped).toEqual([]);
  });

  it('DEFAULT $$…$$ idêntico segue equivalente', () => {
    expect(dropDumpLossyFunctions(remote('$$A  B$$'), shadow('$$A  B$$')).dropped).toHaveLength(1);
  });

  it('`a$b` num identificador não abre dollar-quote', () => {
    const out = dropDumpLossyFunctions(
      `CREATE OR REPLACE FUNCTION public.d()\n RETURNS text\n LANGUAGE sql\nAS $function$ SELECT 1 $function$\n;\n`,
      `CREATE OR REPLACE FUNCTION "public"."d"() RETURNS "text" LANGUAGE "sql" AS $$ SELECT 1 $$;`,
    );
    expect(out.dropped).toEqual(['public.d()']);
  });
});

describe('dropDumpLossyFunctions — DROP sem argumentos com nome entre aspas (Codex P1)', () => {
  const create = `CREATE OR REPLACE FUNCTION "public"."my f"() RETURNS void LANGUAGE "sql" AS $$ select 1 $$;\n`;
  const remote = `create or replace function public."my f"() returns void language sql as $function$ select 1 $function$;\n`;
  const dropped = (shadow) => dropDumpLossyFunctions(remote, shadow).dropped;

  it('controle: sem DROP posterior a função é removida do resíduo', () => {
    expect(dropped(create)).toEqual(['public."my f"()']);
  });

  it('`DROP FUNCTION public."my f";` invalida o nome inteiro, não só até o primeiro espaço', () => {
    expect(dropped(`${create}DROP FUNCTION public."my f";\n`)).toEqual([]);
    expect(dropped(`${create}DROP FUNCTION IF EXISTS "public"."my f" CASCADE;\n`)).toEqual([]);
  });

  it('DROP com vários alvos separados por vírgula invalida cada um', () => {
    expect(dropped(`${create}DROP FUNCTION public.outra, public."my f";\n`)).toEqual([]);
    expect(dropped(`${create}DROP FUNCTION public."my f"(), public.outra(int);\n`)).toEqual([]);
  });

  it('`;` dentro de identificador entre aspas não encerra o comando', () => {
    expect(dropped(`${create}DROP FUNCTION public."my f", public."a;b";\n`)).toEqual([]);
  });

  it('outro nome com prefixo parecido não é afetado', () => {
    expect(dropped(`${create}DROP FUNCTION public."my f2";\n`)).toEqual(['public."my f"()']);
  });

  it('ALTER … OWNER TO com argumentos aninhados continua inócuo', () => {
    const nested = `CREATE OR REPLACE FUNCTION "public"."n"("a" numeric) RETURNS void LANGUAGE "sql" AS $$ select 1 $$;\n`;
    const rn = `create or replace function public.n(a numeric) returns void language sql as $function$ select 1 $function$;\n`;
    expect(
      dropDumpLossyFunctions(rn, `${nested}ALTER FUNCTION "public"."n"("a" numeric(10,2)) OWNER TO "postgres";\n`).dropped,
    ).toEqual(['public.n(a numeric)']);
  });
});

describe('loadAllowlist — privilégios novos e entrada sem identificador (Codex P2)', () => {
  for (const entry of ['^grant maintain', '^revoke maintain', '^grant set on parameter', '^drop foreign data wrapper']) {
    it(`recusa ${entry}`, () => {
      expect(() => loadAllowlist(entry)).toThrow(/genérica demais/);
    });
  }

  it('exige ao menos um identificador entre aspas, mesmo que nenhuma sonda case', () => {
    expect(() => loadAllowlist('^grant algum_privilegio_futuro on table')).toThrow(/nenhum objeto entre aspas/);
  });

  it('aceita entrada que cita o objeto', () => {
    expect(loadAllowlist('^grant maintain on table "public"\\."tabela_x" to')).toHaveLength(1);
  });
});

describe('loadAllowlist — entrada literal e objeto concreto (Codex P2)', () => {
  for (const entry of [
    '^create table "public"\\."(?!__drift_probe__)',
    '^create table "public"\\."',
    '^create table "public"\\."[a-z_]+"',
    '^grant select on table "public"\\."t.*" to',
    '^drop table "public"\\."a"|^drop table "public"\\."b"',
    '^alter table "public"\\.\\w+',
  ]) {
    it(`recusa ${entry}`, () => {
      expect(() => loadAllowlist(entry)).toThrow(/genérica demais/);
    });
  }

  it('só schema ou papel citado não nomeia objeto', () => {
    expect(() => loadAllowlist('^revoke all on schema "public" from "anon"')).toThrow(/nenhum objeto entre aspas/);
  });

  it('prefixo literal com objeto continua aceito', () => {
    expect(loadAllowlist('^create table "public"\\."criada_fora" \\(')).toHaveLength(1);
  });
});

describe('dropDumpLossyFunctions — tipo entre aspas com nome de palavra-chave (Codex P1)', () => {
  const shadow = (ty) => `CREATE OR REPLACE FUNCTION "public"."f"("x" ${ty}) RETURNS void LANGUAGE "sql" AS $$ select 1 $$;\n`;
  const remote = (ty) => `create or replace function public.f(x ${ty}) returns void language sql as $function$ select 1 $function$;\n`;

  it('"integer" (tipo de usuário) não equivale a integer (built-in)', () => {
    expect(dropDumpLossyFunctions(remote('integer'), shadow('"integer"')).dropped).toEqual([]);
    expect(dropDumpLossyFunctions(remote('"integer"'), shadow('integer')).dropped).toEqual([]);
  });

  it('outros apelidos de tipo e palavras-chave também preservam as aspas', () => {
    for (const ty of ['bigint', 'smallint', 'boolean', 'numeric', 'timestamp', 'interval', 'real', 'varchar', 'bit']) {
      expect(dropDumpLossyFunctions(remote(ty), shadow(`"${ty}"`)).dropped).toEqual([]);
    }
  });

  it('controle: "text" (não é palavra-chave) segue equivalente a text', () => {
    expect(dropDumpLossyFunctions(remote('text'), shadow('"text"')).dropped).toEqual(['public.f(x text)']);
  });
});
