#!/usr/bin/env node
/**
 * Compara o ledger de migrations devolvido pelo Supabase CLI com a árvore
 * local, sem executar SQL e sem alterar o banco.
 *
 * O `supabase db diff` recria um shadow database a partir de TODOS os
 * arquivos locais. Portanto, antes de interpretar um diff, é obrigatório
 * saber se esses arquivos estão no mesmo ledger do projeto canônico. Um
 * arquivo local que não foi aplicado não é automaticamente seguro para
 * `db push` — ele exige reconciliação semântica e autorização explícita.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

function normalizedVersion(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sample(values, limit = 20) {
  return values.slice(0, limit);
}

const CANONICAL_PROJECT_REF = 'doufsxqlfjyuvxuezpln';

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'en'));
}

export function versionsDigest(versions) {
  return createHash('sha256').update(versions.join('\n')).digest('hex');
}

export function validateRemoteOnlyAllowlist(
  document,
  { expectedProjectRef = CANONICAL_PROJECT_REF } = {},
) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('allowlist inválida: esperado objeto JSON');
  }
  if (document.schema_version !== 1) {
    throw new Error('allowlist inválida: schema_version deve ser 1');
  }
  if (document.project_ref !== expectedProjectRef) {
    throw new Error(
      `allowlist inválida: project_ref=${document.project_ref ?? 'ausente'}; esperado=${expectedProjectRef}`,
    );
  }
  if (!Array.isArray(document.versions) || document.versions.length === 0) {
    throw new Error('allowlist inválida: versions deve ser array não vazio');
  }

  const versions = document.versions.map(normalizedVersion);
  if (versions.some((version) => !version)) {
    throw new Error('allowlist inválida: versions contém valor vazio/não textual');
  }
  if (new Set(versions).size !== versions.length) {
    throw new Error('allowlist inválida: versions contém duplicatas');
  }
  if (JSON.stringify(versions) !== JSON.stringify(sorted(versions))) {
    throw new Error('allowlist inválida: versions deve estar ordenado');
  }
  const digest = versionsDigest(versions);
  if (document.versions_sha256 !== digest) {
    throw new Error(`allowlist inválida: versions_sha256 divergente; calculado=${digest}`);
  }
  if (!document.source || typeof document.source !== 'object') {
    throw new Error('allowlist inválida: source é obrigatório');
  }
  for (const field of ['workflow_run_id', 'artifact_id', 'artifact_sha256', 'checked_at']) {
    if (!document.source[field]) {
      throw new Error(`allowlist inválida: source.${field} é obrigatório`);
    }
  }
  for (const field of ['reason', 'approved_by']) {
    if (typeof document[field] !== 'string' || document[field].trim().length < 10) {
      throw new Error(`allowlist inválida: ${field} ausente ou insuficiente`);
    }
  }
  return versions;
}

/**
 * Classifica a saída JSON de `supabase migration list --linked --output-format json`.
 *
 * @param {object} document  - Resultado de parseSupabaseMigrationLedgerOutput
 * @param {object} [opts]
 * @param {string[]} [opts.remoteOnlyAllowlist=[]] - Versões remote_only conhecidas que não bloqueiam.
 *   Usado para versões legacy (ex: 8 dígitos) que a CLI ignora no diretório local.
 * @param {string[]|null} [opts.authoritativeRemoteVersions=null] - Ledger obtido por SELECT
 *   read-only. Quando presente, substitui a coluna remota incompleta da CLI.
 */
