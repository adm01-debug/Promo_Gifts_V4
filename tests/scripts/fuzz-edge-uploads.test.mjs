import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HMAC_SIGNATURES_ADVERSARIAIS,
  validateFuzzCorpus,
} from '../../scripts/fuzz-edge-uploads.mjs';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/fuzz-edge-uploads.mjs');

function runScript(env) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
}

function runScriptAsync(env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT_PATH], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectRun);
    child.once('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

describe('fuzz-edge-uploads', () => {
  it('mantém o corpus HMAC serializável e transmissível por HTTP', () => {
    expect(HMAC_SIGNATURES_ADVERSARIAIS).toHaveLength(8);
    expect(HMAC_SIGNATURES_ADVERSARIAIS.every((value) => typeof value === 'string')).toBe(true);
    expect(HMAC_SIGNATURES_ADVERSARIAIS).toContain('%00'.repeat(100));
    expect(HMAC_SIGNATURES_ADVERSARIAIS.some((value) => /[\0\r\n]/u.test(value))).toBe(false);
    expect(validateFuzzCorpus()).toMatchObject({
      hmacSignatures: 8,
      contentTypes: 5,
      mimePolyglots: 5,
      webhookPayloads: 10,
    });
  });

  it('executa todos os cenários em dry-run sem fazer HTTP', () => {
    const result = runScript({
      DRY_RUN: '1',
      SUPABASE_URL: '',
      VITE_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_TEST_BYPASS_TOKEN: '',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Total:   134');
    expect(result.stdout).toContain('✅ Pass: 134');
    expect(result.stdout).toContain('❌ Fail: 0');
  });

  it('transmite os 134 cenários contra um servidor HTTP local', async () => {
    const server = createServer((request, response) => {
      request.resume();
      response.writeHead(204);
      response.end();
    });
    await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));

    try {
      const address = server.address();
      const result = await runScriptAsync({
        DRY_RUN: '0',
        SUPABASE_URL: `http://127.0.0.1:${address.port}`,
        SUPABASE_SERVICE_ROLE_KEY: 'test-only-token',
        SUPABASE_TEST_BYPASS_TOKEN: '',
        ALLOW_PROD_LOAD: '',
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Total:   134');
      expect(result.stdout).toContain('✅ Pass: 134');
      expect(result.stdout).toContain('❌ Fail: 0');
    } finally {
      await new Promise((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose());
      });
    }
  }, 15_000);

  it('bloqueia carga contra produção sem autorização explícita', () => {
    const result = runScript({
      DRY_RUN: '0',
      SUPABASE_URL: 'https://doufsxqlfjyuvxuezpln.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-token',
      SUPABASE_TEST_BYPASS_TOKEN: '',
      ALLOW_PROD_LOAD: '',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('BLOQUEADO: produção exige ALLOW_PROD_LOAD=1');
    expect(result.stdout).toBe('');
  });
});
