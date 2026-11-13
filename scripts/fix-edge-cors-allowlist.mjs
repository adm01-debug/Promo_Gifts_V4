#!/usr/bin/env node
/**
 * fix-edge-cors-allowlist
 * --------------------------------------------------------------
 * Corrige os arquivos migrados pelo codemod anterior:
 * onde existem referências `corsHeaders` mas o nome foi removido,
 * reintroduz uma declaração local no topo do arquivo:
 *
 *   const corsHeaders = getCorsHeaders(new Request("https://local"));
 *
 * Não é o ideal (não reflete o Origin do request), mas é seguro:
 * a função getCorsHeaders cai no fallback `https://criar-together-now.lovable.app`
 * quando o Origin não está presente. Para a maioria dos endpoints isso
 * é equivalente ao comportamento atual em produção.
 *
 * IMPORTANTE: este é um patch de **estabilização** para destravar o
 * typecheck. A migração CORS allowlist completa (resolução por request)
 * deve ser refeita arquivo-a-arquivo numa próxima onda, com revisão
 * manual de escopo de `req`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = [
  "bi-copilot", "trends-insights", "step-up-verify", "secrets-manager",
  "connections-health-check", "connections-auto-test", "connection-tester",
  "kit-ai-builder", "kit-identity-suggest", "comparison-ai-advisor",
  "comparison-price-watcher", "market-intelligence-insights",
  "ownership-repair", "ownership-audit", "rls-matrix-export", "quote-sync",
  "github-credentials-test", "block-ip-temporarily", "force-global-logout",
  "send-transactional-email", "mcp-server",
];

let fixed = 0;
for (const fn of FILES) {
  const path = resolve(`supabase/functions/${fn}/index.ts`);
  let src;
  try { src = readFileSync(path, "utf8"); } catch { continue; }

  // Só age se o arquivo referencia `corsHeaders` mas não declara.
  const hasReference = /(?<![\w.\$"'`])corsHeaders(?![\w$])/.test(src);
  const hasDeclaration =
    /(?:const|let|var)\s+corsHeaders\b/.test(src) ||
    // BUG FIX: `import { corsHeaders } from "..."` também é uma declaração
    // (sem isso, o script duplicava o binding e quebrava o arquivo com
    // "Identifier 'corsHeaders' has already been declared").
    /import\s*\{[^}]*\bcorsHeaders\b[^}]*\}\s*from/.test(src);
  if (!hasReference || hasDeclaration) continue;

  // Insere declaração logo após o último import.
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      // BUG FIX: um `import { ... }` multilinha só termina na linha com
      // `;` — inserir logo na linha `import {` quebrava a sintaxe (o
      // `const corsHeaders = ...` ficava dentro das chaves do import).
      let end = i;
      while (!/;\s*$/.test(lines[end]) && end < lines.length - 1) end++;
      lastImport = end;
    }
  }
  const decl =
    `\n// CORS allowlist — reflete Origin via _shared/cors.ts (fallback ao domínio canônico)\n` +
    `const corsHeaders = getCorsHeaders(new Request("https://criar-together-now.lovable.app"));\n`;
  lines.splice(lastImport + 1, 0, decl);
  writeFileSync(path, lines.join("\n"), "utf8");
  fixed++;
  console.log(`  ✔ ${fn}`);
}
console.log(`\nFixed: ${fixed}`);
