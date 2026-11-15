// Testa scripts/check-security-definer-acl.mjs, o gate permanente que falha
// se alguma função SECURITY DEFINER em `public` ficar executável por papel
// indevido (anon/PUBLIC fora da whitelist, ou authenticated numa trigger).
//
// Integração CLI real, sem credenciais (static-pass / inconclusive) e com
// um servidor HTTP local simulando o endpoint REST do Supabase — nunca uma
// chamada de rede real.
//
// runScript() usa spawn() assíncrono (nunca spawnSync): o processo filho
// faz fetch() de volta para o servidor HTTP mock que vive no MESMO processo
// deste teste — spawnSync bloquearia o event loop do processo de teste
// inteiro enquanto espera o filho, e o filho ficaria preso esperando uma
// resposta HTTP que o pai nunca processaria (deadlock determinístico,
// reproduzido manualmente antes desta correção).
//
// Regressão cobrada aqui: o script fazia `await res.json()` sem try/catch.
// Um RPC que responde HTTP 200 com corpo que não é JSON válido (página de
// erro de proxy/WAF, resposta truncada, endpoint mal configurado) derrubava
// o processo com uma SyntaxError não tratada em vez de concluir com
// `inconclusive`, quebrando o contrato de check-result-contract.mjs (sem a
// linha `[check] result=...` que a automação de CI espera).
import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-security-definer-acl.mjs');

const temporaryRoots = [];
const servers = [];

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  for (const server of servers.splice(0)) {
    await new Promise((done) => server.close(done));
  }
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

/** Sobe um servidor HTTP local que simula o endpoint REST/RPC do Supabase. */
function startMockRpc(handler) {
  return new Promise((resolveStart) => {
    const server = createServer(handler);
    servers.push(server);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveStart(`http://127.0.0.1:${port}`);
    });
  });
}

function runScript(extraArgs, url) {
  const env = { ...process.env };
  if (url) {
    env.VITE_SUPABASE_URL = url;
    env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key-local-mock';
  } else {
    delete env.VITE_SUPABASE_URL;
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    delete env.SUPABASE_ANON_KEY;
    delete env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }
  return new Promise((done) => {
    const child = spawn('node', [SCRIPT, ...extraArgs], { cwd: ROOT, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (status) => done({ status, stdout, stderr }));
  });
}

// ─── Sem credenciais ────────────────────────────────────────────────────────

describe('CLI (sem credenciais Supabase)', () => {
  it('degrada para static-pass (exit 0) sem credenciais', async () => {
    const result = await runScript([]);
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
  });

  it('degrada para inconclusive (exit 2) com --require-live e sem credenciais', async () => {
    const result = await runScript(['--require-live']);
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });
});

// ─── --baseline: leitura de arquivo ─────────────────────────────────────────

describe('CLI --baseline', () => {
  it('falha (exit 1) com mensagem clara quando o arquivo não existe', async () => {
    const dir = tempDir('sda-baseline-missing-');
    const result = await runScript(['--baseline', join(dir, 'nao-existe.json')]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Não foi possível ler baseline');
  });

  it('falha (exit 1) com mensagem clara quando o JSON é malformado', async () => {
    const dir = tempDir('sda-baseline-malformed-');
    const p = join(dir, 'baseline.json');
    writeFileSync(p, '{invalid json');
    const result = await runScript(['--baseline', p]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Não foi possível ler baseline');
  });

  it('tolera baseline sem campo accepted (0 entradas) e segue em static-pass', async () => {
    const dir = tempDir('sda-baseline-empty-');
    const p = join(dir, 'baseline.json');
    writeFileSync(p, JSON.stringify({ description: 'sem accepted' }));
    const result = await runScript(['--baseline', p]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 entrada(s) conhecida(s)');
  });
});

// ─── Integração live (servidor HTTP local simulando o RPC) ─────────────────

describe('CLI com RPC simulado (servidor HTTP local)', () => {
  it('passa (exit 0) quando o RPC retorna 0 violações', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    });
    const result = await runScript([], url);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 violações');
  });

  it('falha (exit 1) quando o RPC retorna violações novas', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        { function_name: 'fn_a', arguments: 'uuid', granted_to: 'anon', problem: 'EXECUTE granted to anon' },
      ]));
    });
    const result = await runScript([], url);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fn_a');
  });

  it('passa (exit 0) quando todas as violações estão no baseline', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        { function_name: 'fn_a', arguments: 'uuid', granted_to: 'anon', problem: 'EXECUTE granted to anon' },
      ]));
    });
    const dir = tempDir('sda-baseline-cover-');
    const p = join(dir, 'baseline.json');
    writeFileSync(p, JSON.stringify({
      accepted: [{ function_name: 'fn_a', arguments: 'uuid', granted_to: 'anon' }],
    }));
    const result = await runScript(['--baseline', p], url);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 violações novas');
  });

  it('inconclusive (exit 2) quando o RPC retorna um objeto em vez de array', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unexpected shape' }));
    });
    const result = await runScript([], url);
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });

  it('inconclusive (exit 2) quando o RPC retorna HTTP 400', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end('{"message":"bad request"}');
    });
    const result = await runScript([], url);
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });

  // Regressão: antes da correção, HTTP 200 com corpo não-JSON (página de erro
  // de proxy/WAF, resposta truncada) derrubava o processo com uma SyntaxError
  // não tratada (sem a linha `[check] result=...` do contrato), em vez de
  // reportar `inconclusive`. Sem a correção em check-security-definer-acl.mjs
  // (try/catch em torno de `res.json()`), este teste falha porque o processo
  // sai com exit 1 "cru" e stderr vazio de `result=`.
  it('inconclusive (exit 2), sem crash, quando HTTP 200 vem com corpo não-JSON', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('<html>not json at all</html>');
    });
    const result = await runScript([], url);
    const out = result.stdout + result.stderr;
    expect(result.status).toBe(2);
    expect(out).toContain('inconclusive');
    expect(out).toContain('[security-definer-acl] result=');
    expect(out).not.toContain('SyntaxError');
  });

  it('inconclusive (exit 2), sem crash, quando HTTP 200 vem com corpo vazio', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('');
    });
    const result = await runScript([], url);
    const out = result.stdout + result.stderr;
    expect(result.status).toBe(2);
    expect(out).toContain('inconclusive');
    expect(out).not.toContain('SyntaxError');
  });
});
