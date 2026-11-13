// Testa scripts/check-overflow-x-clip.mjs, o gate que rejeita
// `overflow-x-hidden` no MainLayout e `overflow-x: hidden` em html/body nos
// CSS globais (quebra `position: sticky` da sidebar).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-overflow-x-clip.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'overflow-x-clip-gate-'));
  temporaryRoots.push(dir);
  // fixture mínima: MainLayout.tsx sem violação (o gate lê este arquivo sempre).
  mkdirSync(join(dir, 'src/components/layout'), { recursive: true });
  writeFileSync(
    join(dir, 'src/components/layout/MainLayout.tsx'),
    'export function MainLayout() { return <div className="flex" />; }\n',
  );
  return dir;
}

function writeCss(root, relPath, content) {
  const full = join(root, 'src', relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function runGate(root) {
  return spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

describe('check-overflow-x-clip — repositório real', () => {
  it('passa (exit 0) contra o repo real (MainLayout e CSS atuais sem violação)', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Overflow-x gate OK/);
  });
});

describe('check-overflow-x-clip — cenários básicos', () => {
  it('passa quando não há overflow-x-hidden em nenhum lugar', () => {
    const root = tempRepo();
    writeCss(root, 'styles/global.css', 'html { overflow-x: clip; }\nbody { overflow-x: visible; }\n');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('falha quando MainLayout.tsx usa overflow-x-hidden', () => {
    const root = tempRepo();
    writeFileSync(
      join(root, 'src/components/layout/MainLayout.tsx'),
      'export function MainLayout() { return <div className="overflow-x-hidden flex" />; }\n',
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/MainLayout\.tsx: usa "overflow-x-hidden"/);
  });

  it('falha quando um único arquivo CSS tem body com overflow-x: hidden', () => {
    const root = tempRepo();
    writeCss(root, 'styles/a.css', 'body{overflow-x:hidden}');
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/styles\/a\.css: html\/body com "overflow-x: hidden"/);
  });

  it('detecta a violação de forma case-insensitive e com espaçamento variado', () => {
    const root = tempRepo();
    writeCss(root, 'styles/weird.css', 'HTML   {\n  color: red;\n  Overflow-X:    HIDDEN  ;\n}\n');
    const r = runGate(root);
    expect(r.status).toBe(1);
  });
});

describe('check-overflow-x-clip — bug real: regex global reutilizado entre arquivos (falso-negativo)', () => {
  // scripts/check-overflow-x-clip.mjs declarava o regex de detecção com a
  // flag `g` e reutilizava o MESMO objeto RegExp em `.test()` dentro do loop
  // `for (const file of cssTargets)`. Com `g`, `.test()` é stateful: após um
  // match bem-sucedido no primeiro arquivo, `lastIndex` fica > 0 e a busca no
  // PRÓXIMO arquivo começa a partir desse offset — pulando uma violação real
  // que exista antes dele. Resultado: o gate ainda falha (porque o primeiro
  // arquivo foi pego), mas omite silenciosamente violações de arquivos
  // seguintes da lista reportada — falso-negativo por arquivo.
  //
  // Reprodução mínima fora do script (confirmado antes do fix):
  //   const rx = /(html|body)[^{]*\{[^}]*overflow-x\s*:\s*hidden/gis;
  //   rx.test('html{overflow-x:hidden}');                          // true,  lastIndex=22
  //   rx.test('body{overflow-x:hidden} .other{color:red}');        // false (!) — deveria ser true
  it('reporta a violação de TODOS os arquivos CSS, não só do primeiro que casa', () => {
    const root = tempRepo();
    // first.css: match curto, desloca lastIndex do regex global (se reutilizado).
    writeCss(root, 'a/first.css', 'html{overflow-x:hidden}\n');
    // second.css: também viola, mas com conteúdo adicional depois do match —
    // é exatamente o padrão que o regex stateful pulava.
    writeCss(root, 'b/second.css', 'body{overflow-x:hidden} .unrelated-rule-padding{color:red}\n');

    const r = runGate(root);

    expect(r.status).toBe(1);
    // Antes do fix, apenas first.css aparecia aqui — second.css era omitido.
    expect(r.stderr).toMatch(/a\/first\.css: html\/body com "overflow-x: hidden"/);
    expect(r.stderr).toMatch(/b\/second\.css: html\/body com "overflow-x: hidden"/);
  });
});
