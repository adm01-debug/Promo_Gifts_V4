/**
 * Testes de regressão para check-as-assertions-baseline.mjs.
 *
 * Bug real encontrado em auditoria adversarial (evidência: ConnectionErrorDetailsDialog.tsx
 * contava 8 "asserções" com 0 casts reais; 79+125 arquivos reais do repo usam
 * `import * as X from` / `import { Y as Z } from`):
 *   1. String literal de produção contendo "as <palavra>" (ex.: prosa pt-BR como
 *      "Verifique as credenciais") era contada como `as <Tipo>` — falso positivo.
 *   2. `import * as React from 'react'` e `import { History as HistoryIcon } from '...'`
 *      (rename de módulo, não type assertion) também eram contados — falso positivo.
 * Sem a correção (stripar conteúdo de strings e cláusulas import/export...from antes
 * do regex AS_RE), os testes 1 e 2 abaixo falham porque o script reporta regressão
 * para um arquivo que não tem nenhuma asserção de tipo real.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '../../scripts/check-as-assertions-baseline.mjs');

function runScript(rootDir, args = []) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  return { code: result.status ?? -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** Monta um root temporário com src/<file> = content e a baseline fornecida. */
function fixture(content, counts = {}) {
  const root = mkdtempSync('/tmp/as-assert-gate-');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'Target.tsx'), content);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  writeFileSync(
    join(root, '.as-assertions-baseline.json'),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), description: 'test baseline', productionAsCount: total, counts },
      null,
      2,
    ) + '\n',
  );
  return root;
}

test('string literal com prosa pt-BR ("Verifique as credenciais...") NÃO é contada como assertion', () => {
  const root = fixture(
    "export const msg = 'Verifique as credenciais e as permissões de todas as integrações';\n",
  );
  try {
    const { code, stdout, stderr } = runScript(root);
    assert.strictEqual(
      code,
      0,
      `string literal não deveria gerar regressão; obteve exit ${code}. stdout: ${stdout} stderr: ${stderr}`,
    );
    assert.ok(!stderr.includes('Target.tsx'), `Target.tsx não deveria aparecer na regressão. stderr: ${stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('erro de produção com "as <palavra>" dentro de string NÃO é contado', () => {
  const root = fixture(
    "function validate(v) {\n  if (!v) throw new Error('Invalid value as number provided by user');\n  return v;\n}\n",
  );
  try {
    const { code, stderr } = runScript(root);
    assert.strictEqual(code, 0, `falso positivo de string; esperava exit 0, obteve ${code}. stderr: ${stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('alias de import/export ("import * as X", "import { Y as Z }") NÃO é contado como assertion', () => {
  const root = fixture(
    [
      "import * as React from 'react';",
      "import { History as HistoryIcon, ChevronDown } from 'lucide-react';",
      "export { Foo as Bar } from './foo';",
      'export const x = 1;',
      '',
    ].join('\n'),
  );
  try {
    const { code, stderr } = runScript(root);
    assert.strictEqual(
      code,
      0,
      `alias de import/export não é type assertion; esperava exit 0, obteve ${code}. stderr: ${stderr}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cast real ("foo as Bar") continua sendo contado e detectado como regressão', () => {
  const root = fixture('const x = foo as Bar;\n');
  try {
    const { code, stderr } = runScript(root);
    assert.strictEqual(code, 1, `cast real deveria disparar regressão (baseline 0); obteve exit ${code}`);
    assert.ok(stderr.includes('Target.tsx'), `esperava Target.tsx na regressão. stderr: ${stderr}`);
    assert.ok(stderr.includes('+1'), `esperava delta +1. stderr: ${stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('safe idioms (as const/unknown/any) continuam excluídos', () => {
  const root = fixture('const a = 1 as const;\nconst b = x as unknown;\nconst c = y as any;\n');
  try {
    const { code, stderr } = runScript(root);
    assert.strictEqual(code, 0, `safe idioms não deveriam contar; esperava exit 0, obteve ${code}. stderr: ${stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
