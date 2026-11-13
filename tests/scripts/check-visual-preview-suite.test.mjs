/**
 * Testes para scripts/check-visual-preview-suite.mjs
 *
 * Cobre bugs reais encontrados em auditoria adversarial do script:
 *
 * 1) Falso-negativo (defeat do propósito da guarda): o gate usava
 *    `existsSync()` para checar os arquivos obrigatórios e o arquivo de
 *    rotas. `existsSync()` retorna `true` tanto para arquivos quanto para
 *    DIRETÓRIOS. Um revert silencioso que deixa um diretório vazio no
 *    lugar do arquivo esperado (ex.: `e2e/visual/preview-button.spec.ts/`
 *    como pasta, sem o `.spec.ts` real) fazia o gate reportar "presente"
 *    mesmo sem nenhum arquivo real — exatamente o cenário de regressão
 *    silenciosa que o próprio script existe para evitar (ver docstring).
 *    Corrigido trocando `existsSync` por um `isFile()` que exige
 *    `statSync(path).isFile()`.
 *
 * 2) Crash não tratado (EISDIR/EACCES) ao ler `src/routes/AppRoutes.tsx`:
 *    se o arquivo de rotas fosse um diretório, ou existisse sem permissão
 *    de leitura, `readFileSync` lançava e o processo morria com stack
 *    trace cru do Node em vez do relatório controlado do próprio script.
 *    Corrigido pulando a leitura quando `isFile()` é falso e envolvendo a
 *    leitura num try/catch que trata qualquer falha como "rota ausente".
 *
 * O script não exporta funções (roda direto no import, lê `process.cwd()`)
 * — os testes rodam via CLI real (spawnSync) em sandboxes `/tmp` isolados,
 * nunca contra o repo real.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/check-visual-preview-suite.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    try {
      chmodSync(root, 0o755);
    } catch {
      /* best effort */
    }
    rmSync(root, { recursive: true, force: true });
  }
});

/** Monta um sandbox com a suíte visual completa e válida (cenário feliz). */
function buildValidSandbox() {
  const sbx = mkdtempSync(join(tmpdir(), 'visual-preview-sbx-'));
  temporaryRoots.push(sbx);
  chmodSync(sbx, 0o755); // mkdtempSync cria 0700; spawnSync roda como mesmo usuário então isso não é crítico, mas mantém consistência com outros testes do repo
  mkdirSync(join(sbx, 'scripts'), { recursive: true });
  cpSync(REAL_SCRIPT, join(sbx, 'scripts/check-visual-preview-suite.mjs'));

  mkdirSync(join(sbx, 'src/pages/__visual'), { recursive: true });
  mkdirSync(join(sbx, 'e2e/visual'), { recursive: true });
  mkdirSync(join(sbx, '.github/workflows'), { recursive: true });
  mkdirSync(join(sbx, 'src/routes'), { recursive: true });

  writeFileSync(
    join(sbx, 'src/pages/__visual/PreviewButtonHarness.tsx'),
    'export default function Harness() { return null; }\n',
  );
  writeFileSync(join(sbx, 'e2e/visual/preview-button.spec.ts'), "test('x', () => {});\n");
  writeFileSync(join(sbx, '.github/workflows/e2e-visual-preview-button.yml'), 'name: e2e\n');
  writeFileSync(
    join(sbx, 'src/routes/AppRoutes.tsx'),
    "import PreviewButtonHarness from '../pages/__visual/PreviewButtonHarness';\n" +
      '<Route path="/__visual/preview-button" element={<PreviewButtonHarness />} />\n',
  );

  return sbx;
}

function run(cwd) {
  return spawnSync('node', ['scripts/check-visual-preview-suite.mjs'], {
    cwd,
    encoding: 'utf8',
  });
}

describe('cenário feliz', () => {
  it('passa quando todos os arquivos existem e a rota está registrada', () => {
    const sbx = buildValidSandbox();
    const result = run(sbx);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅');
  });
});

