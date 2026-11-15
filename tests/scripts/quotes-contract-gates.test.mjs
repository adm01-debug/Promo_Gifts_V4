import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const run = (cwd, script, env = {}) =>
  spawnSync('node', [script], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });

describe('check-contract-coverage', () => {
  let dir;
  const registry = (exempt = '') => `export const CONTRACTS = {\n  "covered": { a: 1 },\n};\nexport const NO_BODY_EXEMPT: ReadonlySet<string> = new Set<string>([${exempt}]);\n`;
  const fn = (name, body) => {
    mkdirSync(join(dir, 'supabase/functions', name), { recursive: true });
    writeFileSync(join(dir, 'supabase/functions', name, 'index.ts'), body);
  };
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ccov-'));
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    mkdirSync(join(dir, 'tests/contracts'), { recursive: true });
    cpSync(join(ROOT, 'scripts/check-contract-coverage.mjs'), join(dir, 'scripts/check-contract-coverage.mjs'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const reset = (exempt, allow) => {
    rmSync(join(dir, 'supabase'), { recursive: true, force: true });
    mkdirSync(join(dir, 'supabase/functions'), { recursive: true });
    writeFileSync(join(dir, 'tests/contracts/webhook-schemas.ts'), registry(exempt));
    rmSync(join(dir, 'scripts/check-contract-coverage.allowlist.json'), { force: true });
    if (allow) writeFileSync(join(dir, 'scripts/check-contract-coverage.allowlist.json'), JSON.stringify(allow));
  };

  it.each([
    ['safeJson(req)', 'const b = await safeJson(req);'],
    ['safeParseBody(', 'const b = await safeParseBody(req, S);'],
    ['parseBodyWithSchema(', 'await parseBodyWithSchema(req, S);'],
    ['readBodyWithinLimit(', 'await readBodyWithinLimit(req, 10);'],
    ['request.formData()', 'await request.formData();'],
  ])('detecta função sem contrato que lê o body via %s', (_n, code) => {
    reset('');
    fn('sem-contrato', code);
    const r = run(dir, 'scripts/check-contract-coverage.mjs');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('sem-contrato');
  });

  it('função só com GET (sem leitura de body) continua passando', () => {
    reset('');
    fn('so-get', 'return new Response("ok");');
    expect(run(dir, 'scripts/check-contract-coverage.mjs').status).toBe(0);
  });

  it('dívida na allowlist passa com aviso; sem allowlist falha', () => {
    reset('');
    fn('divida', 'await safeJson(req);');
    expect(run(dir, 'scripts/check-contract-coverage.mjs').status).toBe(1);
    reset('', { divida: 'motivo real com mais de dez caracteres' });
    fn('divida', 'await safeJson(req);');
    const r = run(dir, 'scripts/check-contract-coverage.mjs');
    expect(r.status).toBe(0);
    expect(r.stderr + r.stdout).toContain('dívida: divida');
  });

  it('entrada obsoleta na allowlist falha (a dívida só encolhe)', () => {
    reset('', { fantasma: 'motivo real com mais de dez caracteres' });
    fn('so-get', 'return 1;');
    const r = run(dir, 'scripts/check-contract-coverage.mjs');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('fantasma');
  });

  it('motivo vazio/TODO e JSON inválido na allowlist falham (exit 2)', () => {
    reset('', { x: 'TODO depois' });
    expect(run(dir, 'scripts/check-contract-coverage.mjs').status).toBe(2);
    reset('');
    writeFileSync(join(dir, 'scripts/check-contract-coverage.allowlist.json'), '{nope');
    expect(run(dir, 'scripts/check-contract-coverage.mjs').status).toBe(2);
  });

  it('repo real: manage-users é a única dívida registrada e o gate passa', () => {
    const r = run(ROOT, 'scripts/check-contract-coverage.mjs');
    expect(r.status).toBe(0);
    const allow = JSON.parse(readFileSync(join(ROOT, 'scripts/check-contract-coverage.allowlist.json'), 'utf8'));
    expect(Object.keys(allow).filter((k) => !k.startsWith('_'))).toEqual(['manage-users']);
  });
});

describe('validate-quotes-list · passo de type-check', () => {
  let dir;
  const setup = (fakeTsc) => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, 'scripts/lib'), { recursive: true });
    mkdirSync(join(dir, 'src/components/quotes'), { recursive: true });
    mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true });
    cpSync(join(ROOT, 'scripts/validate-quotes-list.mjs'), join(dir, 'scripts/validate-quotes-list.mjs'));
    cpSync(join(ROOT, 'scripts/lib/tsc-run.mjs'), join(dir, 'scripts/lib/tsc-run.mjs'));
    for (const f of ['QuotesConfigurableList.tsx', 'QuoteListCellRenderer.tsx'])
      cpSync(join(ROOT, 'src/components/quotes', f), join(dir, 'src/components/quotes', f));
    for (const bin of ['tsc', 'vitest']) {
      const body = bin === 'tsc' ? fakeTsc : '#!/bin/sh\nexit 1\n';
      writeFileSync(join(dir, 'node_modules/.bin', bin), body);
      chmodSync(join(dir, 'node_modules/.bin', bin), 0o755);
    }
  };
  beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'vql-')); });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const tsLine = (out) => out.split('\n').find((l) => l.includes('Type-check')) ?? '';

  it('tsc ausente/quebrado sem diagnóstico → passo FALHA (antes: passava por `|| true`)', () => {
    setup('#!/bin/sh\necho "sh: tsc: crashed" >&2\nexit 134\n');
    const r = run(dir, 'scripts/validate-quotes-list.mjs');
    expect(tsLine(r.stdout)).toContain('❌');
    expect(r.status).toBe(1);
  });

  it('erro de tipo num arquivo da lista → FALHA', () => {
    setup(`#!/bin/sh\necho "src/components/quotes/QuoteListCellRenderer.tsx(10,5): error TS2322: x" \nexit 2\n`);
    const r = run(dir, 'scripts/validate-quotes-list.mjs');
    expect(tsLine(r.stdout)).toContain('❌');
    expect(r.stdout).toContain('QuoteListCellRenderer.tsx(10,5)');
  });

  it('erro em OUTRO arquivo cuja mensagem cita o componente não derruba o passo', () => {
    setup(`#!/bin/sh\necho "src/pages/QuotesListPage.tsx(4,1): error TS2322: Type is not assignable to IntrinsicAttributes & QuotesConfigurableListProps"\nexit 2\n`);
    const r = run(dir, 'scripts/validate-quotes-list.mjs');
    expect(tsLine(r.stdout)).toContain('✅');
  });

  it('tsc limpo → passo passa', () => {
    setup('#!/bin/sh\nexit 0\n');
    expect(tsLine(run(dir, 'scripts/validate-quotes-list.mjs').stdout)).toContain('✅');
  });
});
