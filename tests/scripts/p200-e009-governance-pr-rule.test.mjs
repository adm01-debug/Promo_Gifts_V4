import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function instructionBody(path) {
  const content = readFileSync(resolve(ROOT, path), 'utf8');
  const marker = '# CONTEXTO DO PROJETO';
  const markerIndex = content.indexOf(marker);
  expect(markerIndex, `${path} contém o marcador do corpo espelhado`).toBeGreaterThanOrEqual(0);
  return content.slice(markerIndex);
}

describe('P200 E009 — governança de alterações críticas por PR', () => {
  it('mantém o espelho AGENTS.md idêntico ao corpo de CLAUDE.md', () => {
    expect(instructionBody('AGENTS.md')).toBe(instructionBody('CLAUDE.md'));
  });

  it('exige PR para governança crítica e proíbe push direto em main', () => {
    const claude = readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8');
    const rule = claude.slice(claude.indexOf('## REGRA #9 —'), claude.indexOf('## REGRA #10 —'));

    for (const path of ['`.github/**`', '`CODEOWNERS`', '`supabase/migrations/**`', '`scripts/check-*`', '`.gitleaks.toml`']) {
      expect(rule, `caminho protegido: ${path}`).toContain(path);
    }
    expect(rule).toMatch(/por PR para `main`/);
    expect(rule).toMatch(/push direto para `main`/);
    expect(rule).toMatch(/incidente ativo[\s\S]*PR emergencial[\s\S]*gates/);
    expect(rule).not.toContain('git push ao final');
  });

  it('não reintroduz a exceção de push direto por incidente no R5 do plano', () => {
    const plan = readFileSync(resolve(ROOT, 'docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md'), 'utf8');
    const start = plan.indexOf('**R5 — PR obrigatório');
    const end = plan.indexOf('**R6 —', start);
    const r5 = plan.slice(start, end);

    expect(r5).toContain('Push direto em `main` é proibido');
    expect(r5).toMatch(/PR de reversão\/correção/);
    expect(r5).not.toMatch(/Push direto em `main` só para reverter incidente/);
  });
});
