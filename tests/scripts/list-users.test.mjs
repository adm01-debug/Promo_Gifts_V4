import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/list-users.ts');

function runScript(env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', SCRIPT_PATH], {
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

describe('list-users — propaga falha da Admin API como exit code != 0', () => {
  it('sai com status != 0 quando auth.admin.listUsers() devolve error', async () => {
    const server = createServer((request, response) => {
      request.resume();
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ msg: 'internal error simulada' }));
    });
    await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));

    try {
      const address = server.address();
      const result = await runScript({
        SUPABASE_URL: `http://127.0.0.1:${address.port}`,
        SUPABASE_SERVICE_ROLE_KEY: 'test-only-token',
      });

      expect(result.stderr).toContain('Error listing users');
      // Antes da correção: o erro era só logado — o processo sempre saía
      // com status 0, mascarando a falha real da Admin API para quem
      // depende do exit code (ex.: um workflow chamando este script).
      expect(result.status).not.toBe(0);
    } finally {
      await new Promise((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose());
      });
    }
  }, 15_000);
});
