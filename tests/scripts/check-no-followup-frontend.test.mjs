/**
 * Tests for scripts/check-no-followup-frontend.mjs
 *
 * Bug found during adversarial testing: PATTERN = /follow[-_]?up|needsFollowUp/i
 * only matched "follow-up", "follow_up" and "followup" — it did NOT match
 * "follow up" (space-separated), a plausible real UI-copy variant. The
 * complementary runtime guard for the same feature
 * (src/components/quotes/__tests__/QuotesStatusChips.no-followup.test.tsx)
 * already uses /follow[-_ ]?up|followup|needsFollowUp/i, which DOES include
 * the space. This static gate was out of sync with its own sibling guard,
 * creating a false-negative: a string like "Fazer follow up do cliente"
 * added to src/ would pass this gate silently.
 *
 * Fix: PATTERN now includes the space in the separator class:
 *   /follow[-_ ]?up|needsFollowUp/i
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own src/.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/check-no-followup-frontend.mjs');

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'check-no-followup-frontend-test-'));
  tempRoots.push(root);
  return root;
}

function writeSrcFile(root, relPath, content) {
  const full = join(root, 'src', relPath);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content);
  return full;
}

function run(root, args = ['src']) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('check-no-followup-frontend — comportamento base', () => {
  it('exit 0 e mensagem de sucesso quando não há ocorrências', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'Foo.tsx', 'export function Foo() { return null; }\n');
    const r = run(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Nenhuma ocorrência');
  });

  it('exit 1 e lista a ocorrência para "follow-up"', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'Bad.tsx', 'const label = "Follow-up pendente";\n');
    const r = run(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`${join('src', 'Bad.tsx')}:1`);
  });

  it('detecta needsFollowUp, followup e follow_up', () => {
    const root = makeFixtureRoot();
    writeSrcFile(
      root,
      'Variants.ts',
      'const needsFollowUp = true;\nconst a = "followup";\nconst b = "follow_up";\n',
    );
    const r = run(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('3 ocorrência');
  });
});

describe('check-no-followup-frontend — bug: variante "follow up" com espaço', () => {
  it('detecta "follow up" (separado por espaço) — falso-negativo antes da correção', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'Space.tsx', 'const label = "Follow Up pendente";\n');
    const r = run(root);
    // Sem a correção do PATTERN, isto falhava: status 0 e "Nenhuma ocorrência".
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`${join('src', 'Space.tsx')}:1`);
  });

  it('mantém consistência com o PATTERN do guard irmão (QuotesStatusChips.no-followup.test.tsx)', () => {
    // O guard de runtime usa /follow[-_ ]?up|followup|needsFollowUp/i. Este
    // gate estático deve capturar o mesmo universo de variantes de espaçador.
    const root = makeFixtureRoot();
    writeSrcFile(root, 'AllSeparators.ts', [
      'const a = "follow up";',
      'const b = "follow-up";',
      'const c = "follow_up";',
      'const d = "followup";',
    ].join('\n') + '\n');
    const r = run(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('4 ocorrência');
  });
});

describe('check-no-followup-frontend — SKIP_FILES e SKIP_DIRS', () => {
  it('ignora node_modules', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'ok.ts', 'const a = 1;\n');
    const nodeModulesFile = join(root, 'src', 'node_modules', 'pkg', 'index.js');
    mkdirSync(resolve(nodeModulesFile, '..'), { recursive: true });
    writeFileSync(nodeModulesFile, 'const x = "follow-up";\n');
    const r = run(root);
    expect(r.status).toBe(0);
  });

  it('ignora src/integrations/supabase/types.ts (allowlist explícita)', () => {
    const root = makeFixtureRoot();
    writeSrcFile(
      root,
      'integrations/supabase/types.ts',
      '// tabela follow_up_reminders\nexport type X = {};\n',
    );
    const r = run(root);
    expect(r.status).toBe(0);
  });
});

describe('check-no-followup-frontend — robustez / erros', () => {
  it('exit 2 com mensagem clara quando o ROOT não existe', () => {
    const root = makeFixtureRoot();
    const r = run(root, ['src-inexistente']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('Falha ao escanear');
  });

  it('aceita ROOT apontando para um único arquivo (não diretório)', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'single.tsx', 'const z = "followup";\n');
    const r = run(root, [join('src', 'single.tsx')]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`${join('src', 'single.tsx')}:1`);
  });

  it('não quebra com arquivo vazio', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'empty.ts', '');
    const r = run(root);
    expect(r.status).toBe(0);
  });

  it('lida com CRLF sem perder a detecção', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'crlf.ts', 'const x = 1;\r\nconst label = "followup";\r\n');
    const r = run(root);
    expect(r.status).toBe(1);
  });

  it('lida com BOM UTF-8 na primeira linha sem perder a detecção', () => {
    const root = makeFixtureRoot();
    const full = join(root, 'src', 'bom.ts');
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, Buffer.from('﻿const a = "follow-up";\n', 'utf8'));
    const r = run(root);
    expect(r.status).toBe(1);
  });

  it('ignora argumentos extras após o ROOT', () => {
    const root = makeFixtureRoot();
    writeSrcFile(root, 'ok.ts', 'const a = 1;\n');
    const r = run(root, ['src', 'extra', '--flag']);
    expect(r.status).toBe(0);
  });
});
