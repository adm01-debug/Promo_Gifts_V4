// Testa scripts/check-security-definer-audit.mjs — Gate 5 CHECK 2, que
// audita funções SECURITY DEFINER em `public` via Management API (ou
// fallback pg-meta local) e falha se alguma não tiver search_path explícito
// em pg_proc.proconfig.
//
// Mesmo espírito de tests/scripts/check-security-definer-acl.test.mjs e
// tests/scripts/check-anon-write-grants.test.mjs: funções puras testadas por
// unidade + integração CLI real sem credenciais (static-pass / inconclusive)
// e com um servidor HTTP local simulando o endpoint pg-meta — nunca uma
// chamada de rede real ao Supabase.
//
// Diferença importante de atenção: o servidor HTTP mock e o processo filho
// (CLI) NÃO podem estar na mesma relação spawnSync-no-mesmo-processo — veja
// runScript() abaixo. `spawnSync` bloqueia TODO o event loop do processo que
// o chama até o filho terminar; se o mock HTTP também vive nesse mesmo
// processo (como em outros testes deste repo), o handler do servidor nunca
// roda enquanto o spawnSync está bloqueado, e o filho fica esperando uma
// resposta que nunca chega — deadlock observado empiricamente neste
// ambiente. Por isso usamos `spawn` assíncrono + Promise aqui.
import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeViolations } from '../../scripts/check-security-definer-audit.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-security-definer-audit.mjs');

const servers = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise((done) => server.close(done));
  }
});

/** Sobe um servidor HTTP local que simula o endpoint pg-meta do Supabase. */
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

/**
 * Executa o script como processo filho, assincronamente. Usa `spawn` (não
 * `spawnSync`) de propósito: ver comentário no topo do arquivo.
 */
function runScript(extraArgs, url, extraEnv = {}, timeoutMs = 10000) {
  return new Promise((resolveRun) => {
    const env = { ...process.env, ...extraEnv };
    // Nunca deixa este teste tocar a Management API real.
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    if (url) {
      env.VITE_SUPABASE_URL = url;
      env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key-local-mock';
    } else {
      delete env.VITE_SUPABASE_URL;
      delete env.SUPABASE_SERVICE_ROLE_KEY;
    }
    const child = spawn('node', [SCRIPT, ...extraArgs], { cwd: ROOT, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolveRun({ status: null, stdout, stderr, timedOut: true });
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolveRun({ status: code, stdout, stderr, timedOut: false });
    });
  });
}

// ─── computeViolations (função pura) ────────────────────────────────────────

describe('computeViolations', () => {
  it('não sinaliza nada quando rows está vazio', () => {
    expect(computeViolations([])).toEqual([]);
  });

  it('sinaliza proconfig null (sem search_path)', () => {
    const rows = [{ function_name: 'fn_a', arguments: 'uuid', proconfig: null }];
    expect(computeViolations(rows)).toEqual(rows);
  });

  it('não sinaliza quando o array proconfig contém search_path=', () => {
    const rows = [{ function_name: 'fn_b', arguments: '', proconfig: ['search_path=public,pg_temp'] }];
    expect(computeViolations(rows)).toEqual([]);
  });

  it('sinaliza quando o array proconfig existe mas não contém search_path', () => {
    const rows = [{ function_name: 'fn_c', arguments: '', proconfig: ['lock_timeout=5000'] }];
    expect(computeViolations(rows)).toEqual(rows);
  });

  it('sinaliza um proconfig = [] (array vazio, sem nenhuma GUC)', () => {
    const rows = [{ function_name: 'fn_d', arguments: '', proconfig: [] }];
    expect(computeViolations(rows)).toEqual(rows);
  });

  it('trata proconfig como string (não-array) contendo search_path= como OK', () => {
    const rows = [{ function_name: 'fn_e', arguments: '', proconfig: 'search_path=public' }];
    expect(computeViolations(rows)).toEqual([]);
  });

  it('não derruba com nome de função unicode/emoji', () => {
    const rows = [{ function_name: 'fn_é_🚀', arguments: 'text', proconfig: null }];
    expect(computeViolations(rows)).toEqual(rows);
  });

  it('escala para uma resposta grande (100k linhas) sem explodir', () => {
    const rows = [];
    for (let i = 0; i < 100_000; i += 1) {
      rows.push({
        function_name: `fn_${i}`,
        arguments: '',
        proconfig: i % 2 === 0 ? ['search_path=public'] : null,
      });
    }
    const violations = computeViolations(rows);
    expect(violations).toHaveLength(50_000);
  });

  // Regressão: uma resposta corrompida/truncada da Management API (ou do
  // fallback pg-meta) pode chegar como um array JSON válido contendo uma
  // entrada nula ou sem os campos esperados — por exemplo um corpo truncado
  // por um proxy/WAF no meio de uma linha. Antes da correção, o acesso direto
  // a `r.function_name` (sem optional chaining) derrubava o processo com uma
  // TypeError não tratada, quebrando o contrato `[check] result=...` que a
  // automação de CI espera (ver mesmo padrão de regressão em
  // check-security-definer-acl.test.mjs). Sem a correção, este teste falha
  // porque `computeViolations([null])` lança em vez de devolver uma violação.
  it('trata uma linha nula/corrompida como violação (falha-fechado), sem lançar', () => {
    const rows = [null, { function_name: 'fn_ok', arguments: '', proconfig: ['search_path=public'] }];
    expect(() => computeViolations(rows)).not.toThrow();
    const violations = computeViolations(rows);
    expect(violations).toEqual([null]);
  });

  it('trata uma linha sem nenhum campo esperado (objeto vazio) como violação', () => {
    const rows = [{}];
    expect(computeViolations(rows)).toEqual([{}]);
  });
});

