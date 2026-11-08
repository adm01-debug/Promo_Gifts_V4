import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const EVENT_SCRIPT = join(ROOT, 'scripts/check-event-triggers-drift.mjs');
const CRON_SCRIPT = join(ROOT, 'scripts/check-cron-drift.mjs');
const EVENT_SNAPSHOT = join(ROOT, 'supabase/baseline/20261108000000_event_triggers.json');
const CRON_SNAPSHOT = join(ROOT, 'supabase/baseline/20261108000000_cron_jobs.json');
const DRIFT_WORKFLOW = join(ROOT, '.github/workflows/db-schema-drift-check.yml');
const DEPLOY_WORKFLOW = join(ROOT, '.github/workflows/deploy-gates.yml');
const tempDirs = [];

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop(), { recursive: true, force: true });
});

function uniqueSorted(rows, key) {
  const names = rows.map((row) => row[key]);
  return (
    new Set(names).size === names.length &&
    names.every((name, index) => !index || names[index - 1] < name)
  );
}

function runWithFakePsql(kind) {
  const root = mkdtempSync(join(tmpdir(), 'infra-drift-psql-'));
  tempDirs.push(root);
  const baselineDir = join(root, 'supabase/baseline');
  const binDir = join(root, 'bin');
  const capturePath = join(root, 'capture.json');
  mkdirSync(baselineDir, { recursive: true });
  mkdirSync(binDir);

  const isEvent = kind === 'event';
  const snapshot = isEvent
    ? [
        {
          evtname: 'evt_test',
          evtevent: 'ddl_command_end',
          evtenabled: 'O',
          evtfunc: 'public.fn_test',
        },
      ]
    : [{ jobname: 'cron-test', schedule: '7 * * * *', active: true }];
  const suffix = isEvent ? 'event_triggers' : 'cron_jobs';
  writeFileSync(join(baselineDir, `20261108000000_${suffix}.json`), JSON.stringify(snapshot));

  const fakePsql = join(binDir, 'psql');
  writeFileSync(
    fakePsql,
    `#!/usr/bin/env node
const { writeFileSync } = require('node:fs');
writeFileSync(process.env.CAPTURE_PATH, JSON.stringify({
  argv: process.argv.slice(2),
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
}));
process.stdout.write(process.env.FAKE_KIND === 'event'
  ? 'evt_test|ddl_command_end|O|public.fn_test\\n'
  : '[{"jobname":"cron-test","schedule":"7 * * * *","active":true}]\\n');
`,
  );
  chmodSync(fakePsql, 0o755);

  const password = '@:/#$()" senha com espaço';
  const result = spawnSync(process.execPath, [isEvent ? EVENT_SCRIPT : CRON_SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      DATABASE_URL: '',
      SUPABASE_PROJECT_REF: 'projeto-canônico-teste',
      SUPABASE_DB_PASSWORD: password,
      CAPTURE_PATH: capturePath,
      FAKE_KIND: kind,
    },
  });

  return { result, password, capture: JSON.parse(readFileSync(capturePath, 'utf8')) };
}

describe('snapshots de infraestrutura live', () => {
  it('versiona metadados completos de event triggers sem duplicidade', () => {
    const rows = JSON.parse(readFileSync(EVENT_SNAPSHOT, 'utf8'));

    expect(rows.length).toBeGreaterThan(0);
    expect(uniqueSorted(rows, 'evtname')).toBe(true);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['evtenabled', 'evtevent', 'evtfunc', 'evtname']);
      expect(
        Object.values(row).every((value) => typeof value === 'string' && value.length > 0),
      ).toBe(true);
    }
  });

  it('versiona apenas schedule/active dos crons, sem command nem IDs instáveis', () => {
    const rows = JSON.parse(readFileSync(CRON_SNAPSHOT, 'utf8'));

    expect(rows.length).toBeGreaterThan(0);
    expect(uniqueSorted(rows, 'jobname')).toBe(true);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['active', 'jobname', 'schedule']);
      expect(row.jobname).toEqual(expect.any(String));
      expect(row.schedule).toEqual(expect.any(String));
      expect(row.active).toEqual(expect.any(Boolean));
      expect(row).not.toHaveProperty('command');
      expect(row).not.toHaveProperty('jobid');
    }
  });

  it.each([
    ['event triggers', EVENT_SCRIPT],
    ['cron jobs', CRON_SCRIPT],
  ])('falha fechado quando o snapshot de %s está ausente', (_label, script) => {
    const root = mkdtempSync(join(tmpdir(), 'infra-drift-snapshot-'));
    tempDirs.push(root);
    mkdirSync(join(root, 'supabase/baseline'), { recursive: true });

    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/snapshot versionado .* ausente .* fail-closed/i);
    expect(result.stdout).not.toMatch(/bootstrap.*passando/i);
  });

  it('não consulta command de cron e compara alterações de configuração', () => {
    const source = readFileSync(CRON_SCRIPT, 'utf8');

    expect(source).toContain('SELECT jobname,schedule,active FROM cron.job');
    expect(source).not.toContain('jobname,schedule,command,active');
    expect(source).toContain('actual.schedule !== expected.schedule');
    expect(source).toContain('actual.active !== expected.active');
  });

  it.each(['event', 'cron'])('passa senha com metacaracteres fora do shell/argv (%s)', (kind) => {
    const { result, password, capture } = runWithFakePsql(kind);

    expect(result.status, result.stderr).toBe(0);
    expect(capture.argv.join(' ')).not.toContain(password);
    expect(capture.argv).not.toContain('--dbname');
    expect(capture).toMatchObject({
      host: 'db.projeto-canônico-teste.supabase.co',
      port: '5432',
      database: 'postgres',
      user: 'postgres',
      password,
    });
  });

  it('invoca psql sem shell nos dois gates', () => {
    for (const script of [EVENT_SCRIPT, CRON_SCRIPT]) {
      const source = readFileSync(script, 'utf8');
      expect(source).toMatch(/execFileSync\(\s*['"]psql['"]/);
      expect(source).not.toMatch(/\bexecSync\b/);
    }
  });

  it('separa a concorrência standalone/E40 e ativa ambos quando os gates mudam', () => {
    const drift = readFileSync(DRIFT_WORKFLOW, 'utf8');
    const deploy = readFileSync(DEPLOY_WORKFLOW, 'utf8');

    expect(drift).toContain('group: db-schema-drift-${{ github.workflow }}-${{ github.ref }}');
    for (const script of ['check-event-triggers-drift', 'check-cron-drift']) {
      expect(drift).toContain(`scripts/${script}.mjs`);
      expect(deploy).toContain(script);
    }
  });
});
