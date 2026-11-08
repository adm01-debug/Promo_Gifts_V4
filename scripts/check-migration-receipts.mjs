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
import { fileURLToPath, pathToFileURL } from 'node:url';
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

// SQL: migrations aplicadas no ledger.
// NOTA: supabase_migrations.schema_migrations NÃO tem coluna `inserted_at`.
// Colunas reais: version, statements, name, created_by, idempotency_key, rollback.
// O filtro de ">24h" é feito em JS parseando os 14 dígitos do version (YYYYMMDDHHMMSS).
export const SQL = `
  SELECT version::text
  FROM supabase_migrations.schema_migrations
  ORDER BY version DESC
`.trim();

/** Retorna true se version (formato YYYYMMDDHHMMSS, 14 dígitos) foi aplicada há >24h. */
export function isOlderThan24h(version) {
  if (typeof version !== 'string' || version.length < 14) return true;
  const y = version.slice(0, 4);
  const mo = version.slice(4, 6);
  const d = version.slice(6, 8);
  const h = version.slice(8, 10);
  const mi = version.slice(10, 12);
  const s = version.slice(12, 14);
  const vDate = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  return !Number.isNaN(vDate.getTime()) && Date.now() - vDate.getTime() > 24 * 60 * 60 * 1000;
}

function loadSyncLog() {
  if (!existsSync(SYNC_LOG_PATH)) return null;
  return readFileSync(SYNC_LOG_PATH, 'utf8');
}

