import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectFiles, fixAndCheck } from './run.mjs';

function fixture(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'autofix-regressao-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  function git(...args) {
    const result = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, HUSKY: '0' },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  function write(file, content) {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  }
  git('init', '--quiet');
  git('config', 'user.name', 'Fixture local');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'core.hooksPath', '/dev/null');
  for (const file of ['src/removed.ts', 'src/renamed.ts', 'src/changed.ts', 'docs/ignored.ts'])
    write(file, 'export const value = 0;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'base');
  const base = git('rev-parse', 'HEAD');
  rmSync(path.join(cwd, 'src/removed.ts'));
  renameSync(path.join(cwd, 'src/renamed.ts'), path.join(cwd, 'src/new name.ts'));
  write('src/changed.ts', 'export const value = 1;\n');
  write('docs/ignored.ts', 'export const value = 1;\n');
  write('src/linha\nnova.ts', 'export const novo = 1;\n');
  write('src/arquivo ; echo perigoso.ts', 'export const novo = 1;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'mudancas');
  write(
    'node_modules/eslint/bin/eslint.js',
    `const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
const failed = args.some(arg => { try { return fs.readFileSync(arg, 'utf8').includes('UNFIXABLE'); } catch { return false; } });
process.exit(failed ? 1 : 0);
`,
  );
  return {
    cwd,
    base,
    git,
    write,
    calls: () =>
      readFileSync(path.join(cwd, 'calls.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
  };
}

test('selecao exclui delecoes e preserva renomeados e nomes especiais', (t) => {
  const f = fixture(t);
  const files = selectFiles(f.cwd);
  assert.deepEqual(
    files.sort(),
    [
      'src/changed.ts',
      'src/new name.ts',
      'src/linha\nnova.ts',
      'src/arquivo ; echo perigoso.ts',
    ].sort(),
  );
});

test('executa verificacao sem fix depois de corrigir, com argv seguro', (t) => {
  const f = fixture(t);
  fixAndCheck(f.cwd, ['src/arquivo ; echo perigoso.ts']);
  const calls = f.calls();
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('--fix'));
  assert.ok(!calls[1].includes('--fix'));
  assert.equal(calls[1].at(-1), 'src/arquivo ; echo perigoso.ts');
  assert.ok(calls[1].some((arg) => arg.startsWith('--max-warnings')));
});

test('erro nao corrigivel bloqueia mesmo sem diff', (t) => {
  const f = fixture(t);
  f.write('src/changed.ts', 'UNFIXABLE');
  assert.throws(() => fixAndCheck(f.cwd, ['src/changed.ts']), /pos-fix falhou/);
  assert.equal(f.calls().length, 2);
});

test('SHA manual fora do checkout e rejeitado', (t) => {
  const f = fixture(t);
  assert.throws(() => selectFiles(f.cwd, f.base), /checkout/);
});

test('erro de configuracao aborta sem apresentar resultado limpo', (t) => {
  const f = fixture(t);
  f.write('node_modules/eslint/bin/eslint.js', 'process.exit(2);\n');
  assert.throws(() => fixAndCheck(f.cwd, ['src/changed.ts']), /fix falhou \(2\)/);
});

test('workflow valida lint antes de detectar clean e TypeScript antes de PR', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/lovable-autoheal.yml', import.meta.url),
    'utf8',
  );
  assert.ok(
    workflow.indexOf('run: node scripts/autoheal-eslint/run.mjs fix') <
      workflow.indexOf('id: check_changes'),
  );
  assert.ok(
    workflow.indexOf('id: tsc_check') <
      workflow.indexOf('name: Commitar correções ESLint e abrir PR'),
  );
  assert.match(workflow, /name: Bloquear resultado com TypeScript invalido apos fix/);
  assert.doesNotMatch(workflow, /eslint\.js --fix.*\|\| true/);
});


function realEslintFixture(t) {
  const f = fixture(t);
  rmSync(path.join(f.cwd, 'node_modules/eslint'), { recursive: true });
  symlinkSync(fileURLToPath(new URL('../../node_modules/eslint', import.meta.url)), path.join(f.cwd, 'node_modules/eslint'), 'dir');
  f.write('eslint.config.mjs', `export default [
    { ignores: ['src/ignored.ts'] },
    { files: ['**/*.ts'], rules: { 'no-warning-comments': ['warn', { terms: ['FIXME'], location: 'anywhere' }] } }
  ];\n`);
  f.write('src/ignored.ts', 'export const ignored = 1;\n');
  return f;
}

test('ESLint real ignora apenas aviso de arquivo explicitamente ignorado', (t) => {
  const f = realEslintFixture(t);
  const before = readFileSync(path.join(f.cwd, 'src/ignored.ts'), 'utf8');
  assert.doesNotThrow(() => fixAndCheck(f.cwd, ['src/ignored.ts', 'src/changed.ts']));
  assert.equal(readFileSync(path.join(f.cwd, 'src/ignored.ts'), 'utf8'), before);
});

test('ESLint real continua bloqueando warning genuino com ignored na mesma lista', (t) => {
  const f = realEslintFixture(t);
  f.write('src/changed.ts', '// FIXME: warning real da fixture\nexport const value = 1;\n');
  assert.throws(() => fixAndCheck(f.cwd, ['src/ignored.ts', 'src/changed.ts']), /pos-fix falhou/);
});
