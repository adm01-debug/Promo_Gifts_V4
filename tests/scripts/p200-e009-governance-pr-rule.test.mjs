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

    expect(rule).toMatch(/`.github\/\*\*`[\s\S]*por PR para `main`/);
    expect(rule).toMatch(/push direto para `main`/);
    expect(rule).not.toContain('git push ao final');
  });
});