// ─── CLI sem credenciais (nenhuma rede) ─────────────────────────────────────

describe('CLI (sem credenciais Supabase)', () => {
  it('degrada para static-pass (exit 0) sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF', async () => {
    const r = await runScript([], null);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toContain('static-pass');
  });

  it('degrada para inconclusive (exit 2) com --require-live e sem credenciais', async () => {
    const r = await runScript(['--require-live'], null);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain('inconclusive');
  });

  it('REQUIRE_LIVE=1 via env tem o mesmo efeito de --require-live', async () => {
    const r = await runScript([], null, { REQUIRE_LIVE: '1' });
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain('inconclusive');
  });

  it('REQUIRE_LIVE="true" (valor inesperado, não é exatamente "1") é ignorado', async () => {
    const r = await runScript([], null, { REQUIRE_LIVE: 'true' });
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toContain('static-pass');
  });

  it('argumentos extras/malformados não quebram o parsing de --require-live', async () => {
    const r = await runScript(['--foo=bar', '--require-live', 'posicional-esquisito'], null);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain('inconclusive');
  });
});

// ─── CLI com pg-meta simulado (servidor HTTP local, nunca rede real) ────────

describe('CLI com pg-meta simulado (servidor HTTP local)', () => {
  it('inconclusive (exit 2) quando 0 funções SECURITY DEFINER voltam (resultado suspeito)', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    });
    const r = await runScript([], url);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain('resultado suspeito');
  });

  it('passed (exit 0) quando todas as funções têm search_path', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        { function_name: 'fn_ok', arguments: '', proconfig: ['search_path=public,pg_temp'] },
      ]));
    });
    const r = await runScript([], url);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toContain('passed');
  });

  it('failed (exit 1) quando uma função não tem search_path', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ function_name: 'fn_bad', arguments: 'uuid', proconfig: null }]));
    });
    const r = await runScript([], url);
    expect(r.status).toBe(1);
    const out = r.stdout + r.stderr;
    expect(out).toContain('failed');
    expect(out).toContain('fn_bad');
  });

  it('inconclusive (exit 2), sem crash, quando o endpoint retorna HTTP 400', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end('{"message":"bad request"}');
    });
    const r = await runScript([], url);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain('inconclusive');
  });

  it('inconclusive (exit 2), sem crash, quando HTTP 200 vem com corpo não-JSON', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('<html>not json at all</html>');
    });
    const r = await runScript([], url);
    const out = r.stdout + r.stderr;
    expect(r.status).toBe(2);
    expect(out).toContain('inconclusive');
    expect(out).toContain('[security-definer-audit] result=');
    expect(out).not.toContain('SyntaxError');
  });

  it('inconclusive (exit 2), sem crash, quando o corpo é um objeto em vez de array', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unexpected shape' }));
    });
    const r = await runScript([], url);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain('inconclusive');
  });

  it('inconclusive (exit 2), sem crash, quando a conexão é recusada (ECONNREFUSED)', async () => {
    // Porta 1 não tem nada escutando neste sandbox — gera erro de rede real
    // (não uma chamada ao Supabase real), exercitando o branch network-error.
    const r = await runScript([], 'http://127.0.0.1:1');
    const out = r.stdout + r.stderr;
    expect(r.status).toBe(2);
    expect(out).toContain('inconclusive');
  });

  // Regressão principal desta suíte: ver computeViolations acima. Aqui
  // provamos o comportamento ponta a ponta via CLI: uma resposta corrompida
  // (array JSON válido com uma entrada nula) não derruba o processo nem
  // perde a linha `[check] result=...` — falha-fechado como violação.
  it('failed (exit 1), sem crash e com o contrato result= intacto, quando uma linha vem nula/corrompida', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[null]');
    });
    const r = await runScript([], url);
    const out = r.stdout + r.stderr;
    expect(r.timedOut).toBe(false);
    expect(r.status).toBe(1);
    expect(out).toContain('[security-definer-audit] result=');
    expect(out).not.toContain('TypeError');
    expect(out).not.toContain('Cannot read properties of null');
  });

  it('não derruba quando GITHUB_STEP_SUMMARY aponta para um diretório inexistente', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ function_name: 'fn_ok', arguments: '', proconfig: ['search_path=public'] }]));
    });
    const r = await runScript([], url, { GITHUB_STEP_SUMMARY: '/nao-existe-xyz/summary.md' });
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toContain('passed');
  });

  it('duas instâncias concorrentes contra o mesmo servidor terminam corretamente, sem race condition', async () => {
    const url = await startMockRpc((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ function_name: 'fn_ok', arguments: '', proconfig: ['search_path=public'] }]));
    });
    const [r1, r2] = await Promise.all([runScript([], url), runScript([], url)]);
    expect(r1.status).toBe(0);
    expect(r2.status).toBe(0);
  });
});
