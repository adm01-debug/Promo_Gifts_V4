// Testa scripts/generate-theme-report.mjs: gera CSV/HTML a partir do JSON
// de falhas escrito por e2e/theme-validation.spec.ts
// (theme-validation-output/theme-validation-data.json).
//
// O script usa process.cwd() para resolver os paths (não __dirname), então
// os testes de integração rodam via CLI real (spawnSync) com `cwd` apontado
// para um sandbox temporário em /tmp — nunca tocam nos arquivos reais do
// repo.
//
// Bug real encontrado em auditoria adversarial: JSON.parse(raw) sem remover
// BOM UTF-8 quebrava com "SyntaxError: Unexpected token '﻿'" (exit 1,
// stack trace cru do Node) se theme-validation-data.json fosse salvo com
// byte-order-mark — mesma classe de bug já corrigida em
// check-rls-no-policy-drift.mjs (ver tests/scripts/check-rls-no-policy-drift.test.mjs).
// Prova: sem o `.replace(/^﻿/, '')` antes do JSON.parse, o teste de
// regressão abaixo falha.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/generate-theme-report.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function buildSandbox(jsonContent) {
  const sbx = mkdtempSync(join(tmpdir(), 'theme-report-sbx-'));
  temporaryRoots.push(sbx);
  if (jsonContent !== undefined) {
    const inputDir = join(sbx, 'theme-validation-output');
    mkdirSync(inputDir, { recursive: true });
    writeFileSync(join(inputDir, 'theme-validation-data.json'), jsonContent);
  }
  return sbx;
}

function run(cwd) {
  return spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' });
}

function htmlOf(sbx) {
  return readFileSync(join(sbx, 'playwright-report/theme-validation-report.html'), 'utf-8');
}

function csvOf(sbx) {
  return readFileSync(join(sbx, 'playwright-report/theme-validation-report.csv'), 'utf-8');
}

// ─── Bug real encontrado e corrigido: BOM UTF-8 no JSON de entrada ────────
describe('BOM UTF-8 não quebra a leitura do JSON (regressão)', () => {
  it('gera o relatório normalmente quando o JSON tem BOM UTF-8', () => {
    const failure = { preset: 'Escuro', mode: 'dark', route: '/', type: 'contrast', details: 'Baixo contraste: 2.00:1' };
    const sbx = buildSandbox('﻿' + JSON.stringify([failure]));
    const result = run(sbx);
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('SyntaxError');
    expect(csvOf(sbx)).toContain('Escuro');
    expect(htmlOf(sbx)).toContain('Total de falhas encontradas: <strong>1</strong>');
  });

  it('JSON vazio ([]) com BOM UTF-8 gera relatório de sucesso (0 falhas)', () => {
    const sbx = buildSandbox('﻿[]');
    const result = run(sbx);
    expect(result.status).toBe(0);
    expect(htmlOf(sbx)).toContain('Nenhuma falha detectada');
  });
});

// ─── Comportamento documentado: JSON ausente não é erro ────────────────────
describe('JSON ausente (tolerância documentada no script)', () => {
  it('gera relatório vazio (0 falhas) e exit 0 quando o JSON não existe', () => {
    const sbx = buildSandbox(undefined);
    const result = run(sbx);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('JSON ausente');
    expect(htmlOf(sbx)).toContain('Nenhuma falha detectada');
    expect(csvOf(sbx).trim()).toBe('Preset,Mode,Route,Type,Details');
  });
});

// ─── Comportamento básico sem BOM (não-regressão) ──────────────────────────
describe('Geração normal de CSV/HTML', () => {
  it('cria playwright-report/ se não existir e escreve os 2 arquivos', () => {
    const sbx = buildSandbox('[]');
    expect(existsSync(join(sbx, 'playwright-report'))).toBe(false);
    const result = run(sbx);
    expect(result.status).toBe(0);
    expect(existsSync(join(sbx, 'playwright-report/theme-validation-report.html'))).toBe(true);
    expect(existsSync(join(sbx, 'playwright-report/theme-validation-report.csv'))).toBe(true);
  });

  it('lista cada falha na tabela HTML e na linha CSV', () => {
    const failures = [
      { preset: 'Claro', mode: 'dark', route: '/', type: 'contrast', details: 'Baixo contraste: 3.10:1' },
      { preset: 'Claro', mode: 'dark', route: '/auth', type: 'typography', details: 'Fonte incorreta' },
    ];
    const sbx = buildSandbox(JSON.stringify(failures));
    const result = run(sbx);
    expect(result.status).toBe(0);
    const csv = csvOf(sbx);
    expect(csv.split('\n')).toHaveLength(3); // header + 2 linhas
    expect(htmlOf(sbx)).toContain('Total de falhas encontradas: <strong>2</strong>');
  });
});
