// Testa scripts/drift-baseline.mjs: montagem da pasta de replay do
// db-schema-drift-check (baseline + migrations aplicadas depois do dump),
// filtro de ruído do diff e varredura de segredos do dump.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  byCodeUnit,
  filterDiff,
  findBaseline,
  findSecrets,
  loadAllowlist,
  maxNumericVersion,
  prepareWorkdir,
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
    const allowlist = loadAllowlist('# ruído conhecido\n^grant maintain on table "public"\\.\n');
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

describe('maxNumericVersion', () => {
  it('ignora versões não numéricas do ledger', () => {
    expect(maxNumericVersion(['20261015140000', '20260623_bugalert1', '20261013180000'])).toBe('20261015140000');
    expect(maxNumericVersion([])).toBeNull();
  });
});
