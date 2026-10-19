#!/usr/bin/env node
/**
 * check-secrets-inventory.mjs — E40/E98
 *
 * Varre .github/workflows/ e .github/actions/ em busca de referências a
 * secrets.NAME e vars.NAME, depois compara com o inventário documentado em
 * docs/ci/SEGREDOS.md. Falha (exit 1) com --gate se houver referências não
 * documentadas fora do allowlist.
 *
 * Uso:
 *   node scripts/check-secrets-inventory.mjs           # relatório completo
 *   node scripts/check-secrets-inventory.mjs --gate    # exit 1 se violação
 *   node scripts/check-secrets-inventory.mjs --update  # mostra lista para atualizar SEGREDOS.md
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const isGate = process.argv.includes('--gate');
const isUpdate = process.argv.includes('--update');

// ---------------------------------------------------------------------------
// Allowlist: segredos conhecidos que podem estar "fantasmas" (sem valor real)
// mas são aceitáveis — graceful fallbacks, templates, etc.
// ---------------------------------------------------------------------------
const ALLOWLIST = new Set([
  // Tem fallback hardcoded: ${{ secrets.PGPORT || '5432' }}
  'secrets.PGPORT',
// Tem fallback: ${{ secrets.BRANCH_PROTECTION_READ_TOKEN || github.token }}
  'secrets.BRANCH_PROTECTION_READ_TOKEN',
  // Allowlistado em check-workflow-contracts (Gate 4 opcional)
  'secrets.LHCI_GITHUB_APP_TOKEN',
  // Template de exemplo (_template.yml) — não é um secret real em uso
  'secrets.EXAMPLE_API_KEY',
]);

const isScanEdge = process.argv.includes('--scan-edge');

// ---------------------------------------------------------------------------
// E194: Escaneia Deno.env.get() em supabase/functions/**/*.ts
// ---------------------------------------------------------------------------
function collectEdgeFunctionFiles(dir) {
  const files = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectEdgeFunctionFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function extractDenoEnvRefs(content) {
  const refs = new Set();
  const re = /Deno\.env\.get\(['"]([A-Z][A-Z0-9_]+)['"]\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    refs.add(m[1]);
  }
  return refs;
}

function extractEdgeDocumented(mdPath) {
  const documented = new Set();
  let content;
  try {
    content = readFileSync(mdPath, 'utf8');
  } catch {
    return documented;
  }
  // Encontra a seção "## Segredos de Edge Functions"
  const sectionStart = content.indexOf('## Segredos de Edge Functions');
  if (sectionStart === -1) return documented;
  // Lê até o próximo ## (excluindo ### subsections)
  const sectionEnd = content.indexOf('\n## ', sectionStart + 1);
  const section = sectionEnd === -1 ? content.slice(sectionStart) : content.slice(sectionStart, sectionEnd);
  // Extrai `NOME` das células
  const tableRe = /`([A-Z][A-Z0-9_]+)`/g;
  let m;
  while ((m = tableRe.exec(section)) !== null) {
    documented.add(m[1]);
  }
  return documented;
}

// ---------------------------------------------------------------------------
// Coleta todos os arquivos YAML dos workflows e actions
// ---------------------------------------------------------------------------
function collectYamlFiles(dir) {
  const files = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectYamlFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
      files.push(full);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Extrai referências ${{ secrets.NAME }} e ${{ vars.NAME }} de um arquivo
// ---------------------------------------------------------------------------
function extractRefs(content) {
  const refs = new Map(); // "secrets.NAME" → Set<file>
  // Strip YAML comment lines before scanning so inline doc examples don't pollute results
  const noComments = content.split('\n').map(l => /^\s*#/.test(l) ? '' : l).join('\n');
  // Captura: secrets.NAME / vars.NAME no contexto de ${{ }} e de if: expressions
  const exprRe = /(secrets|vars)\.([A-Z][A-Z0-9_]*)/g;
  let m;
  while ((m = exprRe.exec(noComments)) !== null) {
    const key = `${m[1]}.${m[2]}`;
    if (!refs.has(key)) refs.set(key, new Set());
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Extrai segredos documentados de SEGREDOS.md
// Procura por padrões `` `SECRET_NAME` `` nas tabelas markdown
// ---------------------------------------------------------------------------
function extractDocumented(mdPath) {
  const documented = new Set();
  let content;
  try {
    content = readFileSync(mdPath, 'utf8');
  } catch {
    return documented;
  }
  // Extrai nomes como `NOME` das células da tabela (maiúsculas e underscore)
  const tableRe = /`([A-Z][A-Z0-9_]+)`/g;
  let m;
  while ((m = tableRe.exec(content)) !== null) {
    const name = m[1];
    // Filtra nomes que parecem segredos/vars (não títulos de coluna)
    if (name !== 'SSOT' && name !== 'PR' && !name.includes('NULL') && !name.startsWith('VITE_S')) {
      documented.add(`secrets.${name}`);
    }
    // VITE_ prefixed são segredos reais também
    if (name.startsWith('VITE_')) {
      documented.add(`secrets.${name}`);
    }
  }
  // Adiciona GITHUB_TOKEN manualmente (token automático, sempre presente)
  documented.add('secrets.GITHUB_TOKEN');
  // Adiciona vars que estejam documentadas
  const varsRe = /`(vars\.[A-Z][A-Z0-9_]+)`/g;
  while ((m = varsRe.exec(content)) !== null) {
    documented.add(m[1]);
  }
  return documented;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const workflowsDir = join(ROOT, '.github', 'workflows');
const actionsDir = join(ROOT, '.github', 'actions');
const segredosMd = join(ROOT, 'docs', 'ci', 'SEGREDOS.md');

const yamlFiles = [
  ...collectYamlFiles(workflowsDir),
  ...collectYamlFiles(actionsDir),
];

// Agrega todas as referências
const allRefs = new Map(); // key → Set<relPath>
for (const file of yamlFiles) {
  const content = readFileSync(file, 'utf8');
  const relPath = relative(ROOT, file);
  const refs = extractRefs(content);
  for (const [key] of refs) {
    if (!allRefs.has(key)) allRefs.set(key, new Set());
    allRefs.get(key).add(relPath);
  }
}

// Conta referências por chave (para relatório)
const refCounts = new Map();
for (const file of yamlFiles) {
  const content = readFileSync(file, 'utf8');
  const exprRe = /(secrets|vars)\.([A-Z][A-Z0-9_]*)/g;
  let m;
  while ((m = exprRe.exec(content)) !== null) {
    const key = `${m[1]}.${m[2]}`;
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
  }
}

const documented = extractDocumented(segredosMd);

// ---------------------------------------------------------------------------
// Classifica
// ---------------------------------------------------------------------------
const undocumented = [];
const allowlisted = [];
const phantom = []; // documentados mas sem nenhuma referência

for (const [key] of allRefs) {
  if (ALLOWLIST.has(key)) {
    allowlisted.push(key);
  } else if (!documented.has(key)) {
    // Separar secrets de vars
    undocumented.push(key);
  }
}

// Documentados mas não referenciados (possíveis phantoms)
for (const doc of documented) {
  if (!allRefs.has(doc) && !ALLOWLIST.has(doc)) {
    phantom.push(doc);
  }
}

// Ordena
undocumented.sort();
allowlisted.sort();
phantom.sort();

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
const refsTotal = allRefs.size;
const docsTotal = documented.size;

console.log('\n=== check-secrets-inventory.mjs (E40/E98) ===\n');
console.log(`Arquivos escaneados: ${yamlFiles.length}`);
console.log(`Referências únicas:  ${refsTotal} (secrets + vars)`);
console.log(`Documentados em SEGREDOS.md: ${docsTotal}`);
console.log(`Allowlisted:         ${allowlisted.length}`);
console.log(`Não documentados:    ${undocumented.length}`);
console.log(`Sem referência:      ${phantom.length}`);

if (undocumented.length > 0) {
  console.log('\n⚠️  REFERÊNCIAS NÃO DOCUMENTADAS (adicionar em docs/ci/SEGREDOS.md):');
  for (const key of undocumented) {
    const count = refCounts.get(key) || 0;
    const files = [...(allRefs.get(key) || [])].slice(0, 3).join(', ');
    console.log(`  • ${key} (${count} refs) — ex: ${files}`);
  }
}

if (allowlisted.length > 0) {
  console.log('\n✅ Allowlistados (aceitáveis sem documentação em SEGREDOS.md):');
  for (const key of allowlisted) {
    const count = refCounts.get(key) || 0;
    console.log(`  • ${key} (${count} refs)`);
  }
}

if (phantom.length > 0 && !isGate) {
  console.log('\n🔍 Documentados mas sem referência nos workflows (possíveis phantoms):');
  for (const key of phantom) {
    console.log(`  • ${key}`);
  }
}

if (isUpdate) {
  console.log('\n📋 Lista completa de referências reais (para atualizar SEGREDOS.md):');
  const sorted = [...allRefs.keys()].filter(k => !ALLOWLIST.has(k)).sort();
  for (const key of sorted) {
    const count = refCounts.get(key) || 0;
    const status = documented.has(key) ? '✅' : '❌ não documentado';
    console.log(`  ${status} ${key} (${count} refs)`);
  }
}

if (undocumented.length === 0) {
  console.log('\n✅ Todos os secrets/vars referenciados estão documentados em SEGREDOS.md.');
}

console.log('');

// ---------------------------------------------------------------------------
// E194 — Edge Functions: Deno.env.get() vs seção "Segredos de Edge Functions"
// ---------------------------------------------------------------------------
let edgeExitCode = 0;

if (isScanEdge || isGate) {
  const functionsDir = join(ROOT, 'supabase', 'functions');
  const edgeFiles = collectEdgeFunctionFiles(functionsDir);
  const edgeRefs = new Map(); // VAR_NAME → Set<relPath>

  for (const file of edgeFiles) {
    const content = readFileSync(file, 'utf8');
    const refs = extractDenoEnvRefs(content);
    const relPath = relative(ROOT, file);
    for (const ref of refs) {
      if (!edgeRefs.has(ref)) edgeRefs.set(ref, new Set());
      edgeRefs.get(ref).add(relPath);
    }
  }

  const edgeDocumented = extractEdgeDocumented(segredosMd);
  const edgeUndocumented = [...edgeRefs.keys()].filter(k => !edgeDocumented.has(k)).sort();
  const edgePhantom = [...edgeDocumented].filter(k => !edgeRefs.has(k)).sort();

  console.log('=== check-secrets-inventory.mjs — Edge Functions (E194) ===\n');
  console.log(`Arquivos edge escaneados: ${edgeFiles.length}`);
  console.log(`Deno.env.get() únicos:    ${edgeRefs.size}`);
  console.log(`Documentados (SEGREDOS):  ${edgeDocumented.size}`);
  console.log(`Não documentados:         ${edgeUndocumented.length}`);
  console.log(`Sem referência (phantoms):${edgePhantom.length}`);

  if (edgeUndocumented.length > 0) {
    console.error('\n⚠️  EDGE FUNCTIONS — Deno.env.get() NÃO DOCUMENTADOS:');
    for (const k of edgeUndocumented) {
      const files = [...(edgeRefs.get(k) || [])].slice(0, 3).join(', ');
      console.error(`  • ${k} — ex: ${files}`);
    }
    edgeExitCode = 1;
  } else {
    console.log('\n✅ Todos Deno.env.get() das edge functions estão documentados em SEGREDOS.md.');
  }

  if (edgePhantom.length > 0 && !isGate) {
    console.log('\n🔍 Edge Functions — Documentados sem referência (possíveis phantoms):');
    for (const k of edgePhantom) {
      console.log(`  • ${k}`);
    }
  }
  console.log('');
}

if (isGate && undocumented.length > 0) {
  console.error(`::error::check-secrets-inventory: ${undocumented.length} segredo(s) referenciado(s) mas não documentado(s) em docs/ci/SEGREDOS.md. Adicione as entradas ou inclua no allowlist de check-secrets-inventory.mjs.`);
  process.exit(1);
}

if (isGate && edgeExitCode > 0) {
  console.error(`::error::check-secrets-inventory: edge functions com Deno.env.get() não documentados em docs/ci/SEGREDOS.md (seção "Segredos de Edge Functions").`);
  process.exit(1);
}
