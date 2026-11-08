import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const EVENT_SCRIPT = join(ROOT, 'scripts/check-event-triggers-drift.mjs');
const CRON_SCRIPT = join(ROOT, 'scripts/check-cron-drift.mjs');
const EVENT_SNAPSHOT = join(ROOT, 'supabase/baseline/20261108000000_event_triggers.json');
const CRON_SNAPSHOT = join(ROOT, 'supabase/baseline/20261108000000_cron_jobs.json');
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
});
