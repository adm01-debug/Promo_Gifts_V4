import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const openServers = [];

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(
      (server) =>
        new Promise((resolveClose, rejectClose) => {
          server.close((error) => (error ? rejectClose(error) : resolveClose()));
        }),
    ),
  );
});

async function startServer(handler) {
  const server = createServer((request, response) => {
    Promise.resolve(handler(request, response)).catch((error) => {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: error.message }));
    });
  });
  openServers.push(server);
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor de fixture sem porta TCP.');
  return `http://127.0.0.1:${address.port}`;
}

// spawn assíncrono (não spawnSync): este teste hospeda um servidor HTTP no
// mesmo processo e o processo filho chama esse servidor via fetch — usar
// spawnSync aqui bloquearia o event loop e causaria deadlock determinístico.
function runAsync(env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(ROOT, 'scripts/check-quote-rpc-canonical-readiness.mjs'), '--require-live'],
      { cwd: ROOT, env: { PATH: process.env.PATH ?? '', ...env } },
    );
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.once('error', rejectRun);
    child.once('close', (exitCode) => {
      const payload = [...output.matchAll(/\] result=(\{.+\})$/gm)].at(-1)?.[1];
      resolveRun({ exitCode, output, result: payload ? JSON.parse(payload) : null });
    });
  });
}

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

  it('nao consulta um VITE_SUPABASE_URL nao-canonico quando falta SUPABASE_PROJECT_REF (ex.: .env local do pqp)', async () => {
    let hit = false;
    const url = await startServer((_request, response) => {
      hit = true;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify([]));
    });

    const outcome = await runAsync({
      // SUPABASE_ACCESS_TOKEN sozinho (sem SUPABASE_PROJECT_REF) não habilita
      // a Management API — querySupabaseReadOnly cairia no fallback pg-meta
      // usando VITE_SUPABASE_URL, que aqui aponta para um projeto não-canônico.
      SUPABASE_ACCESS_TOKEN: 'fake-pat-sem-project-ref',
      VITE_SUPABASE_URL: url,
      SUPABASE_SERVICE_ROLE_KEY: 'fake-service-role-key',
    });

    expect(hit).toBe(false);
    expect(outcome.exitCode).toBe(2);
    expect(outcome.result).toMatchObject({ reason: 'missing_credentials' });
  });
});
