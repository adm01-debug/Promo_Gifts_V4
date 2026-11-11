/**
 * Tests for scripts/check-orphan-labels.mjs
 *
 * Gate de a11y: varre `src/**\/*.tsx` buscando `<Label` (Shadcn/Radix) sem
 * `htmlFor=` nem `id=`. Modo ratchet via `.orphan-labels-baseline.json` —
 * só violações NOVAS (fora do baseline) quebram o build.
 *
 * O script executa lógica de topo de módulo (sem export) e lê caminhos
 * relativos (`src`, `.orphan-labels-baseline.json`) ao cwd, então é testado
 * como subprocesso via spawnSync com `cwd` apontando para um sandbox em
 * /tmp, seguindo o mesmo padrão de tests/scripts/check-any-type-baseline.test.mjs.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-orphan-labels.mjs');

function runGate(sandbox, args = [], env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: sandbox,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('check-orphan-labels detecta <Label> sem htmlFor/id com atributos quebrados em múltiplas linhas (estilo Prettier)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-multiline-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, '.orphan-labels-baseline.json'), JSON.stringify({ entries: [] }));

    // Prettier comumente quebra a tag de abertura quando os atributos não
    // cabem em uma linha, deixando `<Label` sozinho no fim da linha — sem
    // nenhum caractere após "Label" na mesma linha.
    writeFileSync(
      join(sandbox, 'src/Form.tsx'),
      [
        'export function Form() {',
        '  return (',
        '    <Label',
        '    >',
        '      Nome sem htmlFor nem id',
        '    </Label>',
        '  );',
        '}',
        '',
      ].join('\n'),
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /1 Label órfão NOVO/);
    assert.match(result.stderr, /src\/Form\.tsx:3/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-orphan-labels não falsifica positivo quando o <Label> multilinha tem htmlFor na linha seguinte', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-multiline-ok-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, '.orphan-labels-baseline.json'), JSON.stringify({ entries: [] }));

    writeFileSync(
      join(sandbox, 'src/Form.tsx'),
      [
        'export function Form() {',
        '  return (',
        '    <Label',
        '      htmlFor="nome"',
        '    >',
        '      Nome',
        '    </Label>',
        '  );',
        '}',
        '',
      ].join('\n'),
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-orphan-labels continua distinguindo <LabelList>/<LabelPrimitive> do componente <Label> mesmo no fim da linha', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-labellist-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, '.orphan-labels-baseline.json'), JSON.stringify({ entries: [] }));

    writeFileSync(
      join(sandbox, 'src/Chart.tsx'),
      [
        'export function Chart() {',
        '  return (',
        '    <LabelList',
        '      dataKey="value"',
        '    />',
        '  );',
        '}',
        '',
      ].join('\n'),
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `<LabelList> não é o componente Label — não deve disparar o gate; saída:\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-orphan-labels não crasha com stack trace cru quando src/ não existe', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-nosrc-'));

  try {
    // Sandbox vazio: nenhum diretório `src/` foi criado.
    const result = runGate(sandbox);

    assert.notEqual(result.signal, 'SIGABRT');
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at walk \(file:/, `não deve vazar stack trace cru:\n${combined}`);
    assert.doesNotMatch(combined, /ENOENT/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-orphan-labels não aborta o scan inteiro quando um subdiretório é um symlink quebrado', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-brokenlink-'));

  try {
    mkdirSync(join(sandbox, 'src/ok'), { recursive: true });
    writeFileSync(
      join(sandbox, 'src/ok/Orphan.tsx'),
      'export const X = () => <Label>Órfão</Label>;\n',
    );
    // Symlink para um diretório inexistente ao lado de uma árvore válida —
    // statSync falha nele, mas o restante da árvore deve continuar sendo
    // varrido (achado em src/ok/Orphan.tsx não pode ser descartado).
    symlinkSync(join(sandbox, 'does-not-exist'), join(sandbox, 'src/broken'));
    writeFileSync(join(sandbox, '.orphan-labels-baseline.json'), JSON.stringify({ entries: [] }));

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (achado real em src/ok); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /src\/ok\/Orphan\.tsx/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-orphan-labels: baseline ausente falha com aviso claro (sem UPDATE_BASELINE)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-nobaseline-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });

    const result = runGate(sandbox);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /não encontrado/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-orphan-labels: UPDATE_BASELINE=1 grava o baseline e a segunda execução passa com 0 regressões', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'orphan-labels-update-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, 'src/Legacy.tsx'),
      'export const X = () => <Label>Legado</Label>;\n',
    );

    const first = runGate(sandbox, [], { UPDATE_BASELINE: '1' });
    assert.equal(first.status, 0, `saída:\n${first.stdout}${first.stderr}`);

    const second = runGate(sandbox);
    assert.equal(second.status, 0, `esperado exit=0 (legado no baseline); saída:\n${second.stdout}${second.stderr}`);
    assert.match(second.stdout, /0 regressões/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
