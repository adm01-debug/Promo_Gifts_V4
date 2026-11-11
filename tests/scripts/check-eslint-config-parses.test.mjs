/**
 * Testes para scripts/check-eslint-config-parses.mjs
 *
 * Cobre um bug real encontrado em auditoria adversarial do script (bateria
 * de ~20 cenários; evidência completa na sessão que gerou este arquivo),
 * já documentado anteriormente em `auditoria-supabase/A5_VALIDATION_REPORT.md`
 * (seção "Gate 1 Lint"): quando o parser `acorn` não pode ser carregado
 * (dependência ausente/não resolvível — ex.: checkout sem `npm install`,
 * ou mudança de hoisting no lockfile que deixa de elevar `acorn` para o
 * node_modules de topo), o script reportava:
 *
 *     x eslint.config.js NAO E JAVASCRIPT VALIDO.
 *
 * — um diagnóstico FALSO. O `eslint.config.js` em si pode estar
 * perfeitamente válido; o problema real é não conseguir carregar o próprio
 * parser. O bug era um `try` único cobrindo tanto `await import('acorn')`
 * quanto `parse(source, ...)`, tratando as duas falhas completamente
 * diferentes (dependência ausente vs. config quebrado) como se fossem a
 * mesma coisa — exatamente o tipo de mensagem que "não ajuda" que o
 * cabeçalho do próprio script diz querer evitar (ele existe para o guard
 * falhar alto E com causa certa).
 *
 * Corrigido separando o `await import('acorn')` em seu próprio try/catch,
 * ANTES do parse, com mensagem distinta ("Nao foi possivel carregar o
 * parser 'acorn'... rode npm install") que não afirma que o config está
 * inválido.
 *
 * O teste reproduz a falha de resolução do módulo copiando o script para
 * um diretório isolado em /tmp sem `node_modules` acima dele na árvore —
 * a resolução de specifiers "bare" (`import('acorn')`) do Node é relativa
 * à localização do módulo importador, não ao cwd, então isso realmente
 * impede o acorn de ser encontrado, reproduzindo o cenário de produção
 * (lockfile/hoisting diferente) sem tocar no node_modules real do repo.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-eslint-config-parses.mjs');

/** Sandbox normal (dentro do repo, com node_modules e acorn resolvíveis). */
function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(sandbox, 'package.json'), '{"type":"module"}\n');
  return sandbox;
}

function run(sandbox) {
  return spawnSync(process.execPath, [SCRIPT], { cwd: sandbox, encoding: 'utf8' });
}

// ─────────────────────────────────────────────────────────────────────────
// Sanidade: comportamento normal (documentado no cabeçalho do script) não
// foi afetado pela correção.
// ─────────────────────────────────────────────────────────────────────────

test('config valido (array nao-vazio) passa com exit 0', () => {
  const sandbox = makeSandbox('eslint-parses-ok-');
  try {
    writeFileSync(join(sandbox, 'eslint.config.js'), 'export default [{ rules: {} }];\n');
    const result = run(sandbox);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toMatch(/ok eslint\.config\.js/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('erro de sintaxe real no config ainda é reportado como "NAO E JAVASCRIPT VALIDO" (exit 1)', () => {
  const sandbox = makeSandbox('eslint-parses-syntax-');
  try {
    writeFileSync(join(sandbox, 'eslint.config.js'), 'export default [\n  { rules: { ) } }\n];\n');
    const result = run(sandbox);
    const combined = result.stdout + result.stderr;
    expect(result.status).toBe(1);
    expect(combined).toMatch(/NAO E JAVASCRIPT VALIDO/);
    expect(combined).toMatch(/Unexpected token/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('armadilha conhecida (asterisco+barra no meio de comentario JSDoc) ainda aponta a CAUSA', () => {
  const sandbox = makeSandbox('eslint-parses-jsdoc-trap-');
  try {
    writeFileSync(
      join(sandbox, 'eslint.config.js'),
      '/**\n * Regra para src/components/**/*List*\n */\nexport default [{ rules: {} }];\n',
    );
    const result = run(sandbox);
    const combined = result.stdout + result.stderr;
    expect(result.status).toBe(1);
    expect(combined).toMatch(/NAO E JAVASCRIPT VALIDO/);
    expect(combined).toMatch(/CAUSA: um asterisco seguido de barra/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug real: acorn não resolvível != config inválido.
// ─────────────────────────────────────────────────────────────────────────

test(
  'acorn nao resolvivel NAO deve ser reportado como "eslint.config.js NAO E JAVASCRIPT VALIDO" ' +
    '(config valido, so o parser nao carregou)',
  () => {
    // Script isolado em diretório sem node_modules acima dele: import('acorn')
    // bare specifier falha a resolver, reproduzindo dependência ausente/não
    // hoisted sem tocar no node_modules real do repo.
    const isolatedDir = mkdtempSync(join(tmpdir(), 'eslint-parses-isolated-script-'));
    const sandbox = makeSandbox('eslint-parses-no-acorn-');
    try {
      const isolatedScript = join(isolatedDir, 'check-eslint-config-parses.mjs');
      cpSync(SCRIPT, isolatedScript);

      // Config perfeitamente válido — o bug não está aqui.
      writeFileSync(join(sandbox, 'eslint.config.js'), 'export default [{ rules: {} }];\n');

      const result = spawnSync(process.execPath, [isolatedScript], { cwd: sandbox, encoding: 'utf8' });
      const combined = result.stdout + result.stderr;

      // Continua falhando (fail-closed: sem acorn, não há como garantir que
      // o config é válido), mas a mensagem não pode afirmar que o config
      // esta quebrado quando o problema real é o parser não ter carregado.
      expect(result.status).toBe(1);
      expect(combined).not.toMatch(/NAO E JAVASCRIPT VALIDO/);
      expect(combined).toMatch(/acorn/);
      expect(combined).toMatch(/npm install/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
      rmSync(isolatedDir, { recursive: true, force: true });
    }
  },
);
