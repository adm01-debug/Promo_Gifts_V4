// Testa scripts/check-allowlist-memory-crosscheck.mjs, o gate que garante que
// toda allowlist de segurança em .security/*-allowlist.json tenha um
// `documented_in` que resolva para um arquivo real (ou caia no doc canônico
// docs/security/ALLOWLISTS_MEMORY.md) e que cada entrada tenha `fn`/`slug` +
// `reason` não-vazio/não-TODO referenciado nesse documento.
//
// Bug encontrado por teste adversarial (cenário: diretório `.security/`
// ausente): o script fazia `readdirSync(SEC_DIR)` sem try/catch, então um
// checkout sem `.security/` (worktree raso, sparse-checkout, diretório
// errado) crashava com stack trace bruto do Node e exit code 1 — o mesmo
// código já usado para "achou problema real de documentação", então o CI não
// conseguia distinguir "gate não rodou" de "gate reprovou de verdade". Mesmo
// padrão já corrigido em scripts/audit-credentials.mjs (commit c7476fd):
// try/catch ao redor da leitura, mensagem `❌` limpa e exit 2 (erro
// operacional), reservando exit 1 para falhas reais de cross-check.
//
// Padrão de teste espelha tests/scripts/check-anon-write-grants.test.mjs:
// o script não exporta funções puras (roda tudo no top-level do módulo), então
// os testes invocam o CLI real via spawnSync contra fixtures isoladas em
// diretórios temporários do SO — nunca contra .security/ ou docs/ reais fora
// do teste de sanidade explícito.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-allowlist-memory-crosscheck.mjs');

const tempRoots = [];
afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function run(cwd) {
  return spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' });
}

function writeAllowlist(root, name, data) {
  mkdirSync(join(root, '.security'), { recursive: true });
  writeFileSync(join(root, '.security', name), JSON.stringify(data));
}

function writeDoc(root, relPath, content) {
  mkdirSync(dirname(join(root, relPath)), { recursive: true });
  writeFileSync(join(root, relPath), content);
}

// ─── Regressão: .security/ ausente não deve crashar ────────────────────────

describe('.security/ ausente (bug real corrigido)', () => {
  it('sai com exit 2 e mensagem ❌ limpa, sem stack trace bruto do Node', () => {
    const root = fixtureRoot('allowlist-crosscheck-missing-secdir-');
    const result = run(root);
    expect(result.status).toBe(2);
    const out = (result.stdout || '') + (result.stderr || '');
    expect(out).toContain('❌');
    expect(out).toContain('.security');
    // Não deve escapar um uncaught-exception stack trace do Node.
    expect(out).not.toMatch(/at readdirSync/);
    expect(out).not.toMatch(/Node\.js v\d/);
  });

  it('exit 2 (erro operacional) é distinto de exit 1 (achado real de cross-check)', () => {
    const missing = run(fixtureRoot('allowlist-crosscheck-missing-secdir-2-'));
    expect(missing.status).toBe(2);

    const withRealFinding = fixtureRoot('allowlist-crosscheck-real-finding-');
    writeAllowlist(withRealFinding, 'foo-allowlist.json', {
      documented_in: 'docs/nope.md',
      functions: [],
    });
    const realFinding = run(withRealFinding);
    expect(realFinding.status).toBe(1);

    expect(missing.status).not.toBe(realFinding.status);
  });
});

// ─── .security/ existente mas vazio: nada para checar, passa ───────────────

describe('.security/ existente e vazio', () => {
  it('sai com exit 0 (nenhuma allowlist para validar)', () => {
    const root = fixtureRoot('allowlist-crosscheck-empty-secdir-');
    mkdirSync(join(root, '.security'), { recursive: true });
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('🎉');
  });
});

// ─── JSON inválido ──────────────────────────────────────────────────────────

describe('allowlist com JSON malformado', () => {
  it('reporta erro e sai com exit 1 sem crashar', () => {
    const root = fixtureRoot('allowlist-crosscheck-bad-json-');
    mkdirSync(join(root, '.security'), { recursive: true });
    writeFileSync(join(root, '.security', 'foo-allowlist.json'), '{ invalid');
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JSON inválido');
  });

  it('arquivo vazio (0 bytes) também é tratado como JSON inválido, não crash', () => {
    const root = fixtureRoot('allowlist-crosscheck-empty-file-');
    mkdirSync(join(root, '.security'), { recursive: true });
    writeFileSync(join(root, '.security', 'foo-allowlist.json'), '');
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JSON inválido');
  });
});

