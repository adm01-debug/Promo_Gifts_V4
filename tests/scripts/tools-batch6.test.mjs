/** Regressão (lote 6): gates que passavam sem varrer/verificar (ripgrep ausente, 5xx, baseline pendente, JSON misturado). */
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { searchFixedString } from '../../scripts/lib/fixed-string-search.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function sandbox(files) {
  const dir = mkdtempSync(join(tmpdir(), 'tools6-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(ROOT, f), join(dir, f));
  }
  return dir;
}
const nodeOnlyPath = dirname(process.execPath);

describe('searchFixedString (fallback sem ripgrep)', () => {
  it('rg e varredura nativa devolvem as mesmas ocorrências', () => {
    const dir = sandbox([]);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/a.ts'), 'linha 1\nModo de seleção ativo aqui\nfim\n');
    writeFileSync(join(dir, 'src/b.ts'), 'nada\n');
    const withRg = searchFixedString('Modo de seleção ativo', [join(dir, 'src')]);
    const native = searchFixedString('Modo de seleção ativo', [join(dir, 'src')], { forceNative: true });
    expect(native).toHaveLength(1);
    expect(native[0]).toMatch(/src\/a\.ts:2:.*Modo de seleção ativo/);
    expect(withRg.map((l) => l.split(':').slice(0, 2).join(':'))).toEqual(native.map((l) => l.split(':').slice(0, 2).join(':')));
  });
  it('trata a frase como literal (não regex) e ignora caminhos inexistentes', () => {
    const dir = sandbox([]);
    writeFileSync(join(dir, 'x.txt'), 'a.c e abc\n');
    expect(searchFixedString('a.c', [join(dir, 'x.txt'), join(dir, 'nao-existe')], { forceNative: true })).toHaveLength(1);
    expect(searchFixedString('a.d', [join(dir, 'x.txt')], { forceNative: true })).toHaveLength(0);
  });
});

describe('gates de frase banida sem ripgrep no PATH', () => {
  it('check-removed-phrases acha a frase mesmo sem rg (antes: ✅ sem varrer)', () => {
    const dir = sandbox(['scripts/check-removed-phrases.mjs', 'scripts/lib/fixed-string-search.mjs']);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/x.tsx'), '<p>Modo de seleção ativo</p>\n');
    const r = spawnSync(process.execPath, ['scripts/check-removed-phrases.mjs'], { cwd: dir, encoding: 'utf8', env: { PATH: nodeOnlyPath } });
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toContain('src/x.tsx');
  });
  it('check-no-salvar-alteracoes-draft idem', () => {
    const dir = sandbox(['scripts/check-no-salvar-alteracoes-draft.mjs', 'scripts/lib/fixed-string-search.mjs']);
    const script = spawnSync('sed', ['-n', '/^const SCOPE/,/^\\];/p', join(ROOT, 'scripts/check-no-salvar-alteracoes-draft.mjs')], { encoding: 'utf8' }).stdout;
    const firstPath = /['"]([^'"]+)['"]/.exec(script)?.[1];
    expect(firstPath).toBeTruthy();
    mkdirSync(dirname(join(dir, firstPath)), { recursive: true });
    writeFileSync(join(dir, firstPath), 'Salvar Alterações\n');
    const r = spawnSync(process.execPath, ['scripts/check-no-salvar-alteracoes-draft.mjs'], { cwd: dir, encoding: 'utf8', env: { PATH: nodeOnlyPath } });
    expect(r.status, r.stdout + r.stderr).toBe(1);
  });
  it('sem frases banidas continua passando sem rg', () => {
    const dir = sandbox(['scripts/check-removed-phrases.mjs', 'scripts/lib/fixed-string-search.mjs']);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/ok.tsx'), '<p>ok</p>\n');
    expect(spawnSync(process.execPath, ['scripts/check-removed-phrases.mjs'], { cwd: dir, encoding: 'utf8', env: { PATH: nodeOnlyPath } }).status).toBe(0);
  });
});

