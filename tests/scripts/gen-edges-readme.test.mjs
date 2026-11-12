// Testes para scripts/gen-edges-readme.mjs.
//
// Bug real encontrado em auditoria adversarial: o script monta, para cada
// diretório de `supabase/functions/<nome>`, um comando `grep` como STRING
// interpolada e passa essa string para `execSync` (que executa via `/bin/sh
// -c <string>`). O nome do diretório (`dir`, vindo de `readdirSync`, que só
// proíbe `/` e NUL — qualquer outro caractere é um nome de diretório válido
// no Linux) era interpolado direto nessa string sem nenhum escaping de
// shell.
//
// Prova de exploração (fora deste teste, em /tmp, nunca em dados reais):
// criar `supabase/functions/$(touch PWNED_HERE)/` e rodar
// `node scripts/gen-edges-readme.mjs` a partir da raiz do repo fazia o
// `/bin/sh` executar `touch PWNED_HERE` via command substitution — command
// injection real (CWE-78), não apenas teórico: um nome de função de edge
// malicioso (ex.: injetado por uma PR ou por um commit direto do bot
// Lovable em `main`, que o AGENTS.md documenta como fluxo existente) levava
// a execução arbitrária de comando na máquina/CI que gera o README.
//
// Corrigido trocando `execSync` (string via shell) por `execFileSync`
// ('grep', [argv...]) — sem shell, o nome do diretório nunca é
// reinterpretado como código; mantém o grep -E mas escapa os
// metacaracteres de regex do nome antes de montar o pattern.
import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/gen-edges-readme.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * Monta um sandbox mínimo com a estrutura que o script espera:
 * supabase/functions/_shared/edge-authz-manifest.ts + src/.
 * Não precisa copiar o script: `ROOT = process.cwd()` dentro dele, então
 * basta rodar com `cwd` apontando pro sandbox.
 */
function buildSandbox() {
  const sbx = mkdtempSync(join(tmpdir(), 'gen-edges-readme-sbx-'));
  temporaryRoots.push(sbx);
  mkdirSync(join(sbx, 'supabase/functions/_shared'), { recursive: true });
  mkdirSync(join(sbx, 'src'), { recursive: true });
  writeFileSync(
    join(sbx, 'supabase/functions/_shared/edge-authz-manifest.ts'),
    'export const EDGE_AUTHZ_MANIFEST = {};\n',
  );
  return sbx;
}

function addFunctionDir(sbx, name, indexContent = 'export default function handler() {}\n') {
  const dir = join(sbx, 'supabase/functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), indexContent);
}

function run(sbx) {
  const result = spawnSync(process.execPath, [REAL_SCRIPT], { cwd: sbx, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('gen-edges-readme.mjs — nome de edge function malicioso', () => {
  it('não executa comando injetado via nome de diretório (command injection)', () => {
    const sbx = buildSandbox();
    // Payload sem '/' (nome de diretório não pode conter '/'); se a shell
    // reinterpretar o `$(...)` dentro da string do grep, cria o marcador
    // no cwd do processo (o próprio sandbox).
    const maliciousName = '$(touch PWNED_HERE)';
    addFunctionDir(sbx, maliciousName);

    const { code, stdout, stderr } = run(sbx);

    // Antes da correção: o `/bin/sh -c` do execSync executava o `touch`
    // embutido no nome do diretório e criava este arquivo.
    expect(existsSync(join(sbx, 'PWNED_HERE'))).toBe(false);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    // O nome continua aparecendo no catálogo gerado, como texto literal
    // (comportamento correto: documentar a função, sem executar nada nela).
    expect(stdout).toContain('$(touch PWNED_HERE)');
  });

  it('continua detectando um caller real no front (sem regressão)', () => {
    const sbx = buildSandbox();
    addFunctionDir(sbx, 'minha-func');
    mkdirSync(join(sbx, 'src/hooks'), { recursive: true });
    writeFileSync(
      join(sbx, 'src/hooks/useX.ts'),
      "supabase.functions.invoke('minha-func', { body: {} });\n",
    );

    const { code, stdout, stderr } = run(sbx);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/`minha-func`[^\n]*\|\s*1\s*\|/);
  });
});
