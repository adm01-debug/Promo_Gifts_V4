// Testes para scripts/check-visual-tests-specs.mjs
//
// Cobre dois bugs reais encontrados em auditoria adversarial do script:
//
// 1) Falso-positivo do gate: a extração de specs com `yaml.matchAll(...)`
//    escaneava o arquivo .yml inteiro, sem distinguir comando real de
//    comentário. Um comentário mencionando um spec removido/renomeado
//    (ex.: `# removido: e2e/ui/old.spec.ts`) nunca é passado ao Playwright,
//    mas derrubava o gate como se fosse um arg real ausente no disco.
//    Corrigido removendo as linhas 100% comentário (`trim().startsWith('#')`)
//    antes do regex de extração.
//
// 2) Crash não tratado: o `.filter` que calcula `missingBaselines` chama
//    `readFileSync` (no spec) e `readdirSync` (no diretório `-snapshots/`)
//    sem try/catch. Um diretório de baseline sem permissão de leitura
//    (EACCES) derrubava o processo com stack trace cru do Node em vez do
//    relatório controlado do próprio script. Corrigido com try/catch,
//    tratando qualquer falha de leitura como "baseline ausente" (fail-safe,
//    mesma política já adotada por scripts/check-timer-cleanup.mjs para
//    `walkFiles`).
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, '../../scripts/check-visual-tests-specs.mjs');
const WORKFLOW_PATH = '.github/workflows/visual-tests.yml';

function writeWorkflow(root, runLine) {
  const abs = join(root, WORKFLOW_PATH);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `jobs:\n  x:\n    steps:\n      - run: ${runLine}\n`,
  );
}

function writeSpec(root, relPath, content = "import { test } from '@playwright/test';\ntest('x', async () => {});\n") {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });
}

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
const SETPRIV = '/usr/bin/setpriv';
let setprivAvailable = false;
if (isRoot) {
  try {
    execFileSync(SETPRIV, ['--version'], { stdio: 'ignore' });
    setprivAvailable = true;
  } catch {
    setprivAvailable = false;
  }
}
// EACCES só é reproduzível de verdade quando o processo filho roda sem
// privilégio de root (root ignora bits de permissão DAC). Em CI containers
// que rodam como root, cai o processo filho para um uid sem privilégio via
// `setpriv`; fora disso (uid não-root local), chmod 000 já basta.
const eaccesReproducible = !isRoot || setprivAvailable;

function runScriptUnprivileged(cwd) {
  if (!isRoot) return runScript(cwd);
  return spawnSync(
    SETPRIV,
    ['--reuid=65534', '--regid=65534', '--clear-groups', process.execPath, SCRIPT],
    { cwd, encoding: 'utf8' },
  );
}

let tmpDir;

