import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FOTOGRAFIA_FILE = resolve(ROOT, 'docs/FOTOGRAFIA_PG_CATALOG_2026-08-26.md');
const fotografiaExists = existsSync(FOTOGRAFIA_FILE);

describe('check-schema-reference-drift', () => {
  it.skipIf(!fotografiaExists)('reproduz o diff documental entre SCHEMA_REFERENCE e FOTOGRAFIA', () => {
    const result = spawnSync('node', ['scripts/check-schema-reference-drift.mjs'], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Tabelas public \(escopo histórico\)/);
    expect(result.stdout).toMatch(/385 ->   391/);
    expect(result.stdout).toMatch(/Materialized views/);
    expect(result.stdout).toMatch(/12 ->     4/);
    expect(result.stdout).toMatch(/Diff documental reproduzido/);
    expect(result.stdout).toMatch(/não provam criação, perda ou intenção por objeto/);
  });
});