export function getReceiptLines(content) {
  if (!content) return [];
  const lines = content.split('\n');
  const sectionStart = lines.findIndex((line) => /^## Recibos — aplicações confirmadas\b/.test(line));
  if (sectionStart === -1) return [];
  const sectionEnd = lines.findIndex((line, index) => index > sectionStart && /^## /.test(line));
  return lines.slice(sectionStart + 1, sectionEnd === -1 ? undefined : sectionEnd).filter((line) => {
    if (!line.trimStart().startsWith('|')) return false;
    const firstCell = line.split('|')[1] ?? '';
    // The canonical ledger uses 14 digits, but E09 documented one historical
    // 19-digit version. Keep the receipt row visible rather than losing it.
    return /^\s*`\d{8,19}`\s*$/.test(firstCell);
  });
}

export function getReceiptCutoff(content) {
  const section = content?.match(/^## Recibos — aplicações confirmadas[^\n]*$/m)?.[0];
  return section?.match(/canônica\s*>\s*`(\d{14})`/)?.[1] ?? null;
}

export function validateSyncLogIntegrity(content) {
  if (!content || content.trim().length === 0) {
    return ['arquivo MIGRATIONS_SYNC_LOG.md está vazio'];
  }
  // Conta versões em linhas de tabela (1ª célula), não em cabeçalhos de seção.
  // Cabeçalhos como "## Recibos — ... (versão > `20260623111612`)" têm 14 dígitos
  // mas não são recibos individuais.
  if (getReceiptLines(content).length === 0) {
    return ['MIGRATIONS_SYNC_LOG.md não contém nenhuma linha de recibo em tabela'];
  }
  if (!getReceiptCutoff(content)) {
    return ['MIGRATIONS_SYNC_LOG.md não declara o cutoff da seção vigente de recibos'];
  }
  return [];
}

export function hasReceiptForVersion(logContent, version) {
  // Usa word-boundary numérico para evitar falso positivo por substring.
  // Ex: versão "2026091615572" (13 dígitos) não faz match em "20260916155725".
  const re = new RegExp(`(?<!\\d)${version}(?!\\d)`);
  // Linha "pendente-only" (contém a versão mas apenas status pendente, sem "aplicada")
  // NÃO conta como recibo — a migration ainda não foi efetivada em produção.
  // A mention in prose or in a non-version cell is not a receipt. Count only
  // structured table rows whose first cell is the exact migration version.
  const lines = getReceiptLines(logContent).filter((line) => re.test(line.split('|')[1] ?? ''));
  if (lines.length === 0) return false;
  return lines.some((l) => {
    if (!/pendente/i.test(l)) return true;
    // Tem "pendente" — só conta se também tem "aplicada" positivo (não "não aplicada")
    return /\baplicada\b/i.test(l) && !/não\s+aplicada/i.test(l);
  });
}

export function countReceiptLines(logContent) {
  return getReceiptLines(logContent).length;
}

export function filterEligibleReceiptVersions(logContent, versions) {
  const cutoff = getReceiptCutoff(logContent);
  if (!cutoff) return [];

  const explicitlyDocumentedNoncanonical = new Set(
    getReceiptLines(logContent)
      .map((line) => line.split('|')[1]?.trim().match(/^`([^`]+)`$/)?.[1])
      .filter((version) => version && !/^\d{14}$/.test(version)),
  );

  return versions.map((item) => (typeof item === 'string' ? item : item.version)).filter((version) => {
    if (typeof version !== 'string') return false;
    if (/^\d{14}$/.test(version)) return version > cutoff;
    // Noncanonical IDs are eligible only when they have an explicit, applied
    // row in the current receipt table. Mentions in the legacy narrative and
    // pending-only rows do not count.
    return explicitlyDocumentedNoncanonical.has(version) && hasReceiptForVersion(logContent, version);
  });
}

export function findMissingReceiptVersions(logContent, versions) {
  return filterEligibleReceiptVersions(logContent, versions)
    .filter((version) => !hasReceiptForVersion(logContent, version));
}

/** Converts a live query result into an explicit gate result. */
export function evaluateLiveReceiptCoverage({ logContent, live, requireLive = false }) {
  const receiptCount = countReceiptLines(logContent);

  if (live.kind === 'missing-config') {
    return {
      check: 'migration-receipts',
      status: requireLive ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
      summary: requireLive
        ? 'sem credenciais pg-meta; evidência live obrigatória não disponível'
        : `MIGRATIONS_SYNC_LOG.md contém ${receiptCount} linha(s) tabular(es); sem credenciais para consulta live`,
      details: { reason: live.kind, requireLive, receiptCount },
    };
  }

  if (live.kind !== 'live') {
    return {
      check: 'migration-receipts',
      status: CHECK_RESULT_STATUS.INCONCLUSIVE,
      summary: `pg-meta indisponível para consulta live (${live.kind})`,
      details: { reason: live.kind, maskedUrl: maskUrl(live.target), receiptCount },
    };
  }

  const eligibleVersions = filterEligibleReceiptVersions(logContent, live.versions);
  const missing = findMissingReceiptVersions(logContent, eligibleVersions);
  if (missing.length > 0) {
    return {
      check: 'migration-receipts',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${missing.length} versão(ões) aplicada(s) há >24h sem recibo em MIGRATIONS_SYNC_LOG.md`,
      details: {
        missing: missing.slice(0, 20),
        additionalMissing: Math.max(0, missing.length - 20),
        checked: eligibleVersions.length,
        source: live.source,
        maskedUrl: live.maskedUrl,
        receiptCount,
      },
    };
  }

  return {
    check: 'migration-receipts',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${eligibleVersions.length} migration(s) elegíveis >24h verificadas; todas têm recibo tabular`,
    details: {
      checked: eligibleVersions.length,
      source: live.source,
      maskedUrl: live.maskedUrl,
      receiptCount,
    },
  };
}

async function fetchLiveVersions() {
  const result = await querySupabaseReadOnly(SQL);
  if (result.kind !== 'live') {
    return { ...result, maskedUrl: maskUrl(result.target) };
  }
  // Filtra lado JS: só versões aplicadas há >24h (sem `inserted_at` no schema).
  const allVersions = result.rows.map((r) => r.version).filter(Boolean);
  const versions = allVersions.filter(isOlderThan24h);
  return {
    kind: 'live',
    source: result.source,
    maskedUrl: maskUrl(result.target),
    versions,
  };
}

async function main() {
  const logContent = loadSyncLog();

  // ── Gate mode: valida integridade e consulta o ledger quando há credenciais ─
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

    const live = await fetchLiveVersions();
    const evaluation = evaluateLiveReceiptCoverage({
      logContent,
      live,
      requireLive: REQUIRE_LIVE,
    });
    if (evaluation.status === CHECK_RESULT_STATUS.FAILED) {
      const missing = evaluation.details.missing ?? [];
      process.stderr.write(
        `❌ migration-receipts: ${evaluation.summary}:\n` +
          missing.map((v) => `   - ${v}`).join('\n') +
          (evaluation.details.additionalMissing
            ? `\n   ... e mais ${evaluation.details.additionalMissing}`
            : '') +
          '\n\nCorrija: registrar o recibo via scripts/append-migration-receipt.mjs ou pelo workflow db-apply-migration.yml\n',
      );
      process.exit(1);
    }
    return concludeCheck(evaluation);
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

  const missing = findMissingReceiptVersions(logContent, versionsToCheck);

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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    process.stderr.write(`[migration-receipts] erro inesperado: ${err.message}\n`);
    process.exit(2);
  });
}
