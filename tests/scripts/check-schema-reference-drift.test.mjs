import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';

describe('check-schema-reference-drift', () => {
  it('reproduz o diff documental entre SCHEMA_REFERENCE e FOTOGRAFIA', () => {
    const result = spawnSync('node', ['scripts/check-schema-reference-drift.mjs'], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Tabelas public \(escopo histórico\)/);
    expect(result.stdout).toMatch(/388 ->   391/);
    expect(result.stdout).toMatch(/Materialized views/);
    expect(result.stdout).toMatch(/5 ->     4/);
    expect(result.stdout).toMatch(/Diff documental reproduzido/);
    expect(result.stdout).toMatch(/não provam criação, perda ou intenção por objeto/);
  });
});
