// Testa scripts/check-edge-request-id-propagation.mjs, o gate que garante que
// toda edge function listada em CRITICAL_EDGES (A) importe o logger SSOT,
// (B) propague X-Request-Id no response e (C) propague X-Request-Id em
// chamadas internas (fetch/functions.invoke) dentro de uma janela de linhas.
//
// O script roda tudo em main() ao ser importado (sem funções exportadas),
// então o padrão aqui é integração CLI real via spawnSync, com cwd apontando
// para uma fixture temporária — mesmo padrão de
// tests/scripts/check-edge-cors-headers.test.mjs. Como CRITICAL_EDGES é uma
// lista fixa de nomes reais (hardcoded no script), as fixtures usam esses
// mesmos nomes dentro de supabase/functions/ no repositório temporário.
import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-edge-request-id-propagation.mjs');

// Lista real de CRITICAL_EDGES do script (precisa existir em todo cenário,
// senão cada uma ausente conta como violação "missing" e some o sinal do
// que o teste quer provar).
const CRITICAL_EDGES = [
  'connections-hub-audit',
  'crm-db-bridge',
  'external-db-bridge',
  'mcp-keys-issue',
  'mcp-keys-revoke',
  'mcp-keys-rotate',
  'mcp-keys-update',
  'mcp-server',
  'secrets-manager',
  'asia-ingestion',
  'audit-suite',
  'backfill-image-dimensions',
  'check-login',
  'generate-blurhashes',
  'hash-product-images',
  'simulation-orchestrator',
  'word-magic',
];

const COMPLIANT = `
import { createStructuredLogger } from "../_shared/structured-logger.ts";
const log = createStructuredLogger();
export default async function handler(req) {
  const res = new Response("ok");
  log.respond(res);
  return res;
}
`;

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'request-id-gate-'));
  temporaryRoots.push(dir);
  // Baseline: todas as CRITICAL_EDGES compliant, para isolar o cenário sob
  // teste em uma única edge sobrescrita depois.
  for (const name of CRITICAL_EDGES) writeFn(dir, name, COMPLIANT);
  return dir;
}

function writeFn(root, name, content) {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), content);
}

function runGate(root) {
  return spawnSync('node', [SCRIPT], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

describe('check-edge-request-id-propagation — repositório real', () => {
  it('passa (exit 0) contra supabase/functions/ real do repo', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Edge request-id propagation gate OK/);
  });
});

describe('check-edge-request-id-propagation — baseline e violações básicas', () => {
  it('passa quando todas as CRITICAL_EDGES são compliant', () => {
    const root = tempRepo();
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('LIST_ONLY=1 apenas lista CRITICAL_EDGES e sai 0', () => {
    const root = tempRepo();
    const r = spawnSync('node', [SCRIPT], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, LIST_ONLY: '1' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/mcp-server/);
  });

  it('falha quando uma edge crítica não importa o logger SSOT', () => {
    const root = tempRepo();
    writeFn(root, 'audit-suite', `export default async function handler(req) { return new Response("ok"); }`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[logger_missing\]/);
  });

  it('falha quando o response não propaga X-Request-Id', () => {
    const root = tempRepo();
    writeFn(
      root,
      'word-magic',
      `import { createStructuredLogger } from "../_shared/structured-logger.ts";\nconst log = createStructuredLogger();\nexport default async function handler(req) { return new Response("ok"); }`,
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[response_no_propagation\]/);
  });

  it('falha quando a edge function não existe mais no disco', () => {
    const root = tempRepo();
    rmSync(join(root, 'supabase', 'functions', 'mcp-server'), { recursive: true, force: true });
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[missing\]/);
  });

  it('falha quando uma chamada interna fica sem X-Request-Id na janela de linhas', () => {
    const root = tempRepo();
    writeFn(
      root,
      'mcp-server',
      `import { createStructuredLogger } from "../_shared/structured-logger.ts";\nconst log = createStructuredLogger();\nexport default async function handler(req) {\n  log.respond(new Response("ok"));\n  const r = await fetch("https://x.supabase.co/functions/v1/other", { method: "POST" });\n  return new Response("ok");\n}`,
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[internal_call_no_request_id\]/);
  });
});

// ─── regressão: arquivo ilegível não deve derrubar o processo ──────────────
//
// Antes do fix, readSource() chamava readFileSync sem try/catch. Qualquer
// index.ts que exista (existsSync === true) mas não possa ser lido como
// arquivo de texto — permissão negada (EACCES) ou, de forma determinística
// e independente de root/usuário, "index.ts" sendo um diretório em vez de
// arquivo (EISDIR) — derrubava o processo inteiro com um stack trace crú do
// Node, SEM reportar violação para a edge afetada e SEM continuar checando
// as demais CRITICAL_EDGES da lista, ao contrário do caso "missing"
// (diretório ausente), que já era tratado como violação normal.
//
// Rodado de fato nos dois cenários antes do fix:
//   - EISDIR (index.ts/ como diretório): crash confirmado em qualquer
//     usuário, inclusive root — é o caso coberto pelo teste abaixo.
//   - EACCES (chmod 000): crash confirmado rodando como usuário não-root
//     (`su ubuntu -s /bin/bash -c '...'`); como o container de CI/local
//     pode rodar como root, onde chmod 000 não bloqueia leitura, esse caso
//     específico não é portável para o teste automatizado, mas usa a MESMA
//     linha de código (readFileSync em readSource) corrigida pelo mesmo
//     try/catch — por isso um teste cobre os dois.
describe('check-edge-request-id-propagation — regressão: index.ts ilegível não deve crashar', () => {
  it('reporta violação legível (não stack trace) quando index.ts é um diretório (EISDIR)', () => {
    const root = tempRepo();
    const target = join(root, 'supabase', 'functions', 'mcp-server', 'index.ts');
    rmSync(target, { force: true });
    mkdirSync(target); // index.ts agora é um diretório, não um arquivo
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Edge request-id propagation — violações/);
    expect(r.stderr).toMatch(/\[read_error\]/);
    expect(r.stderr).toMatch(/EISDIR/);
    // Sem o fix, o stderr cru do Node inclui o frame da função interna —
    // garante que não voltamos a expor isso ao operador do gate.
    expect(r.stderr).not.toMatch(/at readSource/);
    // Garante que as demais CRITICAL_EDGES continuam sendo checadas (não
    // paramos no primeiro crash): nenhuma outra edge compliant deve
    // aparecer como violação.
    expect(r.stderr).not.toMatch(/▸ secrets-manager/);
  });

  // Melhor esforço: mesma causa raiz (readFileSync sem try/catch), via
  // permissão de arquivo em vez de EISDIR. Só roda a asserção real quando o
  // processo atual não é root (senão chmod 000 não bloqueia a leitura e o
  // cenário não é exercitado) — nesse caso o teste não falha, apenas não
  // prova nada adicional (a prova determinística é o teste EISDIR acima).
  it('reporta violação legível (não crash) quando index.ts está sem permissão de leitura (EACCES, se não-root)', () => {
    const root = tempRepo();
    const target = join(root, 'supabase', 'functions', 'mcp-server', 'index.ts');
    chmodSync(target, 0o000);
    try {
      const r = runGate(root);
      if (r.status === 0) return; // root bypassa permissão — nada a provar aqui
      expect(r.stderr).toMatch(/\[read_error\]/);
      expect(r.stderr).toMatch(/EACCES/);
    } finally {
      chmodSync(target, 0o644);
    }
  });
});
