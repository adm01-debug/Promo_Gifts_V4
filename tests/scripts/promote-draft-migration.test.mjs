// Testa scripts/promote-draft-migration.mjs — promoção de rascunho de
// qa/migrations-draft/ para supabase/migrations/.
import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { parseHandleList, parsePositiveInt, validateHandles } from '../../scripts/promote-draft-migration.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/promote-draft-migration.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('promote-draft-migration — erro amigável quando qa/migrations-draft/ não existe', () => {
  it('reporta "Diretório inexistente" (exit 1) em vez de crashar com ENOENT cru, mesmo sem --file', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'promo-gifts-promote-draft-'));
    temporaryRoots.push(cwd);

    // Nenhum argumento de arquivo e nenhum diretório qa/migrations-draft/ —
    // antes da correção, usage() chamava readdirSync(DRAFT_DIR) antes do
    // existsSync(DRAFT_DIR), crashando com stack trace ENOENT cru.
    const result = spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Diretório inexistente');
    expect(result.stdout + result.stderr).not.toContain('ENOENT');
    expect(result.stdout + result.stderr).not.toContain('at readdirSync');
  });
});

describe('parseHandleList / parsePositiveInt / validateHandles (unidades, sem I/O)', () => {
  it('parseHandleList separa por vírgula e espaço, removendo vazios', () => {
    expect(parseHandleList('alice, bob  carol')).toEqual(['alice', 'bob', 'carol']);
    expect(parseHandleList('')).toEqual([]);
    expect(parseHandleList(undefined)).toEqual([]);
  });

  it('parsePositiveInt aceita vazio como default e rejeita não-positivo', () => {
    expect(parsePositiveInt(undefined, 60_000)).toBe(60_000);
    expect(parsePositiveInt('120', 60_000)).toBe(120);
    expect(Number.isNaN(parsePositiveInt('-5', 60_000))).toBe(true);
    expect(Number.isNaN(parsePositiveInt('abc', 60_000))).toBe(true);
  });

  it('validateHandles rejeita handle inválido e duplicado', () => {
    expect(validateHandles('reviewers', ['alice', 'bob'])).toBeNull();
    expect(validateHandles('reviewers', ['alice bob'])).toMatch(/inválido/);
    expect(validateHandles('reviewers', ['alice', 'alice'])).toMatch(/duplicadas/);
  });
});
