import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = join(process.cwd(), 'scripts/uptime-probe.sh');
const tempDirs: string[] = [];

function runProbe(httpCode: string, curlExit: number) {
  const tempDir = mkdtempSync(join(tmpdir(), 'uptime-probe-test-'));
  tempDirs.push(tempDir);
  const binDir = join(tempDir, 'bin');
  mkdirSync(binDir);
  const curlPath = join(binDir, 'curl');
  writeFileSync(
    curlPath,
    '#!/usr/bin/env bash\nprintf "%s\\n" "$FAKE_HTTP_CODE"\nexit "$FAKE_CURL_EXIT"\n',
    { mode: 0o755 },
  );
  const outputPath = join(tempDir, 'github-output.txt');
  writeFileSync(outputPath, '');

  const result = spawnSync('bash', [scriptPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      GITHUB_OUTPUT: outputPath,
      SUPABASE_ANON_KEY: 'test-key-never-printed',
      SITE_URL: 'https://site.test/',
      FN_URL: 'https://edge.test/health-check',
      LOGIN_FN_URL: 'https://edge.test/check-login',
      AUTH_HEALTH_URL: 'https://auth.test/health',
      FAKE_HTTP_CODE: httpCode,
      FAKE_CURL_EXIT: String(curlExit),
    },
  });

  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    outputs: readFileSync(outputPath, 'utf8'),
  };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) rmSync(tempDir, { recursive: true, force: true });
});

describe('uptime-probe', () => {
  it('registra HTTP e exit code sem imprimir chave ou resposta', () => {
    const result = runProbe('200', 0);

    expect(result.exitCode).toBe(0);
    expect(result.outputs).toContain('fn=0\nfn_http=200');
    expect(result.outputs).toContain('site=0\nsite_http=200');
    expect(`${result.stdout}${result.stderr}${result.outputs}`).not.toContain(
      'test-key-never-printed',
    );
  });

  it('distingue erro HTTP 503 de falha de transporte', () => {
    const httpFailure = runProbe('503', 22);
    expect(httpFailure.exitCode).toBe(1);
    expect(httpFailure.outputs).toContain('fn=22\nfn_http=503');

    const transportFailure = runProbe('000', 6);
    expect(transportFailure.exitCode).toBe(1);
    expect(transportFailure.outputs).toContain('fn=6\nfn_http=000');
  });
});
