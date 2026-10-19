/**
 * Testes de mutação para check-file-size-baseline.mjs (E01)
 *
 * Verifica:
 * 1. Arquivo de código fora de GENERATED_FILES com >500 linhas → DEVE falhar (regressão)
 * 2. src/integrations/supabase/types.ts com >500 linhas → NÃO deve ser contado
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '../../scripts/check-file-size-baseline.mjs');

/** Cria um arquivo com `n` linhas de conteúdo dummy */
function writeLines(filePath, n) {
  const content = Array.from({ length: n }, (_, i) => `const line${i} = ${i};`).join('\n') + '\n';
  writeFileSync(filePath, content);
}

/** Executa o script num diretório raiz temporário e retorna { code, stdout, stderr } */
function runScript(rootDir, args = []) {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, ...args],
    {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
    },
  );
  return { code: result.status ?? -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** Monta baseline JSON mínimo para que o script entre no modo de verificação */
function writeBaseline(rootDir, files = {}) {
  const baseline = {
    generatedAt: new Date().toISOString(),
    description: 'test baseline',
    maxLines: 500,
    files,
  };
  writeFileSync(join(rootDir, '.file-size-baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
}

test('arquivo de código fora de GENERATED_FILES com 600 linhas → falha (regressão)', () => {
  const root = mkdtempSync('/tmp/fstest-');
  try {
    const srcDir = join(root, 'src', 'components');
    mkdirSync(srcDir, { recursive: true });

    // Arquivo de código legítimo com 600 linhas (acima do limite de 500)
    writeLines(join(srcDir, 'BigComponent.tsx'), 600);

    // Baseline vazio → script detecta como "arquivo novo acima do limite"
    writeBaseline(root, {});

    const { code, stderr } = runScript(root);
    assert.strictEqual(code, 1, `esperava exit 1 (regressão), obteve ${code}. stderr: ${stderr}`);
    assert.ok(
      stderr.includes('BigComponent.tsx') || stderr.includes('arquivo novo acima do limite'),
      `esperava mensagem de regressão para BigComponent.tsx. stderr: ${stderr}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('src/integrations/supabase/types.ts com 1500 linhas → NÃO é contado (gerado)', () => {
  const root = mkdtempSync('/tmp/fstest-');
  try {
    const supabaseDir = join(root, 'src', 'integrations', 'supabase');
    mkdirSync(supabaseDir, { recursive: true });

    // types.ts com 1500 linhas (3× acima do limite)
    writeLines(join(supabaseDir, 'types.ts'), 1500);

    // Baseline vazio — se types.ts fosse contado, o gate falharia
    writeBaseline(root, {});

    const { code, stdout } = runScript(root);
    assert.strictEqual(
      code,
      0,
      `types.ts não deveria ser contado; esperava exit 0, obteve ${code}. stdout: ${stdout}`,
    );
    assert.ok(
      stdout.includes('Nenhuma regressão') || stdout.includes('✅'),
      `esperava mensagem de sucesso. stdout: ${stdout}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('arquivo na baseline que encolheu → exit 0 (drift positivo, não regressão)', () => {
  const root = mkdtempSync('/tmp/fstest-');
  try {
    const srcDir = join(root, 'src', 'components');
    mkdirSync(srcDir, { recursive: true });

    // Arquivo com 520 linhas (acima de 500)
    writeLines(join(srcDir, 'ShrunkComponent.tsx'), 520);

    // Baseline com 800 linhas (arquivo encolheu)
    writeBaseline(root, { 'src/components/ShrunkComponent.tsx': 800 });

    const { code, stdout } = runScript(root);
    assert.strictEqual(code, 0, `drift positivo não deve falhar; obteve exit ${code}. stdout: ${stdout}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
