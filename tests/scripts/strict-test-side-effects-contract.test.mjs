import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const vitestEntrypoint = resolve(rootDir, 'node_modules/vitest/vitest.mjs');
const fixture = resolve(rootDir, 'tests/fixtures/strict-side-effects-failure.fixture.ts');
const fixtureConfig = resolve(rootDir, 'tests/fixtures/vitest.strict-side-effects.config.ts');

describe('strict test side-effects contract', () => {
  it('reprova fetch e console.error não mockados em subprocesso hermético', () => {
    const result = spawnSync(
      process.execPath,
      [vitestEntrypoint, 'run', fixture, '--config', fixtureConfig, '--maxWorkers=1'],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          STRICT_TEST_SIDE_EFFECTS: '1',
          STRICT_REF_WARNINGS: '0',
        },
        timeout: 30_000,
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(output).toContain('[strict-test-side-effects]');
    expect(output).toContain('unexpected network request');
    expect(output).toContain('unexpected console.error');
  });
});
