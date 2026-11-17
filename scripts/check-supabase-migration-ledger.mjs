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

function normalizedVersion(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const CANONICAL_PROJECT_REF = 'doufsxqlfjyuvxuezpln';

/**
 * Digest canônico das versões: calculado sobre o conjunto ORDENADO, para ser
 * invariante à ordem em que elas aparecem no arquivo. Detecta qualquer adição,
 * remoção ou alteração de versão.
 */
export function versionsDigest(versions) {
  const canonical = [...versions].sort((left, right) => left.localeCompare(right, 'en'));
  return createHash('sha256').update(canonical.join('\n')).digest('hex');
}

/**
 * Valida o lacre da allowlist remote_only e devolve as versões.
 *
 * Resgatado de codex/fix-db-migration-preflight-261107. Antes, o arquivo era lido
 * dentro de um try/catch silencioso: allowlist corrompida, apontando para outro
 * projeto ou com versão acrescentada à mão passava sem ninguém notar, e cada
 * versão nela deixa de bloquear o gate do ledger.
 *
 * Diferenças deliberadas em relação à branch de origem:
 *  - o digest é sobre o conjunto ordenado, não sobre a ordem do arquivo: as 681
 *    versões atuais não estão ordenadas e reordená-las seria um diff de 681
 *    linhas sem ganho;
 *  - `source` (workflow_run_id, artifact_id, …) fica OPCIONAL, porque o workflow
 *    que gera este arquivo ainda não emite esses campos e inventá-los seria
 *    fabricar procedência. Quando ele passar a emitir, basta exigir aqui.
 */
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

  const digest = versionsDigest(versions);
  if (document.versions_sha256 !== digest) {
    throw new Error(`allowlist inválida: versions_sha256 divergente; calculado=${digest}`);
  }
  for (const field of ['reason', 'approved_by']) {
    if (typeof document[field] !== 'string' || document[field].trim().length < 10) {
      throw new Error(`allowlist inválida: ${field} ausente ou insuficiente`);
    }
  }

  return versions;
}

function sample(values, limit = 20) {
  return values.slice(0, limit);
}

/**
 * Classifica a saída JSON de `supabase migration list --linked --output-format json`.
 *
 * @param {object} document  - Resultado de parseSupabaseMigrationLedgerOutput
 * @param {object} [opts]
 * @param {string[]} [opts.remoteOnlyAllowlist=[]] - Versões remote_only conhecidas que não bloqueiam.
 *   Usado para versões legacy (ex: 8 dígitos) que a CLI ignora no diretório local.
 */
export function auditSupabaseMigrationLedger(document, { remoteOnlyAllowlist = [] } = {}) {
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

  // A CLI pareia as listas de forma sequencial: depois do primeiro desalinhamento ela deixa
  // de casar versões iguais e lista a MESMA versão como local-only e remote-only em linhas
  // separadas (visto em 2026-11-12: 20261104100000 nas duas colunas). Versão presente nos
  // dois lados está aplicada E versionada — conta como alinhada, não como drift.
  // Subtração por CONTAGEM: cada versão remota casa no máximo com uma ocorrência local
  // (colisões legadas — 2 arquivos com a mesma versão e 1 aplicado — continuam com 1 local-only).
  const countOf = (list) => list.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map());
  const lc = countOf(localOnly);
  const rc = countOf(remoteOnly);
  const pairedLate = [];
  for (const [v, nr] of rc) {
    const k = Math.min(nr, lc.get(v) ?? 0);
    for (let n = 0; n < k; n += 1) pairedLate.push(v);
  }
  if (pairedLate.length) {
    matched += pairedLate.length;
    const take = (list, v, k) => {
      for (let i = list.length - 1, left = k; i >= 0 && left > 0; i -= 1) if (list[i] === v) { list.splice(i, 1); left -= 1; }
    };
    for (const [v, k] of countOf(pairedLate)) { take(localOnly, v, k); take(remoteOnly, v, k); }
  }

  const allowlistedRemoteOnly = remoteOnly.filter((v) => remoteOnlyAllowlist.includes(v));
  const blockingRemoteOnly = remoteOnly.filter((v) => !remoteOnlyAllowlist.includes(v));

  const summary = {
    schema_version: 1,
    source: 'supabase migration list --linked --output-format json',
    rows: document.migrations.length,
    matched,
    paired_late_count: pairedLate.length,
    local_only_count: localOnly.length,
    remote_only_count: remoteOnly.length,
    blocking_remote_only_count: blockingRemoteOnly.length,
    allowlisted_remote_only_count: allowlistedRemoteOnly.length,
    mismatched_count: mismatched.length,
    malformed_row_count: malformedRows.length,
    local_only_sample: sample(localOnly),
    remote_only_sample: sample(remoteOnly),
    blocking_remote_only_sample: sample(blockingRemoteOnly),
    allowlisted_remote_only_sample: sample(allowlistedRemoteOnly),
    mismatched_sample: sample(mismatched),
    malformed_row_sample: sample(malformedRows),
  };

  // local_only (migrations staged/pendentes) é estado normal e não bloqueia.
  // Apenas remote_only não-allowlistado, mismatched e malformed bloqueiam.
  return {
    ok:
      blockingRemoteOnly.length === 0 &&
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

  // Fail-closed: cada versão da allowlist deixa de bloquear o gate, então uma
  // allowlist que não valida precisa reprovar — não ser silenciosamente ignorada.
  let remoteOnlyAllowlist = [];
  const allowlistPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'migration-ledger-remote-only-allowlist.json',
  );
  try {
    remoteOnlyAllowlist = validateRemoteOnlyAllowlist(
      JSON.parse(readFileSync(allowlistPath, 'utf8')),
    );
  } catch (error) {
    const failure = {
      ok: false,
      error: `Não foi possível validar a allowlist remote_only: ${error.message}`,
      summary: null,
    };
    const failureOutput = JSON.stringify(failure, null, 2) + '\n';
    if (summaryPath) writeFileSync(resolve(summaryPath), failureOutput, 'utf8');
    else process.stdout.write(failureOutput);
    console.error(`[migration-ledger][erro] ${failure.error}`);
    return { exitCode: 2, result: failure };
  }

  const result = auditSupabaseMigrationLedger(document, { remoteOnlyAllowlist });
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
