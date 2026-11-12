// Testa scripts/check-draft-canonical-target.mjs — gate que garante que
// rascunhos de `qa/migrations-draft/*.sql` declaram um alvo canônico
// consistente e não referenciam o projeto proibido (`pqpdolkaeqlyzpdpbizo`)
// em código executável.
//
// Regressão coberta: `stripComments` só removia linhas de comentário
// INTEIRAS (`^\s*--`), então um comentário no FIM de uma linha de código
// (`SELECT 1; -- não rodar isto em pqp...`) continuava contando como
// "código executável" e o gate falhava, mesmo sendo exatamente o padrão que
// o próprio cabeçalho do script diz aceitar como aviso.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/check-draft-canonical-target.mjs');
const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(draftFiles) {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-draft-canonical-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'qa', 'migrations-draft'), { recursive: true });
  mkdirSync(join(root, 'supabase', 'migrations'), { recursive: true });
  for (const [filename, contents] of Object.entries(draftFiles)) {
    writeFileSync(join(root, 'qa', 'migrations-draft', filename), contents, 'utf8');
  }
  return root;
}

function runScript(cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, '--json'], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectRun);
    child.once('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

describe('check-draft-canonical-target: comentário em fim de linha', () => {
  it('aceita referência ao projeto proibido dentro de um comentário no fim da linha', async () => {
    const root = fixture({
      '20261111_sample.sql': [
        '-- Alvo: doufsxqlfjyuvxuezpln',
        'CREATE TABLE foo (id int);',
        "SELECT 1; -- não rodar isto em pqpdolkaeqlyzpdpbizo, apenas no canônico",
        '',
      ].join('\n'),
    });

    const { status, stdout } = await runScript(root);
    const report = JSON.parse(stdout);

    expect(report.failing).toBe(0);
    expect(report.results[0].issues).toEqual([]);
    expect(status).toBe(0);
  });

  it('continua falhando quando a referência proibida está em código executável de fato', async () => {
    const root = fixture({
      '20261111_sample.sql': [
        '-- Alvo: doufsxqlfjyuvxuezpln',
        "UPDATE t SET note = 'migrar de pqpdolkaeqlyzpdpbizo' WHERE id = 1;",
        '',
      ].join('\n'),
    });

    const { status, stdout } = await runScript(root);
    const report = JSON.parse(stdout);

    expect(report.failing).toBe(1);
    expect(report.results[0].issues.join(' ')).toMatch(/código executável/);
    expect(status).toBe(1);
  });

  it('não trata `--` dentro de uma string literal como início de comentário', async () => {
    const root = fixture({
      '20261111_sample.sql': [
        '-- Alvo: doufsxqlfjyuvxuezpln',
        "SELECT 'foo--bar' AS literal;",
        '',
      ].join('\n'),
    });

    const { status, stdout } = await runScript(root);
    const report = JSON.parse(stdout);

    expect(report.failing).toBe(0);
    expect(status).toBe(0);
  });

  it('--json não imprime texto extra no stdout quando o gate passa (JSON.parse direto)', async () => {
    // Regressão: main() imprimia uma linha de sucesso extra em console.log
    // mesmo em modo --json, quebrando qualquer consumidor que faça
    // JSON.parse(stdout) direto quando não há rascunhos com problema.
    const root = fixture({
      '20261111_sample.sql': '-- Alvo: doufsxqlfjyuvxuezpln\nCREATE TABLE foo (id int);\n',
    });

    const { status, stdout } = await runScript(root);

    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(status).toBe(0);
  });
});