export function auditSupabaseMigrationLedger(
  document,
  { remoteOnlyAllowlist = [], authoritativeRemoteVersions = null } = {},
) {
  if (!document || typeof document !== 'object' || !Array.isArray(document.migrations)) {
    return {
      ok: false,
      error: 'Formato inválido: esperado objeto com array migrations.',
      summary: null,
    };
  }

  const malformedRows = [];
  const localVersions = new Set();
  const remoteVersions = new Set();
  const rowAlignmentMismatches = [];

  document.migrations.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      malformedRows.push({ index, reason: 'linha não é objeto' });
      return;
    }

    const local = normalizedVersion(row.local);
    const remote = normalizedVersion(row.remote);
    if (!local && !remote) {
      malformedRows.push({ index, reason: 'local e remote vazios' });
    } else {
      if (local) localVersions.add(local);
      if (remote) remoteVersions.add(remote);
      if (local && remote && local !== remote) {
        rowAlignmentMismatches.push({ local, remote });
      }
    }
  });

  if (authoritativeRemoteVersions !== null) {
    if (!Array.isArray(authoritativeRemoteVersions)) {
      malformedRows.push({ index: 'live', reason: 'ledger remoto autoritativo não é array' });
    } else {
      remoteVersions.clear();
      authoritativeRemoteVersions.forEach((value, index) => {
        const version = normalizedVersion(value);
        if (!version) {
          malformedRows.push({ index: `live:${index}`, reason: 'version remota vazia' });
        } else {
          remoteVersions.add(version);
        }
      });
    }
  }

  // A CLI 2.101 pode imprimir uma versão aplicada via migration repair em
  // duas linhas distintas (local=v/remote='' e local=''/remote=v). Linhas não
  // representam pares semânticos; o ledger correto é a diferença dos conjuntos
  // globais. Comparar linha a linha transforma versões presentes dos dois lados
  // em falsos local_only + remote_only e impede o db diff real de executar.
  const matchedVersions = sorted([...localVersions].filter((v) => remoteVersions.has(v)));
  const localOnly = sorted([...localVersions].filter((v) => !remoteVersions.has(v)));
  const remoteOnly = sorted([...remoteVersions].filter((v) => !localVersions.has(v)));

  const allowlistedRemoteOnly = remoteOnly.filter((v) => remoteOnlyAllowlist.includes(v));
  const blockingRemoteOnly = remoteOnly.filter((v) => !remoteOnlyAllowlist.includes(v));
  const staleAllowlistedRemoteOnly = remoteOnlyAllowlist.filter((v) => !remoteOnly.includes(v));

  const summary = {
    schema_version: 1,
    source: 'supabase migration list --linked --output-format json',
    remote_source:
      authoritativeRemoteVersions === null ? 'supabase-cli' : 'management-api-read-only-query',
    rows: document.migrations.length,
    local_version_count: localVersions.size,
    remote_version_count: remoteVersions.size,
    matched: matchedVersions.length,
    local_only_count: localOnly.length,
    remote_only_count: remoteOnly.length,
    blocking_remote_only_count: blockingRemoteOnly.length,
    allowlisted_remote_only_count: allowlistedRemoteOnly.length,
    stale_allowlisted_remote_only_count: staleAllowlistedRemoteOnly.length,
    // Diagnóstico do layout textual, não um conflito semântico. A mesma versão
    // pode aparecer em outra linha e reconciliar normalmente por conjunto.
    mismatched_count: rowAlignmentMismatches.length,
    malformed_row_count: malformedRows.length,
    local_only_sample: sample(localOnly),
    remote_only_sample: sample(remoteOnly),
    blocking_remote_only_sample: sample(blockingRemoteOnly),
    allowlisted_remote_only_sample: sample(allowlistedRemoteOnly),
    stale_allowlisted_remote_only_sample: sample(staleAllowlistedRemoteOnly),
    mismatched_sample: sample(rowAlignmentMismatches),
    malformed_row_sample: sample(malformedRows),
  };

  // local_only (migrations staged/pendentes) é estado normal e não bloqueia.
  // Apenas remote_only não-allowlistado, exceção obsoleta e entrada malformed
  // bloqueiam. O desalinhamento de colunas é diagnóstico do layout da CLI,
  // não pareamento. Exceção obsoleta falha fechado para manter o manifesto
  // estreito e forçar revisão quando o ledger mudar.
  return {
    ok:
      blockingRemoteOnly.length === 0 &&
      staleAllowlistedRemoteOnly.length === 0 &&
      malformedRows.length === 0,
    error: null,
    summary,
  };
}

/**
 * A CLI 2.101.0 usada no Actions ignora `--output-format json` neste comando
 * e devolve a tabela textual. Versões recentes devolvem JSON. Aceitamos ambos
 * os formatos porque a semântica do gate não pode depender dessa variação do
 * cliente; qualquer formato desconhecido continua sendo bloqueante.
 */
export function parseSupabaseMigrationLedgerOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) throw new Error('saída vazia do supabase migration list');

  try {
    return JSON.parse(trimmed);
  } catch {
    // Compatibilidade com a tabela de `supabase migration list`.
  }

  const migrations = [];
  for (const line of output.split('\n')) {
    if (!line.includes('|')) continue;
    const cells = line.split('|').map((cell) => cell.replaceAll('`', '').trim());
    if (cells.length < 3) continue;

    const [local, remote, time] = cells;
    const looksLikeHeader = local.toLowerCase() === 'local' && remote.toLowerCase() === 'remote';
    const looksLikeDivider = /^-+$/.test(local) && /^-+$/.test(remote);
    if (looksLikeHeader || looksLikeDivider || (!local && !remote)) continue;
    migrations.push({ local, remote, time });
  }

  if (migrations.length === 0) {
    throw new Error('saída não é JSON nem tabela reconhecida de migration list');
  }
  return { migrations };
}

export function parseCliOptions(argv) {
  const options = { inputPath: null, summaryPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--summary') {
      options.summaryPath = argv[index + 1] ?? null;
      index += 1;
    } else if (!arg.startsWith('-') && !options.inputPath) {
      options.inputPath = arg;
    } else {
      throw new Error(`Argumento inválido: ${arg}`);
    }
  }
  if (!options.inputPath) {
    throw new Error(
      'Uso: node scripts/check-supabase-migration-ledger.mjs <ledger.json> [--summary <saida.json>]',
    );
  }
  if (options.summaryPath === null && argv.includes('--summary')) {
    throw new Error('--summary exige um caminho de saída.');
  }
  return options;
}

export async function runCli(argv = process.argv.slice(2)) {
  const { inputPath, summaryPath } = parseCliOptions(argv);
  let document;
  try {
    document = parseSupabaseMigrationLedgerOutput(readFileSync(resolve(inputPath), 'utf8'));
  } catch (error) {
    const result = {
      ok: false,
      error: `Não foi possível ler o ledger JSON: ${error.message}`,
      summary: null,
    };
    console.error(`[migration-ledger][erro] ${result.error}`);
    return { exitCode: 2, result };
  }

  let remoteOnlyAllowlist;
  try {
    const allowlistPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      'migration-ledger-remote-only-allowlist.json',
    );
    remoteOnlyAllowlist = validateRemoteOnlyAllowlist(
      JSON.parse(readFileSync(allowlistPath, 'utf8')),
    );
  } catch (error) {
    const result = {
      ok: false,
      error: `Não foi possível validar a allowlist remote_only: ${error.message}`,
      summary: null,
    };
    if (summaryPath) {
      writeFileSync(resolve(summaryPath), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }
    console.error(`[migration-ledger][erro] ${result.error}`);
    return { exitCode: 2, result };
  }

  const liveLedger = await querySupabaseReadOnly(
    'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;',
  );
  if (liveLedger.kind !== 'live') {
    const result = {
      ok: false,
      error: `Ledger remoto autoritativo indisponível: kind=${liveLedger.kind}`,
      summary: null,
    };
    if (summaryPath) {
      writeFileSync(resolve(summaryPath), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }
    console.error(`[migration-ledger][erro] ${result.error}`);
    return { exitCode: 2, result };
  }

  const authoritativeRemoteVersions = liveLedger.rows.map((row) => row?.version);
  const result = auditSupabaseMigrationLedger(document, {
    remoteOnlyAllowlist,
    authoritativeRemoteVersions,
  });
  const output = JSON.stringify(result, null, 2) + '\n';
  if (summaryPath) writeFileSync(resolve(summaryPath), output, 'utf8');
  else process.stdout.write(output);

  if (!result.ok) {
    const details = result.summary
      ? `local_only=${result.summary.local_only_count}; remote_only=${result.summary.remote_only_count}; blocking_remote_only=${result.summary.blocking_remote_only_count}; stale_allowlist=${result.summary.stale_allowlisted_remote_only_count}; malformed=${result.summary.malformed_row_count}`
      : result.error;
    console.error(`[migration-ledger][bloqueado] ${details}`);
    return { exitCode: 1, result };
  }

  console.error(`[migration-ledger][ok] ${result.summary.matched} versões alinhadas.`);
  return { exitCode: 0, result };
}

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  runCli()
    .then(({ exitCode }) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(`[migration-ledger][erro] ${error.message}`);
      process.exitCode = 2;
    });
}
