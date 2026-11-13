// Testa scripts/check-rls-no-policy-drift.mjs (P200-E045): gate que detecta
// tabelas com RLS habilitada e ZERO policies fora de
// .security/rls-no-policy-allowlist.json.
//
// O script não exporta funções (main() roda direto no import), então os
// testes de integração rodam via CLI real (spawnSync), isolados em um
// "sandbox" temporário em /tmp que copia só os 3 arquivos necessários
// (o próprio script + as duas dependências) e cria .security/ e
// supabase/baseline/schemas.txt próprios — nunca toca nos arquivos reais
// do repo (.security/rls-no-policy-allowlist.json real fica intocado).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/check-rls-no-policy-drift.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * Monta um sandbox isolado com cópias do script e das suas duas dependências
 * diretas, mais .security/rls-no-policy-allowlist.json e
 * supabase/baseline/schemas.txt próprios. Nunca lê/escreve nos arquivos reais
 * do repo.
 */
function buildSandbox({ allowlist, schemas = 'public\n' } = {}) {
  const sbx = mkdtempSync(join(tmpdir(), 'rls-no-policy-sbx-'));
  temporaryRoots.push(sbx);
  mkdirSync(join(sbx, 'scripts'), { recursive: true });
  mkdirSync(join(sbx, '.security'), { recursive: true });
  mkdirSync(join(sbx, 'supabase/baseline'), { recursive: true });
  cpSync(REAL_SCRIPT, join(sbx, 'scripts/check-rls-no-policy-drift.mjs'));
  cpSync(
    resolve(ROOT, 'scripts/check-result-contract.mjs'),
    join(sbx, 'scripts/check-result-contract.mjs'),
  );
  cpSync(
    resolve(ROOT, 'scripts/supabase-read-only-query.mjs'),
    join(sbx, 'scripts/supabase-read-only-query.mjs'),
  );
  writeFileSync(join(sbx, 'supabase/baseline/schemas.txt'), schemas);
  if (allowlist !== undefined) {
    writeFileSync(join(sbx, '.security/rls-no-policy-allowlist.json'), allowlist);
  }
  return { sbx, script: join(sbx, 'scripts/check-rls-no-policy-drift.mjs') };
}

function runNoCreds(script, args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.SUPABASE_ACCESS_TOKEN;
  delete env.SUPABASE_PROJECT_REF;
  delete env.VITE_SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  return spawnSync('node', [script, ...args], { env, encoding: 'utf8' });
}

const VALID_ALLOWLIST = JSON.stringify({
  tables: [{ table: 'public.foo', reason: 'motivo real documentado', secdef_fn: null, cron_job: null }],
});

// ─── Bug real encontrado e corrigido: BOM UTF-8 no allowlist ──────────────
// Antes da correção, um allowlist salvo com BOM (comum em editores Windows)
// quebrava com "erro inesperado: Unexpected token '﻿'" (exit 2) em vez
// de validar normalmente. Prova: sem o `.replace(/^﻿/, '')` no
// JSON.parse, este teste falha.
describe('BOM UTF-8 não quebra a leitura de JSON (regressão)', () => {
  it('--gate valida normalmente um allowlist com BOM UTF-8', () => {
    const { script } = buildSandbox({ allowlist: '﻿' + VALID_ALLOWLIST });
    const result = runNoCreds(script, ['--gate']);
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
    expect(result.stdout + result.stderr).not.toContain('erro inesperado');
  });

  it('--from-file com BOM UTF-8 é lido normalmente (passa quando achado está na allowlist)', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const findingsPath = join(sbx, 'findings.json');
    writeFileSync(findingsPath, '﻿' + JSON.stringify(['public.foo']));
    const result = runNoCreds(script, [`--from-file=${findingsPath}`]);
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain('erro inesperado');
  });
});

// ─── Comportamento básico sem credenciais / --gate ─────────────────────────
describe('CLI sem credenciais', () => {
  it('degrada para static-pass (exit 0) sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF', () => {
    const { script } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const result = runNoCreds(script, []);
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
  });

  it('degrada para inconclusive (exit 2) com --require-live e sem credenciais', () => {
    const { script } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const result = runNoCreds(script, ['--require-live']);
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });

  it('--gate passa (exit 0) com allowlist válida', () => {
    const { script } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const result = runNoCreds(script, ['--gate']);
    expect(result.status).toBe(0);
  });

  it('--gate falha (exit 1) quando reason contém TODO', () => {
    const { script } = buildSandbox({
      allowlist: JSON.stringify({
        tables: [{ table: 'public.foo', reason: 'TODO: revisar', secdef_fn: null, cron_job: null }],
      }),
    });
    const result = runNoCreds(script, ['--gate']);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('marcador de pendência');
  });

  it('--gate falha (exit 1) quando reason está ausente', () => {
    const { script } = buildSandbox({
      allowlist: JSON.stringify({ tables: [{ table: 'public.foo', secdef_fn: null, cron_job: null }] }),
    });
    const result = runNoCreds(script, ['--gate']);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain("reason' ausente");
  });

  it('allowlist ausente: exit 2 com mensagem explícita', () => {
    const { script } = buildSandbox({}); // sem allowlist criado
    const result = runNoCreds(script, []);
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('allowlist ausente');
  });
});

// ─── --from-file: achados novos / allowlist stale ──────────────────────────
describe('CLI --from-file', () => {
  it('passa (exit 0) quando não há achados fora da allowlist', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const p = join(sbx, 'findings.json');
    writeFileSync(p, JSON.stringify(['public.foo']));
    const result = spawnSync('node', [script, `--from-file=${p}`], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('todas documentadas');
  });

  it('falha (exit 1) quando há achado novo fora da allowlist', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const p = join(sbx, 'findings.json');
    writeFileSync(p, JSON.stringify(['public.orphan_rls_table']));
    const result = spawnSync('node', [script, `--from-file=${p}`], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('public.orphan_rls_table');
  });

  it('não falha quando a allowlist tem entrada stale (não encontrada no BD), só avisa', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const p = join(sbx, 'findings.json');
    writeFileSync(p, JSON.stringify([]));
    const result = spawnSync('node', [script, `--from-file=${p}`], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('não encontradas no BD');
  });

  it('aceita o formato alternativo {tables:[...]}', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const p = join(sbx, 'findings.json');
    writeFileSync(p, JSON.stringify({ tables: ['public.orphan_rls_table'] }));
    const result = spawnSync('node', [script, `--from-file=${p}`], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('public.orphan_rls_table');
  });

  it('exit 2 (erro) quando --from-file aponta para arquivo inexistente', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const result = spawnSync('node', [script, `--from-file=${join(sbx, 'nope.json')}`], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('erro inesperado');
  });

  it('exit 2 (erro) quando --from-file tem JSON malformado', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const p = join(sbx, 'bad.json');
    writeFileSync(p, '{ not json');
    const result = spawnSync('node', [script, `--from-file=${p}`], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('erro inesperado');
  });

  it('lida com 100k entradas sem travar e aponta todos os achados fora da allowlist', () => {
    const { script, sbx } = buildSandbox({ allowlist: VALID_ALLOWLIST });
    const p = join(sbx, 'huge.json');
    const rows = Array.from({ length: 100_000 }, (_, i) => `public.table_${i}`);
    rows.push('public.foo');
    writeFileSync(p, JSON.stringify(rows));
    const result = spawnSync('node', [script, `--from-file=${p}`], { encoding: 'utf8', timeout: 20_000 });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('100000 tabela(s)');
  });
});
