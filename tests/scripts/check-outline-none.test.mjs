// Testa scripts/check-outline-none.mjs, o gate a11y (WCAG 2.4.7) que exige
// um ring substituto no MESMO literal className que declara `outline-none`.
//
// O script não exporta funções puras (tudo roda ao ser importado), então o
// padrão aqui é integração CLI real via spawnSync, com cwd apontando para
// uma fixture temporária que simula a raiz do repo (`<tmp>/src/...`) —
// mesmo padrão de tests/scripts/check-no-template-thumbnail.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-outline-none.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'outline-none-gate-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeSrcFile(root, relPath, content) {
  const abs = join(root, 'src', ...relPath.split('/'));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

function runGate(root, env = {}) {
  return spawnSync('node', [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, ...env },
  });
}

// ─── repositório real ───────────────────────────────────────────────────────

describe('check-outline-none — repositório real', () => {
  it('passa (exit 0) contra src/ real do repo (baseline cobre os legados)', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/0 regressões/);
  });
});

// ─── cenários básicos ───────────────────────────────────────────────────────

describe('check-outline-none — cenários básicos', () => {
  it('passa quando src/ está vazio', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'src'), { recursive: true });
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('falha quando outline-none aparece sem nenhum ring no mesmo literal', () => {
    const root = tempRepo();
    writeSrcFile(root, 'A.tsx', 'const c = "outline-none";\n');
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/outline-none a11y gate falhou/);
  });

  it('passa com ring-* bare no mesmo literal', () => {
    const root = tempRepo();
    writeSrcFile(root, 'A.tsx', 'const c = "outline-none ring-2";\n');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('passa com focus-visible:ring-* no mesmo literal', () => {
    const root = tempRepo();
    writeSrcFile(root, 'A.tsx', 'const c = "outline-none focus-visible:ring-2";\n');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('falha quando só há ring-offset-* isolado (offset sem ring não pinta)', () => {
    const root = tempRepo();
    writeSrcFile(root, 'A.tsx', 'const c = "outline-none focus:ring-offset-2";\n');
    const r = runGate(root);
    expect(r.status).toBe(1);
  });

  it('UPDATE_BASELINE=1 grava o baseline e a execução seguinte passa com 0 regressões', () => {
    const root = tempRepo();
    writeSrcFile(root, 'A.tsx', 'const c = "outline-none";\n');
    const update = runGate(root, { UPDATE_BASELINE: '1' });
    expect(update.status).toBe(0);
    expect(update.stdout).toMatch(/Baseline atualizado/);
    const after = runGate(root);
    expect(after.status).toBe(0);
    expect(after.stdout).toMatch(/0 regressões/);
  });

  it('baseline corrompido (JSON inválido) falha com mensagem legível, não stack trace', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, '.outline-none-baseline.json'), '{ invalid json');
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Falha ao ler \.outline-none-baseline\.json/);
  });
});

// ─── encoding / conteúdo do arquivo ─────────────────────────────────────────

describe('check-outline-none — encoding e conteúdo do arquivo', () => {
  it('detecta a violação mesmo com BOM UTF-8 no início do arquivo', () => {
    const root = tempRepo();
    const abs = join(root, 'src', 'A.tsx');
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('const c = "outline-none";\n', 'utf8'),
    ]));
    const r = runGate(root);
    expect(r.status).toBe(1);
  });

  it('detecta a violação com quebras de linha CRLF', () => {
    const root = tempRepo();
    writeSrcFile(root, 'A.tsx', 'const c = "outline-none";\r\nconst d = 1;\r\n');
    const r = runGate(root);
    expect(r.status).toBe(1);
  });
});

// ─── regressão: ENOENT em src/ ausente virava stack trace cru ──────────────
//
// Antes do fix, main() rodava direto no nível do módulo: se `src/` não
// existisse (ENOENT em readdirSync dentro de walk()), o processo morria com
// o stack trace cru do Node em vez de uma mensagem compreensível. Rodado de
// fato (spawnSync real) antes e depois do fix, mesmo padrão já aplicado em
// check-no-template-thumbnail.mjs e check-no-inline-cors.mjs nesta sessão.
describe('check-outline-none — regressão: erro legível em vez de stack trace', () => {
  it('falha com mensagem legível quando src/ não existe (ENOENT)', () => {
    const root = tempRepo();
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar check:outline-none: ENOENT/);
    // Sem o fix, o stderr cru do Node inclui o frame da função interna —
    // garante que não voltamos a expor isso ao operador do gate.
    expect(r.stderr).not.toMatch(/at walk/);
  });

  it('falha com mensagem legível quando há um symlink quebrado dentro de src/ no nível raiz do walk', () => {
    // walk() já trata ENOENT/ELOOP de entradas individuais (statSync em
    // try/catch), então este caso continua passando — cobre a garantia de
    // que o fix não regrediu esse tratamento já existente.
    const root = tempRepo();
    mkdirSync(join(root, 'src'), { recursive: true });
    symlinkSync('/nonexistent/target.tsx', join(root, 'src', 'Broken.tsx'));
    const r = runGate(root);
    expect(r.status).toBe(0);
  });
});