// ─── documented_in ausente ou não resolvível ────────────────────────────────

describe('documented_in', () => {
  it('falha quando o campo documented_in está ausente', () => {
    const root = fixtureRoot('allowlist-crosscheck-no-docref-');
    writeAllowlist(root, 'foo-allowlist.json', { functions: [] });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("falta campo 'documented_in'");
  });

  it('falha quando documented_in não resolve e não há doc canônico de fallback', () => {
    const root = fixtureRoot('allowlist-crosscheck-docref-missing-');
    writeAllowlist(root, 'foo-allowlist.json', { documented_in: 'docs/nope.md', functions: [] });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("não resolve para arquivo");
  });

  it('usa docs/security/ALLOWLISTS_MEMORY.md como fallback quando o doc específico não existe', () => {
    const root = fixtureRoot('allowlist-crosscheck-fallback-doc-');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/nope.md',
      functions: [{ fn: 'public.foo()', reason: 'x' }],
    });
    writeDoc(root, 'docs/security/ALLOWLISTS_MEMORY.md', 'texto que menciona foo aqui');
    const result = run(root);
    expect(result.status).toBe(0);
  });
});

// ─── Entradas: fn/slug, reason, TODO ────────────────────────────────────────

describe('entradas de functions[]', () => {
  function rootWithDoc(prefix, docContent) {
    const root = fixtureRoot(prefix);
    writeDoc(root, 'docs/security/ALLOWLISTS_MEMORY.md', docContent);
    return root;
  }

  it('snapshot vazio (0 entradas) passa sempre — travamento anti-regressão', () => {
    const root = rootWithDoc('allowlist-crosscheck-zero-entries-', 'sem nada relevante');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [],
    });
    const result = run(root);
    expect(result.status).toBe(0);
  });

  it('falha quando uma entrada não tem fn nem slug', () => {
    const root = rootWithDoc('allowlist-crosscheck-no-identity-', 'doc');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [{ reason: 'x' }],
    });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("sem 'fn' ou 'slug'");
  });

  it('falha quando reason está vazio/só espaços', () => {
    const root = rootWithDoc('allowlist-crosscheck-empty-reason-', 'foo');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [{ fn: 'public.foo()', reason: '   ' }],
    });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("sem 'reason'");
  });

  it('falha quando reason começa com TODO', () => {
    const root = rootWithDoc('allowlist-crosscheck-todo-reason-', 'foo');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [{ fn: 'public.foo()', reason: 'TODO: explicar depois' }],
    });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('reason TODO');
  });

  it('falha quando a identidade (fn/slug) não aparece no documento referenciado', () => {
    const root = rootWithDoc('allowlist-crosscheck-not-referenced-', 'conteúdo sem relação alguma');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [{ fn: 'public.bar()', reason: 'x' }],
    });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não referenciado no documento declarado');
  });

  it('passa quando fn do tipo public.foo(...) é documentado pelo short name "foo"', () => {
    const root = rootWithDoc('allowlist-crosscheck-fn-shortname-', 'a função foo está documentada aqui');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [{ fn: 'public.foo(a, b)', reason: 'x' }],
    });
    const result = run(root);
    expect(result.status).toBe(0);
  });

  it('passa quando slug de edge function é documentado literalmente', () => {
    const root = rootWithDoc('allowlist-crosscheck-slug-', 'a edge function minha-funcao está documentada');
    writeAllowlist(root, 'foo-allowlist.json', {
      documented_in: 'docs/security/ALLOWLISTS_MEMORY.md',
      functions: [{ slug: 'minha-funcao', reason: 'x' }],
    });
    const result = run(root);
    expect(result.status).toBe(0);
  });
});

// ─── Integração: allowlists reais do repo ───────────────────────────────────

describe('allowlists reais do repo', () => {
  it('passa (exit 0) contra o estado atual de .security/ e docs/security/', () => {
    const result = run(ROOT);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('🎉');
  });
});
