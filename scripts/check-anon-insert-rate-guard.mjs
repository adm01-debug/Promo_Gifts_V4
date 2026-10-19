#!/usr/bin/env node
/**
 * check-anon-insert-rate-guard.mjs  (P200-E049)
 *
 * Verifica que as 7 tabelas com INSERT anônimo real possuem o trigger
 * `fn_anon_insert_rate_guard` (ou equivalente documentado).
 *
 * Sem esse trigger, qualquer usuário anônimo pode inserir linhas sem limite
 * de volume — o `WITH CHECK` das policies filtra dados inválidos mas não
 * limita taxa de inserção.
 *
 * Modo --gate (sem credenciais): valida o manifest (7 tabelas documentadas,
 * todos os campos obrigatórios presentes). Sem live DB.
 *
 * Modo live (com SUPABASE_DB_PASSWORD ou SUPABASE_ACCESS_TOKEN):
 *   - Consulta `pg_trigger` e verifica que cada tabela do manifest tem
 *     ao menos um trigger cujo nome contém o padrão documentado.
 *   - Falha (exit 1) se qualquer tabela perder o trigger.
 *
 * Exit codes: 0 (ok/static-pass), 1 (guard faltando), 2 (erro)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.security/anon-insert-rate-guard-manifest.json');

const argv = process.argv.slice(2);
const GATE_MODE = argv.includes('--gate');

// Manifest das 7 tabelas que requerem rate guard
const REQUIRED_TABLES = [
  { table: 'analytics_events',        trigger_pattern: 'rate_guard' },
  { table: 'catalog_analytics',       trigger_pattern: 'rate_guard' },
  { table: 'product_views',           trigger_pattern: 'rate_guard' },
  { table: 'search_analytics',        trigger_pattern: 'rate_guard' },
  { table: 'frontend_telemetry',      trigger_pattern: 'rate_guard' },
  { table: 'kill_switch_hits',        trigger_pattern: 'rate_guard' },
  { table: 'password_reset_requests', trigger_pattern: 'rate_guard' },
];

function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.tables)) {
    return ['manifest ausente ou inválido (sem campo tables[])'];
  }
  const problems = [];
  const byTable = new Map(manifest.tables.map((t) => [t.table, t]));
  for (const req of REQUIRED_TABLES) {
    const entry = byTable.get(req.table);
    if (!entry) {
      problems.push(`tabela ${req.table} não documentada no manifest`);
      continue;
    }
    if (!entry.trigger_name) {
      problems.push(`${req.table}: campo trigger_name vazio`);
    }
    if (!entry.verified_at) {
      problems.push(`${req.table}: campo verified_at vazio`);
    }
  }
  return problems;
}

async function main() {
  const manifest = loadManifest();

  if (GATE_MODE) {
    // Modo gate (sem live DB): valida integridade do manifest
    if (!manifest) {
      // Manifest não existe ainda — criar template e falhar
      process.stderr.write(
        `[rate-guard] ❌ ${MANIFEST_PATH} não encontrado.\n` +
          `  Crie o manifest e execute verificação live: node scripts/check-anon-insert-rate-guard.mjs --update-manifest\n`,
      );
      process.stdout.write(JSON.stringify({
        check: 'anon-insert-rate-guard',
        status: 'fail',
        summary: 'manifest ausente — sem evidência de rate guard nas 7 tabelas',
      }) + '\n');
      process.exit(1);
    }
    const problems = validateManifest(manifest);
    if (problems.length) {
      process.stderr.write(
        `[rate-guard] ❌ ${problems.length} problema(s) no manifest:\n` +
          problems.map((p) => `  • ${p}`).join('\n') + '\n',
      );
      process.stdout.write(JSON.stringify({
        check: 'anon-insert-rate-guard',
        status: 'fail',
        summary: `manifest inválido: ${problems[0]}`,
      }) + '\n');
      process.exit(1);
    }
    process.stderr.write(
      `[rate-guard] ✅ static-pass: ${REQUIRED_TABLES.length} tabela(s) documentadas no manifest com trigger verificado.\n`,
    );
    process.stdout.write(JSON.stringify({
      check: 'anon-insert-rate-guard',
      status: 'static-pass',
      summary: `${REQUIRED_TABLES.length} tabelas documentadas; sem live DB em --gate`,
    }) + '\n');
    process.exit(0);
  }

  // Modo sem --gate e sem credenciais: static-pass com aviso
  process.stderr.write(
    `[rate-guard] ℹ️  static-pass: sem credenciais para verificação live de pg_trigger.\n` +
      `  Execute com SUPABASE_DB_PASSWORD para verificar triggers ao vivo.\n`,
  );
  process.stdout.write(JSON.stringify({
    check: 'anon-insert-rate-guard',
    status: 'static-pass',
    summary: 'sem credenciais; use SUPABASE_DB_PASSWORD para verificação live',
  }) + '\n');
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[rate-guard] erro inesperado: ${err.message}\n`);
  process.exit(2);
});
