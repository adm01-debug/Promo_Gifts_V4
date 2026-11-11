// Testa scripts/check-headers-mirror.mjs, o gate que garante que
// public/_headers e vercel.json tenham o mesmo valor de
// Content-Security-Policy byte a byte.
//
// O script resolve ROOT via import.meta.url (não via process.cwd()), então
// para testar com fixtures diferentes é preciso copiar o próprio script para
// um repo-fixture temporário e executá-lo de lá — mesmo padrão de integração
// real via spawnSync usado em tests/scripts/check-edge-cors-headers.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/check-headers-mirror.mjs');

const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'";

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'headers-mirror-gate-'));
  temporaryRoots.push(dir);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'public'), { recursive: true });
  copyFileSync(REAL_SCRIPT, join(dir, 'scripts', 'check-headers-mirror.mjs'));
  return dir;
}

function writeVercel(dir, vercelJsonObjOrString) {
  const content =
    typeof vercelJsonObjOrString === 'string' ? vercelJsonObjOrString : JSON.stringify(vercelJsonObjOrString);
  writeFileSync(join(dir, 'vercel.json'), content);
}

function writeHeaders(dir, csp) {
  writeFileSync(join(dir, 'public', '_headers'), `# comentário\nContent-Security-Policy: ${csp}\n`);
}

function vercelWithCSP(csp) {
  return { headers: [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: csp }] }] };
}

function runGate(dir) {
  return spawnSync('node', [join(dir, 'scripts', 'check-headers-mirror.mjs')], {
    encoding: 'utf8',
    timeout: 10000,
  });
}

describe('check-headers-mirror — comportamento básico', () => {
  it('passa (exit 0) quando o CSP é idêntico nos dois arquivos', () => {
    const dir = tempRepo();
    writeVercel(dir, vercelWithCSP(CSP));
    writeHeaders(dir, CSP);
    const r = runGate(dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/CSP == vercel\.json/);
  });

  it('falha (exit 1) e mostra diff cirúrgico quando o CSP diverge', () => {
    const dir = tempRepo();
    writeVercel(dir, vercelWithCSP(CSP));
    writeHeaders(dir, CSP.replace('unsafe-inline', 'unsafe-eval'));
    const r = runGate(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/diverge de vercel\.json/);
    expect(r.stderr).toMatch(/Primeira divergência no char/);
  });

  it('falha (exit 1) quando public/_headers não tem linha Content-Security-Policy', () => {
    const dir = tempRepo();
    writeVercel(dir, vercelWithCSP(CSP));
    writeFileSync(join(dir, 'public', '_headers'), '# só comentário\n');
    const r = runGate(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/linha Content-Security-Policy não encontrada/);
  });

  it('falha (exit 1) quando vercel.json não tem nenhum bloco com Content-Security-Policy', () => {
    const dir = tempRepo();
    writeVercel(dir, { headers: [{ source: '/x', headers: [{ key: 'X-Foo', value: 'bar' }] }] });
    writeHeaders(dir, CSP);
    const r = runGate(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/nenhum bloco com Content-Security-Policy/);
  });
});

// ─── regressão: bloco CSP em vercel.json sem a chave "value" ───────────────
//
// Antes do fix, getVercelCSP() retornava `entry.value` sem validar (podendo
// ser `undefined`). O valor undefined != headersCSP, então o script entrava
// no branch de erro e tentava `vercelCSP.match(...)` — TypeError não tratado
// no ponto de uso, capturado só pelo try/catch externo, produzindo uma saída
// confusa (imprime "diverge de vercel.json!" e, na mesma chamada, "Erro ao
// ler arquivos: Cannot read properties of undefined (reading 'match')"),
// embora o exit code 1 já estivesse correto. O fix valida `entry.value` em
// getVercelCSP() e lança um erro claro antes de chegar no diff.
describe('check-headers-mirror — regressão: bloco CSP sem "value" em vercel.json', () => {
  it('falha com mensagem clara, sem o diff cirúrgico (que exigiria strings)', () => {
    const dir = tempRepo();
    // bloco existe e tem a key certa, mas falta "value" (erro de edição/merge)
    writeVercel(dir, { headers: [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy' }] }] });
    writeHeaders(dir, CSP);
    const r = runGate(dir);

    expect(r.status).toBe(1);
    // Sem o fix, essa mensagem (TypeError ao chamar .match em undefined)
    // aparecia no lugar da mensagem clara abaixo.
    expect(r.stderr).not.toMatch(/Cannot read properties of undefined/);
    expect(r.stderr).toMatch(/vercel\.json: bloco Content-Security-Policy sem "value"/);
    // E não deve imprimir o cabeçalho de "diverge" seguido de um crash —
    // o erro é detectado antes de tentar montar o diff.
    expect(r.stderr).not.toMatch(/diverge de vercel\.json/);
  });

  it('mesma regressão quando "value" é null (não apenas ausente)', () => {
    const dir = tempRepo();
    writeVercel(dir, {
      headers: [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: null }] }],
    });
    writeHeaders(dir, CSP);
    const r = runGate(dir);

    expect(r.status).toBe(1);
    expect(r.stderr).not.toMatch(/Cannot read properties of null/);
    expect(r.stderr).toMatch(/vercel\.json: bloco Content-Security-Policy sem "value"/);
  });
});
