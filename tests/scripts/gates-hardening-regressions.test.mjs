// Regressões de gates endurecidos na integração #3400 que nenhum teste protegia
// (achadas por mutação: sabotar a correção não derrubava teste algum).
import { afterEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { searchFixedString } from '../../scripts/lib/fixed-string-search.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});
const tmp = (p) => {
  const d = mkdtempSync(join(tmpdir(), p));
  dirs.push(d);
  return d;
};
const git = (cwd, ...a) =>
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { cwd, encoding: 'utf8' });
const run = (script, cwd, env) =>
  spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...(env.ARGS ?? [])], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
  });

describe('check-generated-files-protected', () => {
  function repoWithTypes(lines) {
    const d = tmp('gen-files-');
    git(d, 'init', '-q');
    mkdirSync(join(d, 'src/integrations/supabase'), { recursive: true });
    writeFileSync(join(d, 'src/integrations/supabase/types.ts'), Array.from({ length: lines }, (_, i) => `l${i}`).join('\n') + '\n');
    git(d, 'add', '.');
    git(d, 'commit', '-qm', 'base');
    return { d, base: git(d, 'rev-parse', 'HEAD').stdout.trim() };
  }

  it('redução real ≥20% num arquivo gerado reprova (100 → 50 linhas)', () => {
    const { d, base } = repoWithTypes(100);
    writeFileSync(join(d, 'src/integrations/supabase/types.ts'), Array.from({ length: 50 }, (_, i) => `l${i}`).join('\n') + '\n');
    git(d, 'commit', '-qam', 'reduz');
    const r = run('check-generated-files-protected.mjs', d, { GITHUB_BASE_SHA: base, ARGS: ['--gate'] });
    expect(r.status, r.stdout + r.stderr).toBe(1);
  });

  it('redução pequena (<20%) passa', () => {
    const { d, base } = repoWithTypes(100);
    writeFileSync(join(d, 'src/integrations/supabase/types.ts'), Array.from({ length: 95 }, (_, i) => `l${i}`).join('\n') + '\n');
    git(d, 'commit', '-qam', 'reduz pouco');
    const r = run('check-generated-files-protected.mjs', d, { GITHUB_BASE_SHA: base, ARGS: ['--gate'] });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it('GITHUB_BASE_SHA com opção do git ("--output=…") é rejeitado, não vira argumento', () => {
    const { d } = repoWithTypes(10);
    const out = join(d, 'pwned.txt');
    const r = run('check-generated-files-protected.mjs', d, { GITHUB_BASE_SHA: `--output=${out}`, ARGS: ['--gate'] });
    expect(r.status).not.toBe(0);
    expect(existsSync(out)).toBe(false);
    expect(r.stderr).toMatch(/GITHUB_BASE_SHA inválido/);
    expect(r.status).toBe(2); // --gate: erro de entrada = 2 (não "redução encontrada" = 1)
  });

  it('opção do git terminada em hex ("--output=…/abcdef1234") também é rejeitada (âncora ^ da regex)', () => {
    const { d } = repoWithTypes(10);
    const out = join(d, 'abcdef1234');
    const r = run('check-generated-files-protected.mjs', d, { GITHUB_BASE_SHA: `--output=${out}`, ARGS: ['--gate'] });
    expect(r.status).toBe(2);
    expect(existsSync(out)).toBe(false);
  });
});

describe('check-security-definer-hardening', () => {
  function prRepo(migrationSql) {
    const d = tmp('secdef-');
    git(d, 'init', '-q', '-b', 'main');
    mkdirSync(join(d, 'supabase/migrations'), { recursive: true });
    writeFileSync(join(d, 'README.md'), 'x\n');
    git(d, 'add', '.');
    git(d, 'commit', '-qm', 'base');
    git(d, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    // Caminho montado em partes: é um arquivo do repo TEMPORÁRIO do teste, não do projeto
    // (o check-migration-path-references acusaria a string literal como referência quebrada).
    writeFileSync(join(d, 'supabase', 'migrations', `${'20990101000000'}_x.sql`), migrationSql);
    git(d, 'add', '.');
    git(d, 'commit', '-qm', 'pr');
    return d;
  }
  const SD = (acl) => `CREATE OR REPLACE FUNCTION public.f() RETURNS int LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp AS $$ SELECT 1 $$;
${acl}`;

  it('SECURITY DEFINER com GRANT … TO anon reprova com mensagem própria ("CONCEDE")', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC;\nREVOKE EXECUTE ON FUNCTION public.f() FROM anon;\nGRANT EXECUTE ON FUNCTION public.f() TO anon;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toMatch(/CONCEDE: GRANT EXECUTE/);
    expect(r.stderr).not.toMatch(/FALTA: REVOKE/); // o revoke existe; o problema é o grant
  });

  it('SECURITY DEFINER com REVOKE de anon e GRANT só a authenticated passa', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;\nGRANT EXECUTE ON FUNCTION public.f() TO authenticated;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it('GRANT ALL … TO anon também conta como concessão pública', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;\nGRANT ALL ON FUNCTION public.f() TO anon;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toMatch(/CONCEDE/);
  });

  it('REVOKE só de PUBLIC (sem anon) continua reprovando', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toMatch(/FALTA: REVOKE/);
  });

  it('REVOKE ALL ON TABLE … FROM anon não conta como revoke da função (reprova)', () => {
    const d = prRepo(SD('CREATE TABLE public.t(id int);\nREVOKE ALL ON TABLE public.t FROM anon;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toMatch(/FALTA: REVOKE/);
  });

  it('GRANT ALL ON TABLE … TO anon não acusa a função (passa)', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;\nCREATE TABLE public.t(id int);\nGRANT ALL ON TABLE public.t TO anon;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it('GRANT EXECUTE … TO PUBLIC expõe a anon (reprova)', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;\nGRANT EXECUTE ON FUNCTION public.f() TO PUBLIC;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toMatch(/CONCEDE/);
  });

  it('marcador -- rls-helper: libera GRANT a anon (helper chamado por policy)', () => {
    const d = prRepo(SD('-- rls-helper: usada em policy de leitura pública\nGRANT EXECUTE ON FUNCTION public.f() TO anon;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  for (const [nome, x] of [
    ['ALL FUNCTIONS IN SCHEMA', 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;'],
    ['ALTER DEFAULT PRIVILEGES … ON FUNCTIONS', 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;'],
    ['ON ROUTINE', 'GRANT EXECUTE ON ROUTINE public.f() TO anon;'],
  ]) {
    it(`GRANT a anon via ${nome} reprova (CONCEDE)`, () => {
      const d = prRepo(SD(`REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;\n${x}`));
      const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main' });
      expect(r.status, r.stdout + r.stderr).toBe(1);
      expect(r.stderr).toMatch(/CONCEDE/);
    });
  }

  it('GITHUB_BASE_REF com ".." é rejeitado (exit 2)', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;'));
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main..x' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/GITHUB_BASE_REF inválido/); // não um 'base indisponível' qualquer
  });

  it('GITHUB_BASE_REF iniciado por "-" (opção do git) é rejeitado sem executar nada', () => {
    const d = prRepo(SD('REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;'));
    const marker = join(d, 'pwned');
    const r = run('check-security-definer-hardening.mjs', d, { GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: `--upload-pack=touch ${marker};true` });
    expect(r.status).toBe(2);
    expect(existsSync(marker)).toBe(false);
    expect(r.stderr).toMatch(/GITHUB_BASE_REF inválido/);
  });
});

describe('fixed-string-search', () => {
  it('erro real do rg (status 2) falha em vez de virar "nenhuma ocorrência"', () => {
    const bin = tmp('fake-rg-');
    writeFileSync(join(bin, 'rg'), '#!/bin/sh\necho "rg: erro de I/O" >&2\nexit 2\n');
    chmodSync(join(bin, 'rg'), 0o755);
    const target = tmp('fss-');
    writeFileSync(join(target, 'a.txt'), 'frase banida\n');
    const oldPath = process.env.PATH;
    process.env.PATH = `${bin}:${oldPath}`;
    try {
      expect(() => searchFixedString('frase banida', [target])).toThrow(/rg falhou \(status 2\)/);
    } finally {
      process.env.PATH = oldPath;
    }
  });
});

describe('check-restore-seller-cart-rpc', () => {
  it('5xx do PostgREST não prova que a RPC existe (STRICT reprova)', async () => {
    const server = createServer((req, res) => {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end('{"message":"upstream down"}');
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${server.address().port}`;
    try {
      // spawn assíncrono: spawnSync bloquearia o event loop e o servidor fixture (mesmo processo) nunca responderia.
      const r = await new Promise((resolveRun, reject) => {
        const child = spawn(process.execPath, [join(ROOT, 'scripts/check-restore-seller-cart-rpc.mjs')], {
          cwd: ROOT,
          env: { PATH: process.env.PATH, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'k', STRICT: '1' },
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (b) => (stdout += b));
        child.stderr.on('data', (b) => (stderr += b));
        child.on('error', reject);
        child.on('close', (status) => resolveRun({ status, stdout, stderr }));
      });
      expect(r.status).not.toBe(0);
      expect(`${r.stdout}${r.stderr}`).toMatch(/503/);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