describe('check-draft-canonical-target --json', () => {
  it('stdout é só o JSON (antes: resumo em texto depois do JSON quebrava JSON.parse)', () => {
    const r = spawnSync(process.execPath, ['scripts/check-draft-canonical-target.mjs', '--json'], { cwd: ROOT, encoding: 'utf8' });
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });
});

describe('check-restore-seller-cart-rpc contra servidor PostgREST simulado', () => {
  async function withServer(handler, fn) {
    const calls = [];
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        calls.push({ url: req.url, body });
        handler(req, res, body);
      });
    });
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
    try {
      return await fn(`http://127.0.0.1:${server.address().port}`, calls);
    } finally {
      await new Promise((ok) => server.close(ok));
    }
  }
  const runScript = (url, env = {}) =>
    new Promise((done) => {
      const child = spawn(process.execPath, ['scripts/check-restore-seller-cart-rpc.mjs'], {
        cwd: ROOT,
        env: { PATH: process.env.PATH, CANONICAL_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'dummy', ...env },
      });
      let out = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (out += d));
      child.on('close', (code) => done({ code, out }));
    });

  it('STRICT=1 com PostgREST em 503 → exit 1 (antes: "RPC presente (status=503)")', async () => {
    await withServer((_q, res) => { res.statusCode = 503; res.end('{}'); }, async (url) => {
      const r = await runScript(url, { STRICT: '1' });
      expect(r.code, r.out).toBe(1);
      expect(r.out).not.toContain('presente');
    });
  });
  it('fallback fn_rpc_exists envia o parâmetro _fname', async () => {
    await withServer((req, res) => {
      if (req.url.includes('fn_rpc_exists')) { res.setHeader('content-type', 'application/json'); res.end('true'); return; }
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ code: '42883', message: 'function does not exist' }));
    }, async (url, calls) => {
      const r = await runScript(url, { STRICT: '1' });
      const existsCall = calls.find((c) => c.url.includes('fn_rpc_exists'));
      expect(existsCall, r.out).toBeTruthy();
      expect(JSON.parse(existsCall.body)).toEqual({ _fname: 'restore_seller_cart' });
      expect(r.code, r.out).toBe(0);
    });
  });
});

describe('check-policies-baseline com baseline pendente de seed', () => {
  const setup = () => {
    const dir = sandbox(['scripts/check-policies-baseline.mjs', 'scripts/check-result-contract.mjs', 'scripts/supabase-read-only-query.mjs', 'scripts/lib/canonical-pg-connection.mjs']);
    mkdirSync(join(dir, '.security'), { recursive: true });
    mkdirSync(join(dir, 'supabase/migrations'), { recursive: true });
    writeFileSync(join(dir, '.security/policies-baseline.json'), JSON.stringify({ pending_seed: true, policies: [], sha256: '' }));
    writeFileSync(join(dir, 'live.json'), '[]');
    return dir;
  };
  const run = (dir, extra = []) =>
    spawnSync(process.execPath, ['scripts/check-policies-baseline.mjs', '--from-file=live.json', ...extra], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });
  it('sem --require-live: static-pass (exit 0)', () => {
    expect(run(setup()).status).toBe(0);
  });
  it('com --require-live: falha (exit 1) — antes: static-pass desligava o gate', () => {
    const r = run(setup(), ['--require-live']);
    expect(r.status, r.stdout + r.stderr).toBe(1);
  });
});

describe('check-generated-files-protected', () => {
  it('SHA base inexistente com --gate → exit 2 (antes: "nenhuma redução", exit 0)', () => {
    const dir = sandbox(['scripts/check-generated-files-protected.mjs']);
    const env = { PATH: process.env.PATH, HOME: process.env.HOME ?? '', GIT_CONFIG_GLOBAL: '/dev/null', GITHUB_BASE_SHA: 'deadbeefdeadbeef' };
    spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir, env });
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: dir, env });
    const r = spawnSync(process.execPath, ['scripts/check-generated-files-protected.mjs', '--gate'], { cwd: dir, encoding: 'utf8', env });
    expect(r.status, r.stdout + r.stderr).toBe(2);
  });
});
