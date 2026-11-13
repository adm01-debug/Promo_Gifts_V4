import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/eslint-baseline-scope-add.mjs');

function runSync(sandbox, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8' });
}

function runAsync(sandbox, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: sandbox });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
}

function readScope(sandbox) {
  return JSON.parse(readFileSync(join(sandbox, '.eslint-baseline-scope.json'), 'utf8'));
}

test('eslint-baseline-scope-add não perde glob em execução concorrente (lost update sem lock)', async () => {
  // Duas execuções "ao mesmo tempo" (ex.: dois agentes rodando
  // `npm run lint:baseline:scope` em paralelo no mesmo repo). Sem trava de
  // arquivo, as duas leem o JSON antes de qualquer uma escrever, e a escrita
  // que termina primeiro é sobrescrita pela outra — uma das duas globs
  // desaparece silenciosamente (exit 0 nas duas, sem aviso). Isso é
  // probabilístico (depende do agendamento do SO), não garantido a cada
  // chamada isolada — então repetimos N vezes: sem a trava de arquivo isso
  // falha na enorme maioria das rodadas (observado ~50% de perda por
  // rodada); com a trava, 0 em N.
  const TRIALS = 10;
  const losses = [];

  for (let i = 0; i < TRIALS; i++) {
    const sandbox = mkdtempSync(join(tmpdir(), 'eslint-scope-race-'));
    try {
      writeFileSync(
        join(sandbox, '.eslint-baseline-scope.json'),
        JSON.stringify({ mode: 'full', include: [], exclude: [] }),
      );

      const [a, b] = await Promise.all([
        runAsync(sandbox, ['src/race-a/**']),
        runAsync(sandbox, ['src/race-b/**']),
      ]);

      assert.equal(a.status, 0, `execução A deveria terminar com exit 0; stderr:\n${a.stderr}`);
      assert.equal(b.status, 0, `execução B deveria terminar com exit 0; stderr:\n${b.stderr}`);

      const cfg = readScope(sandbox);
      if ([...cfg.include].sort().join(',') !== 'src/race-a/**,src/race-b/**') {
        losses.push({ trial: i, include: cfg.include });
      }
      if (cfg.include.length > 0) {
        assert.equal(cfg.mode, 'incremental');
      }

      // O lock temporário não deve sobrar no disco após as duas terminarem.
      assert.equal(
        existsSync(join(sandbox, '.eslint-baseline-scope.json.lock')),
        false,
        'arquivo de lock deveria ser removido ao final da execução',
      );
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }

  assert.deepEqual(
    losses,
    [],
    `${losses.length}/${TRIALS} rodadas perderam uma glob por lost update (sem trava de arquivo): ${JSON.stringify(losses)}`,
  );
});

test('eslint-baseline-scope-add aguarda lock ocupado e falha com mensagem clara se ele não for liberado', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-scope-lock-'));

  try {
    writeFileSync(
      join(sandbox, '.eslint-baseline-scope.json'),
      JSON.stringify({ mode: 'full', include: [], exclude: [] }),
    );
    // Simula lock órfão (ex.: processo anterior morto com SIGKILL antes de
    // limpar o lock).
    writeFileSync(join(sandbox, '.eslint-baseline-scope.json.lock'), '');

    const result = runSync(sandbox, ['src/x/**']);

    assert.equal(result.status, 2, `esperado exit=2 (lock ocupado); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /lock/i);

    // Não deve ter corrompido nem alterado o JSON enquanto esperava o lock.
    const cfg = readScope(sandbox);
    assert.deepEqual(cfg.include, []);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}, 10_000);

test('eslint-baseline-scope-add --list não cria arquivo nem lock quando nenhum existe', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-scope-list-'));

  try {
    const result = runSync(sandbox, ['--list']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /mode: full/);
    assert.equal(existsSync(join(sandbox, '.eslint-baseline-scope.json')), false);
    assert.equal(existsSync(join(sandbox, '.eslint-baseline-scope.json.lock')), false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('eslint-baseline-scope-add rejeita JSON inválido com mensagem e exit 2 (não crasha)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-scope-invalid-'));

  try {
    writeFileSync(join(sandbox, '.eslint-baseline-scope.json'), '{ not json');

    const result = runSync(sandbox, ['src/x/**']);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /inválido/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('eslint-baseline-scope-add --remove de glob inexistente é idempotente (sem erro, sem alterar o resto)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-scope-remove-'));

  try {
    writeFileSync(
      join(sandbox, '.eslint-baseline-scope.json'),
      JSON.stringify({ mode: 'incremental', include: ['src/a/**'], exclude: [] }),
    );

    const result = runSync(sandbox, ['--remove', 'src/nao-existe/**']);

    assert.equal(result.status, 0);
    const cfg = readScope(sandbox);
    assert.deepEqual(cfg.include, ['src/a/**']);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
