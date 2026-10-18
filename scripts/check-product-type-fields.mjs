#!/usr/bin/env node
/**
 * check-product-type-fields.mjs
 *
 * E111: Verifica que campos críticos do tipo Product estão presentes na
 * declaração `export interface Product` em src/types/product-catalog.ts,
 * usando TypeScript Compiler API (não blob-grep).
 *
 * Antes (blob-grep): passava mesmo com `interface Product` deletada, porque
 * types.ts tem 19 ocorrências de `sale_price` e o regex as encontrava.
 * Agora: analisa o AST do arquivo canônico e checa membros da interface.
 *
 * Uso: node scripts/check-product-type-fields.mjs
 * Retorna: 0 = OK, 1 = campos ausentes ou interface não encontrada
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

const ROOT = process.cwd();

// Arquivo canônico — único alvo. types.ts deliberadamente excluído: tem 19+
// ocorrências de sale_price e tornava o gate um falso-positivo por definição.
const CANONICAL_FILE = join(ROOT, 'src/types/product-catalog.ts');
const CANONICAL_NAME = 'Product'; // nome exato da interface

if (!existsSync(CANONICAL_FILE)) {
  console.error(`❌ Arquivo canônico não encontrado: ${CANONICAL_FILE}`);
  process.exit(1);
}

// Campos críticos que DEVEM ser membros diretos de `interface Product`
// (ou do TypeLiteral de `type Product = { ... }`)
const REQUIRED_FIELDS = [
  {
    name: 'price',
    description: 'Preço original do produto',
    critical: true,
    note: 'Lovable renomeou price→sale_price em 2026-06-11 causando 400s em produção',
  },
  {
    name: 'sale_price',
    description: 'Preço de venda (pode ser opcional)',
    critical: true,
    note: 'Adicionado após incidente 2026-06-11 — REGRA #2 do CLAUDE.md',
  },
  {
    name: 'shortDescription',
    description: 'Descrição curta do produto',
    critical: true,
    note: 'Removido durante merge do PR #701 (commit f22e1e2)',
  },
  {
    name: 'category_id',
    description: 'ID da categoria',
    critical: true,
    note: 'Removido durante merge do PR #701 (commit f22e1e2)',
  },
  {
    name: 'category_name',
    description: 'Nome da categoria',
    critical: false,
    note: 'Campo de conveniência — ausente é aviso, não erro',
  },
];

/**
 * Extrai os nomes de todos os membros de uma InterfaceDeclaration ou do
 * TypeLiteral de uma TypeAliasDeclaration com o nome dado.
 * Retorna null se a declaração não for encontrada.
 */
function extractInterfaceMembers(sourceText, interfaceName) {
  const sf = ts.createSourceFile(
    CANONICAL_FILE,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const memberNames = new Set();

  function visit(node) {
    // interface Product { ... }
    if (
      ts.isInterfaceDeclaration(node) &&
      node.name.text === interfaceName
    ) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = ts.isIdentifier(member.name)
            ? member.name.text
            : ts.isStringLiteral(member.name)
              ? member.name.text
              : null;
          if (name) memberNames.add(name);
        }
      }
    }

    // type Product = { ... }
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === interfaceName &&
      ts.isTypeLiteralNode(node.type)
    ) {
      for (const member of node.type.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = ts.isIdentifier(member.name)
            ? member.name.text
            : ts.isStringLiteral(member.name)
              ? member.name.text
              : null;
          if (name) memberNames.add(name);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return memberNames.size > 0 ? memberNames : null;
}

// ----- main -----

const source = readFileSync(CANONICAL_FILE, 'utf-8');
const members = extractInterfaceMembers(source, CANONICAL_NAME);

console.log(`🔍 Verificando campos críticos de \`interface ${CANONICAL_NAME}\` em ${CANONICAL_FILE.replace(ROOT + '/', '')}...\n`);

if (!members) {
  console.error(`❌ \`interface ${CANONICAL_NAME}\` (ou \`type ${CANONICAL_NAME} = {...}\`) não encontrada em ${CANONICAL_FILE.replace(ROOT + '/', '')}.`);
  console.error('   Isso pode acontecer se o Lovable deletou ou renomeou a declaração.');
  console.error('   Verifique: git log --oneline -5 -- src/types/product-catalog.ts');
  process.exit(1);
}

console.log(`Membros encontrados em \`interface ${CANONICAL_NAME}\`: ${members.size}`);
console.log();

let errors = 0;
let warnings = 0;

for (const field of REQUIRED_FIELDS) {
  const present = members.has(field.name);
  let status;

  if (!present) {
    status = field.critical ? '❌ AUSENTE' : '⚠️  AVISO';
    if (field.critical) errors++;
    else warnings++;
  } else {
    status = '✅ OK';
  }

  console.log(`${status} ${field.name} — ${field.description}`);
  if (!present && field.note) {
    console.log(`   📝 ${field.note}`);
  }
}

console.log();

if (errors > 0) {
  console.error(`❌ ${errors} campo(s) crítico(s) ausente(s) em \`interface ${CANONICAL_NAME}\` (${CANONICAL_FILE.replace(ROOT + '/', '')}).`);
  console.error('');
  console.error('Como corrigir:');
  console.error('  1. git log --oneline -10 -- src/types/product-catalog.ts');
  console.error('  2. Restaure os campos na interface Product (não em types.ts)');
  console.error('  3. CLAUDE.md REGRA #2 documenta os campos obrigatórios');
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠️  ${warnings} aviso(s) — campo(s) opcional(is) ausente(s). Não é bloqueante.`);
  process.exit(0);
} else {
  console.log(`✅ Todos os campos críticos de \`interface ${CANONICAL_NAME}\` estão presentes.`);
  process.exit(0);
}
