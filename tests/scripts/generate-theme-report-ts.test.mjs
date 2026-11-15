// Testa scripts/generate-theme-report.ts: gera CSV/HTML a partir do JSON de
// falhas lido em playwright-report/theme-validation-data.json.
//
// Este script é diferente (e lê de um path diferente) do seu irmão
// scripts/generate-theme-report.mjs, coberto por
// tests/scripts/generate-theme-report.test.mjs — por isso um arquivo de
// teste dedicado, em vez de estender aquele.
//
// O script usa process.cwd() para resolver os paths (não __dirname), então
// os testes de integração rodam via CLI real (spawnSync, através do loader
// `tsx`) com `cwd` apontado para um sandbox temporário em /tmp — nunca tocam
// nos arquivos reais do repo.
//
// Bug real encontrado em auditoria adversarial: JSON.parse(raw) sem remover
// BOM UTF-8 quebrava com "SyntaxError: Unexpected token '﻿'" (crash não
// tratado, stack trace crua do Node, exit code 1) quando
// theme-validation-data.json era salvo com byte-order-mark — mesma classe de
// bug já corrigida no irmão scripts/generate-theme-report.mjs (ver
// tests/scripts/generate-theme-report.test.mjs). Prova: sem o
// `.replace(/^﻿/, '')` antes do JSON.parse, o teste de regressão abaixo
// falha.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/generate-theme-report.ts');
const TSX_BIN = resolve(ROOT, 'node_modules/.bin/tsx');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function buildSandbox(jsonContent) {
  const sbx = mkdtempSync(join(tmpdir(), 'theme-report-ts-sbx-'));
  temporaryRoots.push(sbx);
  const reportDir = join(sbx, 'playwright-report');
  mkdirSync(reportDir, { recursive: true });
  if (jsonContent !== undefined) {
    writeFileSync(join(reportDir, 'theme-validation-data.json'), jsonContent);
  }
  return sbx;
}

function run(cwd) {
  return spawnSync(TSX_BIN, [SCRIPT], { cwd, encoding: 'utf8' });
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

// ─── Comportamento documentado: JSON ausente é erro hard (gate) ───────────
describe('JSON ausente (comportamento documentado do script: falha hard)', () => {
  it('sai com exit 1 e mensagem clara quando o JSON não existe', () => {
    const sbx = buildSandbox(undefined);
    const result = run(sbx);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Nenhum dado de validação encontrado');
  });
});

// ─── Comportamento básico sem BOM (não-regressão) ──────────────────────────
describe('Geração normal de CSV/HTML', () => {
  it('escreve os 2 arquivos a partir de um JSON válido', () => {
    const sbx = buildSandbox('[]');
    const result = run(sbx);
    expect(result.status).toBe(0);
    expect(csvOf(sbx).trim()).toBe('Preset,Mode,Route,Type,Details');
    expect(htmlOf(sbx)).toContain('Nenhuma falha detectada');
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
