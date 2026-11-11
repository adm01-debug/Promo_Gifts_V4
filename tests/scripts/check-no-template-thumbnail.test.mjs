// Testa scripts/check-no-template-thumbnail.mjs, o gate que bane a
// reintrodução do componente `TemplateThumbnail` (arquivo banido ou import
// por caminho).
//
// O script não exporta funções puras (tudo roda no nível do módulo ao ser
// importado), então o padrão aqui é integração CLI real via spawnSync, com
// cwd apontando para uma fixture temporária que simula a raiz do repo
// (`<tmp>/src/...`) — mesmo padrão de
// tests/scripts/check-no-inline-cors.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-no-template-thumbnail.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'no-template-thumbnail-gate-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeSrcFile(root, relPath, content) {
  const abs = join(root, 'src', ...relPath.split('/'));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

function runGate(root) {
  return spawnSync('node', [SCRIPT], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

// ─── repositório real ───────────────────────────────────────────────────────

describe('check-no-template-thumbnail — repositório real', () => {
  it('passa (exit 0) contra src/ real do repo', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/nenhuma regressão detectada/);
  });
});

// ─── cenários básicos ───────────────────────────────────────────────────────

describe('check-no-template-thumbnail — cenários básicos', () => {
  it('passa quando src/ está vazio', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'src'), { recursive: true });
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('falha quando TemplateThumbnail.tsx é reintroduzido', () => {
    const root = tempRepo();
    writeSrcFile(
      root,
      'pages/magazine/components/TemplateThumbnail.tsx',
      'export const TemplateThumbnail = () => null;',
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/arquivo banido reintroduzido/);
  });

  it('falha quando um arquivo importa TemplateThumbnail por caminho', () => {
    const root = tempRepo();
    writeSrcFile(
      root,
      'pages/magazine/components/EditorHero.tsx',
      "import { TemplateThumbnail } from './TemplateThumbnail';",
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/import proibido de TemplateThumbnail em:/);
  });

  it('não falha para o arquivo de teste na allowlist mesmo citando o import banido', () => {
    const root = tempRepo();
    writeSrcFile(
      root,
      'pages/magazine/components/__tests__/no-template-thumbnail.test.ts',
      "// regressão: from './TemplateThumbnail'",
    );
    const r = runGate(root);
    expect(r.status).toBe(0);
  });
});

// ─── encoding / conteúdo do arquivo ─────────────────────────────────────────

describe('check-no-template-thumbnail — encoding e conteúdo do arquivo', () => {
  it('detecta a violação mesmo com BOM UTF-8 no início do arquivo', () => {
    const root = tempRepo();
    const abs = join(root, 'src', 'pages', 'magazine', 'components', 'A.tsx');
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('import { X } from "./TemplateThumbnail";\n', 'utf8'),
    ]));
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/import proibido/);
  });

  it('detecta a violação com quebras de linha CRLF', () => {
    const root = tempRepo();
    writeSrcFile(
      root,
      'pages/magazine/components/A.tsx',
      'const x = 1;\r\nimport { X } from "./TemplateThumbnail";\r\n',
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/import proibido/);
  });
});

// ─── regressão: exceções não tratadas viravam stack trace ilegível ─────────
//
// Antes do fix, main() rodava direto no nível do módulo: se `src/` não
// existisse (ENOENT em readdirSync dentro de walk()), ou se houvesse um
// symlink quebrado/circular dentro de src/ (ENOENT/ELOOP em statSync), o
// processo morria com o stack trace crú do Node em vez de uma mensagem
// compreensível. Rodado de fato (spawnSync real) antes e depois do fix em
// try/catch ao redor de main().
describe('check-no-template-thumbnail — regressão: erro legível em vez de stack trace', () => {
  it('falha com mensagem legível quando src/ não existe (ENOENT)', () => {
    const root = tempRepo();
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar check:no-template-thumbnail: ENOENT/);
    // Sem o fix, o stderr cru do Node inclui o frame da função interna —
    // garante que não voltamos a expor isso ao operador do gate.
    expect(r.stderr).not.toMatch(/at walk/);
  });

  it('falha com mensagem legível quando há um symlink quebrado dentro de src/', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'src', 'pages', 'magazine', 'components'), { recursive: true });
    symlinkSync(
      '/nonexistent/target.ts',
      join(root, 'src', 'pages', 'magazine', 'components', 'Broken.ts'),
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar check:no-template-thumbnail: ENOENT/);
    expect(r.stderr).not.toMatch(/at walk/);
  });

  it('falha com mensagem legível quando há um symlink circular dentro de src/ (ELOOP)', () => {
    const root = tempRepo();
    const dirA = join(root, 'src', 'pages', 'magazine', 'components', 'dirA');
    mkdirSync(dirA, { recursive: true });
    symlinkSync(dirA, join(dirA, 'loop'));
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar check:no-template-thumbnail: ELOOP/);
    expect(r.stderr).not.toMatch(/at walk/);
  });
});
