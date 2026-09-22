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
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizedVersion(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sample(values, limit = 20) {
  return values.slice(0, limit);
}

/**
 * Classifica a saída JSON de `supabase migration list --linked --output-format json`.
 */
export function auditSupabaseMigrationLedger(document) {
  if (!document || typeof document !== 'object' || !Array.isArray(document.migrations)) {
    return {
      ok: false,
      error: 'Formato inválido: esperado objeto com array migrations.',
      summary: null,
    };
  }

  const malformedRows = [];
  const localOnly = [];
  const remoteOnly = [];
  const mismatched = [];
  let matched = 0;

  document.migrations.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      malformedRows.push({ index, reason: 'linha não é objeto' });
      return;
    }

    const local = normalizedVersion(row.local);
    const remote = normalizedVersion(row.remote);
    if (!local && !remote) {
      malformedRows.push({ index, reason: 'local e remote vazios' });
    } else if (local && remote && local === remote) {
      matched += 1;
    } else if (local && !remote) {
      localOnly.push(local);
    } else if (!local && remote) {
      remoteOnly.push(remote);
    } else {
      mismatched.push({ local, remote });
    }
  });

  const summary = {
    schema_version: 1,
    source: 'supabase migration list --linked --output-format json',
    rows: document.migrations.length,
    matched,
    local_only_count: localOnly.length,
    remote_only_count: remoteOnly.length,
    mismatched_count: mismatched.length,
    malformed_row_count: malformedRows.length,
    local_only_sample: sample(localOnly),
    remote_only_sample: sample(remoteOnly),
    mismatched_sample: sample(mismatched),
    malformed_row_sample: sample(malformedRows),
  };

  return {
    ok:
      localOnly.length === 0 &&
      remoteOnly.length === 0 &&
      mismatched.length === 0 &&
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

export function runCli(argv = process.argv.slice(2)) {
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

  const result = auditSupabaseMigrationLedger(document);
  const output = JSON.stringify(result, null, 2) + '\n';
  if (summaryPath) writeFileSync(resolve(summaryPath), output, 'utf8');
  else process.stdout.write(output);

  if (!result.ok) {
    const details = result.summary
      ? `local_only=${result.summary.local_only_count}; remote_only=${result.summary.remote_only_count}; mismatched=${result.summary.mismatched_count}; malformed=${result.summary.malformed_row_count}`
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
  try {
    process.exitCode = runCli().exitCode;
  } catch (error) {
    console.error(`[migration-ledger][erro] ${error.message}`);
    process.exitCode = 2;
  }
}
