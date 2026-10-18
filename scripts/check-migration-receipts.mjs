#!/usr/bin/env node
/**
 * check-migration-receipts.mjs (P200-E055)
 *
 * Gate: verifica que migrations aplicadas têm recibo em MIGRATIONS_SYNC_LOG.md.
 *
 * Modo --gate (sem credenciais, padrão):
 *   - Verifica existência e estrutura básica do MIGRATIONS_SYNC_LOG.md
 *   - static-pass se o arquivo existe e tem ao menos 1 linha de recibo
 *
 * Modo live (com SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF):
 *   - Consulta schema_migrations via Management API
 *   - Falha (exit 1) se versão aplicada há >24h não tem recibo no log
 *
 * Exit codes: 0 (ok/static-pass), 1 (falta recibo), 2 (erro)
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SYNC_LOG_PATH = path.join(ROOT, 'supabase/MIGRATIONS_SYNC_LOG.md');

const argv = process.argv.slice(2);
const GATE_MODE = argv.includes('--gate');
const REQUIRE_LIVE = shouldRequireLive(argv);
const fromFileArg = argv.find((a) => a.startsWith('--from-file='));

// SQL: migrations aplicadas no ledger, mais recentes primeiro
const SQL = `
  SELECT version::text, inserted_at::text
  FROM supabase_migrations.schema_migrations
  WHERE inserted_at < NOW() - INTERVAL '24 hours'
  ORDER BY inserted_at DESC
  LIMIT 200;
`.trim();

function loadSyncLog() {
  if (!existsSync(SYNC_LOG_PATH)) return null;
  return readFileSync(SYNC_LOG_PATH, 'utf8');
}

function validateSyncLogIntegrity(content) {
  if (!content || content.trim().length === 0) {
    return ['arquivo MIGRATIONS_SYNC_LOG.md está vazio'];
  }
  // Conta versões em linhas de tabela (1ª célula), não em cabeçalhos de seção.
  // Cabeçalhos como "## Recibos — ... (versão > `20260623111612`)" têm 14 dígitos
  // mas não são recibos individuais.
  const receiptLines = content.split('\n').filter((l) => {
    if (!l.trimStart().startsWith('|')) return false;
    const firstCell = l.split('|')[1] ?? '';
    return /`\d{14}/.test(firstCell);
  });
  if (receiptLines.length === 0) {
    return ['MIGRATIONS_SYNC_LOG.md não contém nenhuma linha de recibo em tabela'];
  }
  return [];
}

function hasReceiptForVersion(logContent, version) {
  // Usa word-boundary numérico para evitar falso positivo por substring.
  // Ex: versão "2026091615572" (13 dígitos) não faz match em "20260916155725".
  const re = new RegExp(`(?<!\\d)${version}(?!\\d)`);
  return re.test(logContent);
}

async function fetchLiveVersions() {
  const result = await querySupabaseReadOnly(SQL);
  if (result.kind !== 'live') {
    return { ...result, maskedUrl: maskUrl(result.target) };
  }
  return {
    kind: 'live',
    source: result.source,
    maskedUrl: maskUrl(result.target),
    versions: result.rows.map((r) => ({ version: r.version, inserted_at: r.inserted_at })),
  };
}

async function main() {
  const logContent = loadSyncLog();

  // ── Gate mode (sem live DB): valida só integridade estrutural do log ──────
  if (GATE_MODE && !fromFileArg) {
    if (!logContent) {
      process.stderr.write(
        `❌ migration-receipts: MIGRATIONS_SYNC_LOG.md não encontrado em ${SYNC_LOG_PATH}\n` +
          'O arquivo de recibos é obrigatório para o gate E055.\n',
      );
      process.exit(1);
    }

    const problems = validateSyncLogIntegrity(logContent);
    if (problems.length) {
      process.stderr.write(
        `❌ migration-receipts: ${problems.length} problema(s) no MIGRATIONS_SYNC_LOG.md:\n` +
          problems.map((p) => `   - ${p}`).join('\n') +
          '\n',
      );
      process.exit(1);
    }

    const receiptCount = logContent.split('\n').filter((l) => l.startsWith('## ') && /\d{14}/.test(l)).length;
    return concludeCheck({
      check: 'migration-receipts',
      status: CHECK_RESULT_STATUS.STATIC_PASS,
      summary: `MIGRATIONS_SYNC_LOG.md válido (${receiptCount} recibo(s)); sem live DB em --gate`,
      details: { receiptCount },
    });
  }

  // ── Live mode ─────────────────────────────────────────────────────────────
  if (!logContent) {
    process.stderr.write(
      `❌ migration-receipts: MIGRATIONS_SYNC_LOG.md ausente — gate bloqueado\n`,
    );
    process.exit(1);
  }

  let versionsToCheck;
  if (fromFileArg) {
    const p = fromFileArg.slice('--from-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    versionsToCheck = Array.isArray(raw) ? raw : raw.versions || [];
  } else {
    const live = await fetchLiveVersions();
    if (live.kind !== 'live') {
      if (live.kind === 'missing-config') {
        return concludeCheck({
          check: 'migration-receipts',
          status: REQUIRE_LIVE
            ? CHECK_RESULT_STATUS.INCONCLUSIVE
            : CHECK_RESULT_STATUS.STATIC_PASS,
          summary: REQUIRE_LIVE
            ? 'sem credenciais pg-meta; evidência live obrigatória não disponível'
            : 'sem credenciais pg-meta; verificação ficou em modo estático',
          details: { reason: live.kind, requireLive: REQUIRE_LIVE },
        });
      }
      return concludeCheck({
        check: 'migration-receipts',
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary: `pg-meta indisponível para consulta live (${live.kind})`,
        details: { reason: live.kind, maskedUrl: live.maskedUrl },
      });
    }
    versionsToCheck = live.versions;
  }

  const missing = versionsToCheck
    .map((v) => (typeof v === 'string' ? v : v.version))
    .filter((version) => !hasReceiptForVersion(logContent, version));

  if (missing.length > 0) {
    process.stderr.write(
      `❌ migration-receipts: ${missing.length} versão(ões) aplicada(s) há >24h sem recibo em MIGRATIONS_SYNC_LOG.md:\n` +
        missing.slice(0, 20).map((v) => `   - ${v}`).join('\n') +
        (missing.length > 20 ? `\n   ... e mais ${missing.length - 20}` : '') +
        '\n\nCorrija: registrar o recibo via scripts/append-migration-receipt.mjs ou pelo workflow db-apply-migration.yml\n',
    );
    process.exit(1);
  }

  const checked = versionsToCheck.length;
  process.stderr.write(
    `✅ migration-receipts: ${checked} versão(ões) verificada(s) — todas com recibo em MIGRATIONS_SYNC_LOG.md\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[migration-receipts] erro inesperado: ${err.message}\n`);
  process.exit(2);
});
