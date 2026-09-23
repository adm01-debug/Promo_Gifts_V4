import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function run(fixture, extra = []) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(ROOT, 'scripts/check-quote-rpc-canonical-readiness.mjs'),
      `--from-file=${resolve(ROOT, `tests/fixtures/${fixture}`)}`,
      ...extra,
    ],
    { cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } },
  );
  const output = `${result.stdout}${result.stderr}`;
  const payload = [...output.matchAll(/\] result=(\{.+\})$/gm)].at(-1)?.[1];
  expect(payload, output).toBeTruthy();
  return { exitCode: result.status, result: JSON.parse(payload) };
}

describe('quote RPC canonical readiness gate', () => {
  it('falha fechado contra o contrato destrutivo ainda instalado no canônico', () => {
    const outcome = run('quote-rpc-readiness-legacy.json', ['--require-live']);
    expect(outcome.exitCode).toBe(1);
    expect(outcome.result).toMatchObject({
      status: 'failed',
      reason: 'canonical_contract_not_applied',
      source: 'fixture',
    });
    expect(outcome.result.issues).toContain(
      'update_quote_transactional(uuid,jsonb,jsonb,integer): marcador has_removed_item_ids ausente',
    );
  });

  it('aprova apenas quando as tres funcoes atendem ao contrato revisado', () => {
    const outcome = run('quote-rpc-readiness-hardened.json', ['--require-live']);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.result).toMatchObject({
      status: 'passed',
      reason: 'canonical_contract_verified',
      source: 'fixture',
    });
    expect(outcome.result.signatures).toHaveLength(3);
  });

  it('nao transforma falta de credenciais em aprovacao live', () => {
    const result = spawnSync(
      process.execPath,
      [resolve(ROOT, 'scripts/check-quote-rpc-canonical-readiness.mjs'), '--require-live'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: { PATH: process.env.PATH ?? '', SUPABASE_PROJECT_REF: 'doufsxqlfjyuvxuezpln' },
      },
    );
    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toContain('"reason":"missing_credentials"');
  });

  it('recusa um project ref diferente do SSOT', () => {
    const result = spawnSync(
      process.execPath,
      [resolve(ROOT, 'scripts/check-quote-rpc-canonical-readiness.mjs'), '--require-live'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: { PATH: process.env.PATH ?? '', SUPABASE_PROJECT_REF: 'projeto-errado' },
      },
    );
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('"reason":"wrong_project"');
  });
});
