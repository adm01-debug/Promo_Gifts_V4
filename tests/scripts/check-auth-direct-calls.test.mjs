import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-auth-direct-calls.mjs');

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')} falhou: ${r.stderr}`);
  return r.stdout;
}

/** Cria um repo git temporário com os arquivos dados já commitados. */
function makeRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'auth-gate-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'a@a.com']);
  git(dir, ['config', 'user.name', 'a']);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

function runGate(dir) {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

test('detecta chamada direta fora do SSOT', () => {
  const dir = makeRepo({
    'src/components/Login.ts':
      "import { supabase } from '../lib/sb';\nsupabase.auth.signInWithPassword({});\n",
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/components\/Login\.ts/);
    assert.match(r.out, /signInWithPassword/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignora o SSOT real (src/services/authService.ts) e diretórios allowlistados', () => {
  const dir = makeRepo({
    'src/services/authService.ts':
      "import { supabase } from '../lib/sb';\nexport const signOutSafe = () => supabase.auth.signOut();\n",
    'src/lib/auth/wrapper.ts':
      "import { supabase } from '../sb';\nexport const w = () => supabase.auth.signOut();\n",
    'src/integrations/supabase/client.ts': 'export const supabase = {};\nsupabase.auth.signOut();\n',
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: ALLOWLIST_PREFIXES usava `f.startsWith(p)` também para a
// entrada de arquivo único 'src/services/authService.ts'. Como
// 'authService.tsx'.startsWith('authService.ts') é true, um arquivo IRMÃO com
// esse prefixo (ex.: authService.tsx) escapava do gate — falso-negativo. Sem o
// fix, este teste falha (o gate não detecta a chamada e sai com code 0).
test('NÃO deixa passar um arquivo cujo nome só compartilha prefixo com o SSOT (authService.tsx)', () => {
  const dir = makeRepo({
    'src/services/authService.tsx':
      "import { supabase } from '../lib/sb';\nexport const sneaky = () => supabase.auth.signOut();\n",
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /src\/services\/authService\.tsx/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Bug real encontrado: `git ls-files` lista arquivos do índice mesmo que tenham
// sido removidos do working tree (ex.: removidos/renomeados por outro processo
// durante o CI). O `readFileSync` correspondente lançava ENOENT sem try/catch,
// derrubando o processo com stack trace crua em vez do relatório do gate. Sem
// o fix, este teste falha (status !== 0 vira uma exceção não tratada do Node,
// cujo stderr não contém a mensagem de aviso esperada).
test('não quebra quando um arquivo listado pelo git some do disco antes da leitura (race condition)', () => {
  const dir = makeRepo({
    'src/components/A.ts': "export const a = 1;\n",
    'src/components/B.ts': "export const b = 2;\n",
  });
  try {
    // Remove apenas do disco — o índice git ainda o lista via `git ls-files`.
    unlinkSync(join(dir, 'src/components/A.ts'));
    const r = runGate(dir);
    assert.equal(r.code, 0);
    assert.doesNotMatch(r.out, /ENOENT[\s\S]*at readFileSync|Error: ENOENT/);
    assert.match(r.out, /Não foi possível ler/);
    assert.match(r.out, /src\/components\/A\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignora arquivos de teste', () => {
  const dir = makeRepo({
    'src/__tests__/foo.ts': "import { supabase } from '../lib/sb';\nsupabase.auth.signOut();\n",
    'src/bar.test.ts': "import { supabase } from './lib/sb';\nsupabase.auth.signOut();\n",
  });
  try {
    const r = runGate(dir);
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