afterEach(() => {
  if (tmpDir) {
    try {
      chmodSync(join(tmpDir, 'e2e/ui/x.spec.ts-snapshots'), 0o755);
    } catch {
      // diretório pode não existir neste teste — ignora
    }
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe('check-visual-tests-specs gate', () => {
  it('passa quando o spec existe e não usa assertão visual', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-happy-'));
    writeWorkflow(tmpDir, 'npx playwright test e2e/ui/x.spec.ts');
    writeSpec(tmpDir, 'e2e/ui/x.spec.ts');

    const result = runScript(tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅');
  });

  it('falha quando o spec referenciado não existe no disco', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-missing-spec-'));
    writeWorkflow(tmpDir, 'npx playwright test e2e/ui/ghost.spec.ts');

    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('e2e/ui/ghost.spec.ts');
    expect(result.stderr).toContain('não existem no disco');
  });

  it('falha quando nenhum spec é encontrado no YAML', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-zero-specs-'));
    writeWorkflow(tmpDir, 'echo "sem specs aqui"');

    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Nenhum spec encontrado');
  });

  it('falha quando spec visual não tem baseline versionado (diretório ausente)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-no-baseline-'));
    writeWorkflow(tmpDir, 'npx playwright test e2e/ui/x.spec.ts');
    writeSpec(
      tmpDir,
      'e2e/ui/x.spec.ts',
      "import { test, expect } from '@playwright/test';\ntest('x', async ({ page }) => { await expect(page).toHaveScreenshot(); });\n",
    );

    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('sem baseline versionado');
  });

  it('passa quando spec visual tem baseline versionado com PNG real', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-with-baseline-'));
    writeWorkflow(tmpDir, 'npx playwright test e2e/ui/x.spec.ts');
    writeSpec(
      tmpDir,
      'e2e/ui/x.spec.ts',
      "import { test, expect } from '@playwright/test';\ntest('x', async ({ page }) => { await expect(page).toHaveScreenshot(); });\n",
    );
    writeSpec(tmpDir, 'e2e/ui/x.spec.ts-snapshots/chromium-public-linux.png', 'fake-png');

    const result = runScript(tmpDir);
    expect(result.status).toBe(0);
  });

  // --- Bug 1: falso-positivo por spec citado apenas em comentário ---

  it('BUG: não falha mais quando um spec só aparece em comentário do YAML (sem a correção, derrubava o gate)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-comment-false-positive-'));
    mkdirSync(join(tmpDir, dirname(WORKFLOW_PATH)), { recursive: true });
    writeFileSync(
      join(tmpDir, WORKFLOW_PATH),
      [
        'jobs:',
        '  x:',
        '    steps:',
        '      # specs antigos removidos: e2e/ui/removido.spec.ts',
        '      - run: npx playwright test e2e/ui/x.spec.ts',
        '',
      ].join('\n'),
    );
    writeSpec(tmpDir, 'e2e/ui/x.spec.ts');
    // Nota: e2e/ui/removido.spec.ts propositalmente NÃO existe no disco —
    // é só texto de comentário, nunca foi passado ao Playwright.

    const result = runScript(tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅');
    expect(result.stdout).not.toContain('removido.spec.ts');
  });

  it('ainda detecta spec real ausente quando há comentário com outro spec.ts no mesmo YAML', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vts-comment-plus-real-missing-'));
    mkdirSync(join(tmpDir, dirname(WORKFLOW_PATH)), { recursive: true });
    writeFileSync(
      join(tmpDir, WORKFLOW_PATH),
      [
        'jobs:',
        '  x:',
        '    steps:',
        '      # nota: e2e/ui/so-comentario.spec.ts',
        '      - run: npx playwright test e2e/ui/ghost-real.spec.ts',
        '',
      ].join('\n'),
    );
    // Nenhum dos dois specs existe no disco; o real (fora do comentário)
    // deve ser reportado, o do comentário nunca deveria aparecer.

    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('e2e/ui/ghost-real.spec.ts');
    expect(result.stderr).not.toContain('so-comentario.spec.ts');
  });

  // --- Bug 2: crash não tratado em EACCES ao checar baseline ---

  it.skipIf(!eaccesReproducible)(
    'BUG: reporta baseline ausente (sem crash) quando o diretório de snapshots não pode ser lido (EACCES)',
    () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'vts-eacces-'));
      chmodSync(tmpDir, 0o755);
      writeWorkflow(tmpDir, 'npx playwright test e2e/ui/x.spec.ts');
      writeSpec(
        tmpDir,
        'e2e/ui/x.spec.ts',
        "import { test, expect } from '@playwright/test';\ntest('x', async ({ page }) => { await expect(page).toHaveScreenshot(); });\n",
      );
      const snapDir = join(tmpDir, 'e2e/ui/x.spec.ts-snapshots');
      writeSpec(tmpDir, 'e2e/ui/x.spec.ts-snapshots/placeholder.png', 'fake-png');
      // Precisa ser atravessável por "outros" para o processo sem
      // privilégio conseguir chegar até o diretório sem permissão.
      chmodSync(tmpDir, 0o755);
      chmodSync(join(tmpDir, 'e2e'), 0o755);
      chmodSync(join(tmpDir, 'e2e/ui'), 0o755);
      chmodSync(snapDir, 0o000);

      const result = runScriptUnprivileged(tmpDir);

      // Antes da correção: result.status === null (crash) e stderr com
      // stack trace cru do Node ("at readdirSync (node:fs...") em vez da
      // mensagem controlada do gate.
      expect(result.status).toBe(1);
      expect(result.stderr).not.toContain('at readdirSync');
      expect(result.stderr).not.toContain('at readFileSync');
      expect(result.stderr).toContain('sem baseline versionado');
    },
  );
});
