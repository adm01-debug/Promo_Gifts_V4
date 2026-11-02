#!/usr/bin/env node
/**
 * Gate E119: ratchet de definições locais de `interface Product`.
 *
 * O repositório tem múltiplas definições de `interface Product` fora do
 * arquivo canônico (src/types/product-catalog.ts). Esta gate congela o
 * número atual e bloqueia criação de NOVAS definições locais.
 *
 * Critério de sucesso: o número de `interface Product\b` em src/ não aumenta.
 * Uso: node scripts/check-product-type-duplicates.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.product-interface-baseline.json');
const UPDATE = process.argv.includes('--update');

let baseline = { count: null };
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}

// Contar ocorrências
const out = execSync(
  'grep -rc "interface Product\\b" src/ | grep -v ":0" | wc -l',
  { cwd: ROOT, encoding: 'utf8' },
).trim();
const currentCount = parseInt(out, 10);

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify({ count: currentCount }, null, 2) + '\n');
  console.log(`✅ Baseline atualizado: ${currentCount} definições → ${BASELINE_PATH}`);
  process.exit(0);
}

const baselineCount = baseline.count;

if (baselineCount === null) {
  console.error('❌ Baseline não encontrado. Gere com: node scripts/check-product-type-duplicates.mjs --update');
  process.exit(2);
}

console.log(`Product interface ratchet — atual: ${currentCount} · baseline: ${baselineCount}`);

if (currentCount > baselineCount) {
  const delta = currentCount - baselineCount;
  console.error(`❌ ${delta} nova(s) definição(ões) de "interface Product" adicionada(s)!`);
  console.error('Apenas src/types/product-catalog.ts deve declarar interface Product.');
  console.error('Use Pick<Product, ...> ou importe de product-catalog.ts.');
  process.exit(1);
}

if (currentCount < baselineCount) {
  const delta = baselineCount - currentCount;
  console.log(`✨ Drift positivo: ${delta} definição(ões) unificada(s). Atualize o baseline!`);
  console.log('  node scripts/check-product-type-duplicates.mjs --update');
}

console.log('✅ Nenhuma nova definição local de interface Product.');
process.exit(0);
