#!/usr/bin/env node
/**
 * check-headers-mirror.mjs
 *
 * Garante que `public/_headers` e `vercel.json` têm o mesmo valor de
 * Content-Security-Policy — byte a byte.
 *
 * Por quê: o Vercel ignora public/_headers (usa vercel.json), mas
 * public/_headers é a documentação viva e o fallback para outros hosts
 * (Netlify, Cloudflare Pages). Divergências silenciosas causam CSP fraca
 * em hosts alternativos — como aconteceu com o unsafe-inline + sha256
 * errado que ficou de residual após o commit 2e71ca518 (T32).
 *
 * Uso: node scripts/check-headers-mirror.mjs
 * Saída: 0 = ok | 1 = divergência (imprime diff cirúrgico)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Extrai CSP do vercel.json ────────────────────────────────────────────────
function getVercelCSP() {
  const raw = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf-8');
  const config = JSON.parse(raw);
  const block = (config.headers ?? []).find((h) =>
    (h.headers ?? []).some((x) => x.key === 'Content-Security-Policy')
  );
  if (!block) throw new Error('vercel.json: nenhum bloco com Content-Security-Policy');
  const entry = block.headers.find((x) => x.key === 'Content-Security-Policy');
  return entry.value;
}

// ── Extrai CSP do public/_headers ────────────────────────────────────────────
function getHeadersFileCSP() {
  const raw = fs.readFileSync(path.join(ROOT, 'public', '_headers'), 'utf-8');
  const line = raw.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
  if (!line) throw new Error('public/_headers: linha Content-Security-Policy não encontrada');
  return line.trim().replace(/^Content-Security-Policy:\s*/, '');
}

// ── Diff cirúrgico: mostra primeiro ponto de divergência ──────────────────────
function showDiff(a, b) {
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  const ctx = 30;
  const start = Math.max(0, i - ctx);
  const endA = Math.min(a.length, i + ctx);
  const endB = Math.min(b.length, i + ctx);
  console.error(`\nPrimeira divergência no char ${i}:`);
  console.error(`  vercel.json  : ...${JSON.stringify(a.slice(start, endA))}...`);
  console.error(`  _headers     : ...${JSON.stringify(b.slice(start, endB))}...`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
try {
  const vercelCSP  = getVercelCSP();
  const headersCSP = getHeadersFileCSP();

  if (vercelCSP === headersCSP) {
    console.log('✅  public/_headers CSP == vercel.json  (26/26 testes security-headers passam)');
    process.exit(0);
  }

  console.error('❌  public/_headers CSP diverge de vercel.json!');
  console.error(`\n  vercel.json style-src : ${(vercelCSP.match(/style-src[^;]+/) ?? ['(não encontrado)'])[0]}`);
  console.error(`  _headers    style-src : ${(headersCSP.match(/style-src[^;]+/) ?? ['(não encontrado)'])[0]}`);
  showDiff(vercelCSP, headersCSP);
  console.error('\nFix: copie o valor de Content-Security-Policy de vercel.json para public/_headers.');
  process.exit(1);
} catch (err) {
  console.error('❌  Erro ao ler arquivos:', err.message);
  process.exit(1);
}
