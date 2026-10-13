#!/usr/bin/env node
/**
 * check-no-prod-leak.mjs
 *
 * Incidente 2026-10-13: tráfego de dev/testes E2E (Referer: localhost:8080,
 * usuário test-user-id) batendo direto em produção. Uma causa possível é um
 * arquivo de config de dev/teste com a URL/ref do projeto de PRODUÇÃO
 * (`doufsxqlfjyuvxuezpln`) hardcoded fora do lugar esperado (REGRA #1 do
 * CLAUDE.md — client.ts é o ÚNICO lugar onde isso é esperado, como fallback
 * canônico).
 *
 * O que este script verifica:
 *   1. Arquivos de env de DEV/TEST (.env.development*, .env.test*, .env.e2e,
 *      .env.local — nunca .env.production nem os .example, que são
 *      templates com placeholder) NÃO podem conter a ref de produção.
 *      Dev/test devem apontar para localhost, placeholder, ou (se usarem um
 *      projeto de staging real) um ref diferente do canônico.
 *   2. playwright.config.ts e vite.config.ts (server/preview) não podem
 *      hardcodar a URL de produção como baseURL/proxy target — isso faria
 *      os testes baterem direto em produção em vez de localhost/staging.
 *
 * O que este script NÃO verifica (fora de escopo, e esperado):
 *   - src/integrations/supabase/client.ts — SSOT, a ref canônica É esperada
 *     ali (REGRA #1). Protegido por scripts/validate-supabase-config.mjs.
 *   - Comentários/docs em qualquer arquivo — mencionar a ref de produção em
 *     um comentário explicativo não é um leak executável.
 *
 * Uso: node scripts/check-no-prod-leak.mjs
 * Retorna: 0 = OK, 1 = leak encontrado
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PROD_REF = 'doufsxqlfjyuvxuezpln';

// Arquivos de env que, se existirem, são de dev/test/staging — nunca devem
// apontar para o projeto de produção. `.env.production` e qualquer `.example`
// são intencionalmente excluídos (o primeiro É produção por definição; os
// segundos são templates com placeholder, nunca carregados em runtime).
const DEV_TEST_ENV_FILES = [
  '.env.development',
  '.env.development.local',
  '.env.test',
  '.env.test.local',
  '.env.e2e',
  '.env.e2e.local',
  '.env.local',
  '.env.staging',
];

// Config files onde um baseURL/target hardcoded para produção redirecionaria
// testes locais/E2E para bater em produção de verdade.
const CONFIG_FILES_TO_SCAN = ['playwright.config.ts', 'vite.config.ts'];

function stripComments(content) {
  // Remove linhas de comentário de linha única (// ...) para não acusar
  // uma nota histórica/explicativa como leak executável — mesmo padrão do
  // validate-supabase-config.mjs.
  return content.replace(/^[ \t]*\/\/.*$/gm, '');
}

let hasLeak = false;
const findings = [];

for (const file of DEV_TEST_ENV_FILES) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue; // ok — não existe ainda (ver docs do incidente 2026-10-13)
  const content = readFileSync(path, 'utf-8');
  if (content.includes(PROD_REF)) {
    hasLeak = true;
    findings.push(
      `❌ ${file} contém a ref de produção (${PROD_REF}). Arquivos de dev/test/staging devem apontar para localhost, um placeholder, ou um projeto de staging dedicado — nunca para produção.`,
    );
  }
}

for (const file of CONFIG_FILES_TO_SCAN) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  const content = stripComments(readFileSync(path, 'utf-8'));
  if (content.includes(PROD_REF)) {
    hasLeak = true;
    findings.push(
      `❌ ${file} referencia a ref de produção (${PROD_REF}) em código executável. baseURL/proxy de dev e E2E devem usar localhost ou uma env var (ex. E2E_BASE_URL), nunca produção hardcoded.`,
    );
  }
}

if (hasLeak) {
  console.error('🚨 check-no-prod-leak: vazamento de ref de produção detectado em config de dev/teste.\n');
  for (const f of findings) console.error(f);
  console.error(
    `\nSe isto é intencional (ex. um teste live propositalmente contra produção, aprovado pelo PO), documente o motivo no PR e considere mover a ref para uma env var lida em runtime em vez de hardcode.`,
  );
  process.exit(1);
}

console.log(`✅ check-no-prod-leak: nenhuma ref de produção (${PROD_REF}) encontrada em config de dev/teste fora do esperado.`);
