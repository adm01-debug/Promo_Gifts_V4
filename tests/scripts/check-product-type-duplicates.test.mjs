import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-product-type-duplicates.mjs');

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-product-type-duplicates-'));
  temporaryRoots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  return root;
}

function runCheck(cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.once('error', rejectRun);
    child.once('close', (code) => resolveRun({ code, stdout, stderr }));
  });
}

describe('check-product-type-duplicates ratchet', () => {
  it('detecta uma 2a declaração "interface Product" adicionada ao MESMO arquivo que já tinha uma', async () => {
    // Baseline capturado quando havia só 1 arquivo com 1 declaração.
    const root = fixture({
      '.product-interface-baseline.json': JSON.stringify({ count: 1 }) + '\n',
      'src/a/one.ts': 'export interface Product {\n  id: string;\n}\n',
    });

    const before = await runCheck(root);
    expect(before.code).toBe(0);

    // Regressão: adiciona uma SEGUNDA declaração dentro do MESMO arquivo
    // (nenhum arquivo novo é criado — o número de arquivos com match não muda).
    writeFileSync(
      join(root, 'src/a/one.ts'),
      'export interface Product {\n  id: string;\n}\n\ninterface Product {\n  legacy: true;\n}\n',
      'utf8',
    );

    const after = await runCheck(root);
    expect(after.code).toBe(1);
    expect(after.stderr).toContain('nova(s) definição(ões)');
  });

  it('não acusa regressão quando a contagem real não muda', async () => {
    const root = fixture({
      '.product-interface-baseline.json': JSON.stringify({ count: 1 }) + '\n',
      'src/a/one.ts': 'export interface Product {\n  id: string;\n}\n',
    });

    const result = await runCheck(root);
    expect(result.code).toBe(0);
  });
});
