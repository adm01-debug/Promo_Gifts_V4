#!/usr/bin/env node
// E191: valida que todo step "Gate X.Y" em deploy-gates.yml está documentado em CLAUDE.md.
// Uso: node scripts/check-gates-table.mjs [--gate]
// Sai 0 se ok, 1 se há gate no YAML sem correspondência na tabela do CLAUDE.md.

import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const gate = args.includes('--gate');

const yamlPath = '.github/workflows/deploy-gates.yml';
const claudePath = 'CLAUDE.md';

const yaml = readFileSync(yamlPath, 'utf8');
const claude = readFileSync(claudePath, 'utf8');

// Extrai "Gate X.Y" de step names: `- name: Gate 1.9.2 — ...`
const stepPattern = /^\s+-\s+name:\s+(Gate\s+[\d.]+)/gm;
const yamlGates = new Set();
let m;
while ((m = stepPattern.exec(yaml)) !== null) {
  // Normaliza: "Gate 1.9.2" → "Gate 1.9.2"
  yamlGates.add(m[1].trim());
}

// Extrai gates da tabela do CLAUDE.md: "| Gate 1.9.2 |"
const tablePattern = /\|\s*(Gate\s+[\d.]+)\s*\|/g;
const claudeGates = new Set();
while ((m = tablePattern.exec(claude)) !== null) {
  claudeGates.add(m[1].trim());
}

const missing = [...yamlGates].filter((g) => !claudeGates.has(g));

if (missing.length === 0) {
  console.log(`✓ check-gates-table: todos os ${yamlGates.size} gates do YAML documentados em CLAUDE.md`);
  process.exit(0);
} else {
  console.error(`✗ check-gates-table: ${missing.length} gate(s) em deploy-gates.yml sem entrada na tabela de CLAUDE.md:`);
  for (const g of missing) {
    console.error(`  - ${g}`);
  }
  if (gate) {
    console.error('\nAdicione as linhas ausentes em CLAUDE.md §"Gates obrigatórios" e commite.');
    process.exit(1);
  }
  process.exit(1);
}
