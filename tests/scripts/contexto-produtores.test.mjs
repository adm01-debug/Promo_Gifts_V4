// Contexto para agentes de IA (.github/workflows/contexto.yml) — adaptador do Gate 2.
//
// Os três produtores (scripts/ai-context, scripts/supabase_snapshot, scripts/regras_negocio) têm suítes
// próprias (node:test e unittest) copiadas do Zapp_Web_V2. Este arquivo as executa dentro do
// `npm run test:ci-core`, para que um PR que quebre um produtor fique vermelho antes de chegar à main
// (o workflow só roda em main). Também trava as invariantes do workflow que, se regredirem, quebram
// outro gate ou escrevem onde não devem. Nenhum teste acessa banco, rede ou API.
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'contexto.yml');
const yaml = createRequire(import.meta.url)('js-yaml');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  return { status: r.status, saida: `${r.stdout || ''}\n${r.stderr || ''}`.slice(-4000), erro: r.error };
}

describe('suítes dos produtores', () => {
  it('ai-context: node --test scripts/ai-context/gerar.unit.mjs', () => {
    const r = run(process.execPath, ['--test', 'scripts/ai-context/gerar.unit.mjs']);
    expect(r.erro, r.saida).toBeUndefined();
    expect(r.status, r.saida).toBe(0);
  }, 120_000);

  it('regras_negocio: python3 scripts/regras_negocio/test_generate.py', () => {
    const r = run('python3', ['scripts/regras_negocio/test_generate.py']);
    expect(r.erro, r.saida).toBeUndefined();
    expect(r.status, r.saida).toBe(0);
  }, 120_000);

  it('supabase_snapshot: python3 scripts/supabase_snapshot/test_snapshot.py (conexão simulada)', () => {
    const r = run('python3', ['scripts/supabase_snapshot/test_snapshot.py']);
    expect(r.erro, r.saida).toBeUndefined();
    expect(r.status, r.saida).toBe(0);
  }, 120_000);
});

describe('indice.py monta o 00-INDEX.md a partir dos manifests', () => {
  it('lista as três fontes e marca a que ainda não foi gerada', () => {
    const dir = mkdtempSync(join(tmpdir(), 'contexto-indice-'));
    try {
      const agora = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      for (const fonte of ['codigo', 'regras']) {
        mkdirSync(join(dir, 'docs/contexto', fonte), { recursive: true });
        writeFileSync(join(dir, 'docs/contexto', fonte, 'INDEX.md'), '# fixture\n');
        writeFileSync(
          join(dir, 'docs/contexto', fonte, 'manifest.json'),
          JSON.stringify({ gerado_em: agora, commit: 'abc1234', entrada: 'INDEX.md', arquivos: ['INDEX.md'] }),
        );
      }
      const r = run('python3', [
        'scripts/regras_negocio/indice.py', '--repo', dir, '--out', 'docs/contexto/00-INDEX.md', '--head', 'abc1234',
        '--fonte', 'banco real=docs/contexto/supabase',
        '--fonte', 'código=docs/contexto/codigo',
        '--fonte', 'regras de negócio=docs/contexto/regras',
      ]);
      expect(r.status, r.saida).toBe(0);
      const indice = readFileSync(join(dir, 'docs/contexto/00-INDEX.md'), 'utf8');
      expect(indice).toContain('docs/contexto/codigo/INDEX.md');
      expect(indice).toContain('docs/contexto/supabase/');
      expect(indice).toMatch(/banco real[^\n]*ainda não/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('invariantes do contexto.yml', () => {
  const texto = readFileSync(WORKFLOW, 'utf8');
  const doc = yaml.load(texto);

  it('não usa SUPABASE_ACCESS_TOKEN (Gate E89: cron horário colidiria com os crons privilegiados)', () => {
    expect(texto).not.toMatch(/secrets\.SUPABASE_ACCESS_TOKEN\b/);
    expect(texto).not.toMatch(/secrets\.SUPABASE_SERVICE_ROLE_KEY\b/);
  });

  it('não roda em pull_request (o job publicar tem contents: write e faz git push)', () => {
    expect(Object.keys(doc.on)).not.toContain('pull_request');
    expect(Object.keys(doc.on)).not.toContain('pull_request_target');
  });

  it('publica só na branch gerada contexto, nunca na main', () => {
    expect(doc.env.CONTEXTO_BRANCH).toBe('contexto');
    const publicar = doc.jobs.publicar.steps.map((s) => s.run || '').join('\n');
    expect(publicar).toContain('git push --quiet "$REMOTE" "HEAD:refs/heads/$CONTEXTO_BRANCH"');
    expect(texto).not.toMatch(/refs\/heads\/main["\s]/);
    expect(doc.jobs.gate.if).toBe("github.ref == 'refs/heads/main'");
  });

  it('banco: sessão pelas variáveis PG* com URI vazia (sem connection string com senha)', () => {
    const banco = doc.jobs.banco.steps.find((s) => s.name === 'Gerar supabase/');
    expect(banco.env.PGSSLMODE).toBe('require');
    expect(banco.run).toContain("SUPABASE_DB_URL='postgresql://' python3 scripts/supabase_snapshot/snapshot.py");
    expect(texto).not.toMatch(/postgres(ql)?:\/\/[^'\s]*:[^'\s@]+@/);
  });

  it('cron em lista de minutos (o ci-cron-table.mjs não entende faixa com passo)', () => {
    for (const { cron } of doc.on.schedule) expect(cron).not.toMatch(/\d-\d+\//);
  });
});
