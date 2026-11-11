/**
 * Testes para scripts/check-gates-table.mjs
 *
 * Bug real encontrado em auditoria adversarial do script:
 *
 * Crash não tratado / mensagem de erro que não ajuda: o script lia
 * `.github/workflows/deploy-gates.yml` e `docs/agentes/ci-gates.md` com
 * `readFileSync` direto, sem try/catch. Quando um dos dois arquivos não
 * existe (ENOENT), não pode ser lido por permissão (EACCES) ou é um
 * diretório em vez de arquivo (EISDIR), o processo morria com um stack
 * trace crua do Node (`at readFileSync (node:fs:...)`) em vez do relatório
 * de erro controlado (`✗ check-gates-table: ...`) que o resto do script
 * usa. O exit code 1 já era "correto" por acidente (exceção não tratada
 * também sai com 1), mas a mensagem não ajudava quem via o log do CI.
 * Corrigido envolvendo as duas leituras em um único try/catch que imprime
 * uma mensagem controlada e sai com 1 (mesmo exit code de antes).
 *
 * Demais cenários adversariais testados manualmente durante a auditoria
 * (não precisam de regressão automatizada porque não revelaram bug):
 * CRLF, BOM UTF-8, conteúdo Latin-1, path com espaços no cwd, args
 * extras/malformados, execução concorrente (script é só leitura, sem
 * efeitos colaterais), arquivo com 100k steps (processa em ~0.16s, sem
 * ReDoS), SIGINT no meio da execução (sem estado para corromper, idempotente
 * por não escrever nada em disco), e steps "Gate E<n><letra>" (ex.: "Gate
 * E118a") que o regex não captura — confirmado como escopo intencional:
 * docs/agentes/ci-gates.md linha 19 diz que o script cobre apenas o
 * formato "Gate X.Y", e os gates "Gate EXX" são documentados em prosa,
 * fora da tabela.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-gates-table.mjs');

function run(sandbox, args = []) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: sandbox,
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, '.github/workflows'), { recursive: true });
  mkdirSync(join(sandbox, 'docs/agentes'), { recursive: true });
  return sandbox;
}

const YAML_PATH = '.github/workflows/deploy-gates.yml';
const DOCS_PATH = 'docs/agentes/ci-gates.md';

function writeYaml(sandbox, content) {
  writeFileSync(join(sandbox, YAML_PATH), content);
}

function writeDocs(sandbox, content) {
  writeFileSync(join(sandbox, DOCS_PATH), content);
}

const BASE_YAML = [
  'jobs:',
  '  gate:',
  '    steps:',
  '      - name: Gate 0 — valida config supabase',
  '        run: echo ok',
  '      - name: Gate 1.1 — valida product type fields',
  '        run: echo ok',
  '',
].join('\n');

const BASE_DOCS = ['| Gate | Descrição |', '|------|-----------|', '| Gate 0 | valida config |', '| Gate 1.1 | valida product type |', ''].join(
  '\n',
);

// ─────────────────────────────────────────────────────────────────────────
// Comportamento normal (sem bug)
// ─────────────────────────────────────────────────────────────────────────

test('todos os gates do YAML documentados: exit 0', () => {
  const sandbox = makeSandbox('gates-table-ok-');
  try {
    writeYaml(sandbox, BASE_YAML);
    writeDocs(sandbox, BASE_DOCS);
    const { code, stdout } = run(sandbox);
    expect(code).toBe(0);
    expect(stdout).toMatch(/✓ check-gates-table: todos os 2 gates/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('gate no YAML sem entrada na tabela de docs: exit 1 e lista o gate faltante', () => {
  const sandbox = makeSandbox('gates-table-missing-');
  try {
    writeYaml(
      sandbox,
      BASE_YAML.replace(
        '        run: echo ok\n',
        '        run: echo ok\n      - name: Gate 1.18 — conflitos semanticos\n        run: echo ok\n',
      ),
    );
    writeDocs(sandbox, BASE_DOCS);
    const { code, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect(stderr).toMatch(/1 gate\(s\)/);
    expect(stderr).toMatch(/Gate 1\.18/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('--gate acrescenta instrução de correção quando há gate faltante', () => {
  const sandbox = makeSandbox('gates-table-gateflag-');
  try {
    writeYaml(
      sandbox,
      BASE_YAML.replace(
        '        run: echo ok\n',
        '        run: echo ok\n      - name: Gate 1.18 — conflitos semanticos\n        run: echo ok\n',
      ),
    );
    writeDocs(sandbox, BASE_DOCS);
    const { code, stderr } = run(sandbox, ['--gate']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/Adicione as linhas ausentes/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug: crash não tratado / mensagem crua do Node em vez de erro controlado
// ─────────────────────────────────────────────────────────────────────────

test('deploy-gates.yml ausente: erro controlado (não stack trace do Node), exit 1', () => {
  const sandbox = makeSandbox('gates-table-noyaml-');
  try {
    writeDocs(sandbox, BASE_DOCS);
    // YAML nunca é escrito — ENOENT ao ler.
    const { code, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect(stderr).toMatch(/✗ check-gates-table: não foi possível ler/);
    expect(stderr).toMatch(/deploy-gates\.yml/);
    expect(stderr).not.toMatch(/at readFileSync/);
    expect(stderr).not.toMatch(/node:internal/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('ci-gates.md ausente (YAML presente): erro controlado, exit 1', () => {
  const sandbox = makeSandbox('gates-table-nodocs-');
  try {
    writeYaml(sandbox, BASE_YAML);
    // docs/agentes/ci-gates.md nunca é escrito — ENOENT ao ler.
    const { code, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect(stderr).toMatch(/✗ check-gates-table: não foi possível ler/);
    expect(stderr).toMatch(/ci-gates\.md/);
    expect(stderr).not.toMatch(/at readFileSync/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('diretório no lugar do arquivo de docs (EISDIR): erro controlado, exit 1', () => {
  const sandbox = makeSandbox('gates-table-eisdir-');
  try {
    writeYaml(sandbox, BASE_YAML);
    rmSync(join(sandbox, DOCS_PATH), { force: true });
    mkdirSync(join(sandbox, DOCS_PATH));
    const { code, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect(stderr).toMatch(/✗ check-gates-table: não foi possível ler/);
    expect(stderr).toMatch(/EISDIR/);
    expect(stderr).not.toMatch(/at readFileSync/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Robustez de encoding/formatação (confirmados sem bug, mantidos como
// regressão porque são baratos e protegem o parsing)
// ─────────────────────────────────────────────────────────────────────────

test('CRLF no YAML e na tabela não impede o match', () => {
  const sandbox = makeSandbox('gates-table-crlf-');
  try {
    writeYaml(sandbox, '      - name: Gate 2.1 - teste CRLF\r\n        run: echo ok\r\n');
    writeDocs(sandbox, '| Gate 2.1 | desc CRLF |\r\n');
    const { code, stdout } = run(sandbox);
    expect(code).toBe(0);
    expect(stdout).toMatch(/todos os 1 gates/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('BOM UTF-8 no YAML não impede o match do primeiro step', () => {
  const sandbox = makeSandbox('gates-table-bom-');
  try {
    writeFileSync(join(sandbox, YAML_PATH), '﻿      - name: Gate 3.1 - bom test\n');
    writeDocs(sandbox, '| Gate 3.1 | desc |\n');
    const { code, stdout } = run(sandbox);
    expect(code).toBe(0);
    expect(stdout).toMatch(/todos os 1 gates/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
