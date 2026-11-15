#!/usr/bin/env node
/**
 * Gate: garante que frases banidas NÃO reapareçam no código.
 * Exceção: este próprio arquivo + specs E2E que asseguram ausência.
 */
import { searchFixedString } from './lib/fixed-string-search.mjs';

const BANNED = [
  'Modo de seleção ativo',
  'marque manualmente os orçamentos',
];

const ALLOWLIST = [
  'scripts/check-removed-phrases.mjs',
  'e2e/flows/04o-quotes-columns-always-visible.spec.ts',
];

let failed = false;
for (const phrase of BANNED) {
  // GUARD: sem ripgrep a busca antiga (`rg … || true`) devolvia vazio e o gate dava ✅ sem varrer.
  const hits = searchFixedString(phrase, ['src', 'e2e', 'tests', 'scripts'])
    .filter((line) => !ALLOWLIST.some((a) => line.startsWith(a + ':')));
  if (hits.length > 0) {
    failed = true;
    console.error(`❌ Frase banida encontrada: "${phrase}"`);
    hits.forEach((h) => console.error('   ' + h));
  }
}

if (failed) {
  console.error('\nRemova as ocorrências acima ou atualize a allowlist em scripts/check-removed-phrases.mjs.');
  process.exit(1);
}
console.log('✅ Nenhuma frase banida encontrada.');
