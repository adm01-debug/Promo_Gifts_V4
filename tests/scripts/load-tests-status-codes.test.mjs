/**
 * Regressão: testes de carga/fuzz contavam qualquer status < 500 como sucesso — um alvo que
 * respondia 401/404 em 100% das chamadas dava "✅ Todos os SLAs satisfeitos"; e o fuzz com
 * servidor inalcançável (status -1) dava "✅ PASSOU — N requests sem crashes".
 * Roda contra um servidor HTTP local (127.0.0.1) — nunca contra produção.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const cwds = [];
afterAll(() => cwds.forEach((d) => rmSync(d, { recursive: true, force: true })));

let status = 200;
let server;
let baseUrl;
beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.statusCode = status;
    res.end('{}');
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((ok) => server.close(ok)));

function run(script, env) {
  // cwd temporário: freight-quest-load-test grava load-test-report.json no cwd.
  const cwd = mkdtempSync(join(tmpdir(), 'load-'));
  cwds.push(cwd);
  return new Promise((done) => {
    const child = spawn('node', [join(ROOT, 'scripts', script)], {
      cwd,
      env: { PATH: process.env.PATH, DRY_RUN: '0', SUPABASE_SERVICE_ROLE_KEY: 'dummy', ...env },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => done({ code, out }));
  });
}

describe.each([['massive-load-test.mjs'], ['freight-quest-load-test.mjs']])('%s', (script) => {
  it('alvo respondendo 404 em tudo reprova (exit 1)', async () => {
    status = 404;
    const r = await run(script, { SUPABASE_URL: baseUrl });
    expect(r.code, r.out.slice(-400)).toBe(1);
  }, 120_000);

  it('alvo saudável (200) passa (exit 0)', async () => {
    status = 200;
    const r = await run(script, { SUPABASE_URL: baseUrl });
    expect(r.code, r.out.slice(-400)).toBe(0);
  }, 120_000);
});

describe('fuzz-testing', () => {
  it('servidor inalcançável reprova (exit 1) — antes: "✅ PASSOU"', async () => {
    const r = await run('fuzz-testing.mjs', { SUPABASE_URL: 'http://127.0.0.1:9', FUZZ_MAX_COMBINATIONS: '2' });
    expect(r.code, r.out.slice(-300)).toBe(1);
    expect(r.out).toContain('erros de rede');
  }, 120_000);
});
