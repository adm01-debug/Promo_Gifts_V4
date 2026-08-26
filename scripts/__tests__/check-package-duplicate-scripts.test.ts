import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  checkPackageDuplicateScriptsFromSource,
  checkPackageDuplicateScriptsFromFile,
} from '../check-package-duplicate-scripts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, '..', 'check-package-duplicate-scripts.mjs');
const REPO_PACKAGE_JSON = resolve(__dirname, '..', '..', 'package.json');

function runScript(cwd: string) {
  return spawnSync('node', ['scripts/check-package-duplicate-scripts.mjs'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

describe('scripts/check-package-duplicate-scripts.mjs', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'check-package-duplicate-scripts-'));
    mkdirSync(join(tmpDir, 'scripts'), { recursive: true });
    cpSync(SCRIPT_PATH, join(tmpDir, 'scripts', 'check-package-duplicate-scripts.mjs'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('analisa o package.json atual sem crashar e sem falsos duplicados', () => {
    const result = checkPackageDuplicateScriptsFromFile(REPO_PACKAGE_JSON);

    expect(result.code).toBe(0);
    expect(result.hasScriptsObject).toBe(true);
    expect(result.duplicates).toEqual([]);
  });

  it('detecta duplicata em scripts com aspas escapadas no valor em vez de estourar o parser', () => {
    const result = checkPackageDuplicateScriptsFromSource(`{
  "name": "sandbox",
  "scripts": {
    "dup": "node -e \\"console.log('primeiro')\\"",
    "ok": "echo ok",
    "dup": "node -e \\"console.log('segundo')\\""
  }
}
`);

    expect(result.code).toBe(1);
    expect(result.hasScriptsObject).toBe(true);
    expect(result.duplicates).toEqual([
      { key: 'dup', firstLine: 4, duplicateLine: 6 },
    ]);
  });

  it('continua analisando todas as chaves após valores string com dois-pontos e chaves', () => {
    const result = checkPackageDuplicateScriptsFromSource(`{
  "name": "sandbox",
  "scripts": {
    "alpha": "echo {\\"kind\\":\\"ok\\",\\"label\\":\\"x:y\\"}",
    "beta": "echo beta",
    "gamma": "echo gamma"
  }
}
`);

    expect(result.code).toBe(0);
    expect(result.hasScriptsObject).toBe(true);
    expect(result.duplicates).toEqual([]);
  });

  it('confere que o pacote real ainda expõe 232 scripts distintos via JSON parse', () => {
    const pkg = JSON.parse(readFileSync(REPO_PACKAGE_JSON, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(Object.keys(pkg.scripts)).toHaveLength(232);
  });

  it('mantém o CLI funcional no sandbox com package.json válido', () => {
    cpSync(REPO_PACKAGE_JSON, join(tmpDir, 'package.json'));

    const result = runScript(tmpDir);

    expect(result.status).toBe(0);
  });
});