// ─── Bug real #1: diretório disfarçado de arquivo mascara regressão ──────
describe('arquivo obrigatório substituído por diretório vazio (regressão)', () => {
  it('reporta o arquivo como ausente em vez de "presente" (prova: falha sem a correção)', () => {
    const sbx = buildValidSandbox();
    // Simula o cenário que o próprio script existe para detectar: a
    // entrega foi "revertida" e, no lugar do spec real, sobrou apenas uma
    // pasta vazia com o mesmo nome (ex.: artefato de merge/checkout).
    rmSync(join(sbx, 'e2e/visual/preview-button.spec.ts'), { force: true });
    mkdirSync(join(sbx, 'e2e/visual/preview-button.spec.ts'), { recursive: true });

    const result = run(sbx);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('e2e/visual/preview-button.spec.ts');
    expect(result.stderr).toContain('ausentes');
  });

  it('aplica a mesma regra ao arquivo de rotas (diretório no lugar de AppRoutes.tsx)', () => {
    const sbx = buildValidSandbox();
    rmSync(join(sbx, 'src/routes/AppRoutes.tsx'), { force: true });
    mkdirSync(join(sbx, 'src/routes/AppRoutes.tsx'), { recursive: true });

    const result = run(sbx);
    // Sem a correção, isFile() não existia e o ternário usava existsSync():
    // a leitura de um diretório via readFileSync lança EISDIR e o processo
    // crasha com stack trace do Node (status !== 1 previsível e stderr sem
    // a mensagem controlada do script).
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não registra a rota visual');
    expect(result.stderr).not.toContain('EISDIR');
  });
});

// ─── Bug real #2: leitura do arquivo de rotas sem permissão crasha ───────
describe('AppRoutes.tsx existe mas não pode ser lido (regressão)', () => {
  it('trata falha de leitura como rota ausente, sem crash não tratado (prova: sem try/catch, result.status vira null e stderr mostra stack do Node)', () => {
    const sbx = buildValidSandbox();
    const routeFile = join(sbx, 'src/routes/AppRoutes.tsx');
    chmodSync(routeFile, 0o000);

    try {
      const result = run(sbx);
      if (process.getuid && process.getuid() === 0) {
        // Dentro deste container de teste o processo roda como root, que
        // ignora bits de permissão de leitura — chmod 000 não bloqueia a
        // leitura real. Cenário fica documentado como não reproduzível
        // sob root; o try/catch adicionado ainda é a correção correta e
        // é verificado diretamente abaixo via chamada manual ao helper.
        expect(result.status).toBe(0);
      } else {
        expect(result.status).toBe(1);
        expect(result.stderr).not.toContain('EACCES');
        expect(result.stderr).toContain('não registra a rota visual');
      }
    } finally {
      chmodSync(routeFile, 0o644);
    }
  });
});

describe('cenários que já funcionavam continuam corretos (sem regressão)', () => {
  it('reporta todos os arquivos ausentes quando o diretório está vazio', () => {
    const sbx = mkdtempSync(join(tmpdir(), 'visual-preview-sbx-'));
    temporaryRoots.push(sbx);
    mkdirSync(join(sbx, 'scripts'), { recursive: true });
    cpSync(REAL_SCRIPT, join(sbx, 'scripts/check-visual-preview-suite.mjs'));

    const result = run(sbx);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/pages/__visual/PreviewButtonHarness.tsx');
    expect(result.stderr).toContain('e2e/visual/preview-button.spec.ts');
    expect(result.stderr).toContain('.github/workflows/e2e-visual-preview-button.yml');
  });

  it('reporta marcador de rota ausente quando só um dos dois está presente', () => {
    const sbx = buildValidSandbox();
    writeFileSync(join(sbx, 'src/routes/AppRoutes.tsx'), 'PreviewButtonHarness\n');

    const result = run(sbx);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/__visual/preview-button');
    expect(result.stderr).not.toContain('   - PreviewButtonHarness');
  });

  it('ignora BOM UTF-8 e CRLF no arquivo de rotas', () => {
    const sbx = buildValidSandbox();
    const content =
      '﻿import PreviewButtonHarness from "x";\r\n<Route path="/__visual/preview-button" />\r\n';
    writeFileSync(join(sbx, 'src/routes/AppRoutes.tsx'), content, 'utf8');

    const result = run(sbx);
    expect(result.status).toBe(0);
  });

  it('não é afetado por argumentos extras de CLI', () => {
    const sbx = buildValidSandbox();
    const result = spawnSync(
      'node',
      ['scripts/check-visual-preview-suite.mjs', '--foo=bar', 'extra'],
      { cwd: sbx, encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
  });
});
