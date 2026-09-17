#!/usr/bin/env node
/**
 * check-migrations-sync-log-gate.mjs
 *
 * Etapa E48 (docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md,
 * §E48). `supabase/MIGRATIONS_SYNC_LOG.md` deixou de ser narrativa
 * ("sincronizado", sem hash) e virou um contrato de recibo tabular: uma linha
 * por aplicação real de migration, com `versão` identificável entre crases
 * markdown (`` `20260916155725` ``) em alguma das tabelas do arquivo (a
 * principal "Recibos", ou as agregadas de E08/E09).
 *
 * O que este gate verifica: todo arquivo `.sql` novo/modificado em
 * `supabase/migrations/**` no diff de uma PR precisa ter sua `versão`
 * (prefixo numérico do nome do arquivo) registrada em pelo menos uma tabela
 * de `supabase/MIGRATIONS_SYNC_LOG.md`. Não valida hash nem semântica — só
 * que o recibo foi escrito (lembrete estrutural, não prova criptográfica; a
 * prova de aplicação real é o `mcp__supabase__execute_sql` usado para
 * popular o log — ver seção "Backfill retroativo" do próprio arquivo).
 *
 * 100% local/git — não depende de nenhuma credencial Supabase, então roda
 * sempre. Graceful degradation (mesmo contrato de check-result-contract.mjs)
 * só se aplica a falhas de infraestrutura do próprio git (ex.: clone raso
 * sem a base da PR disponível) — nesse caso o resultado é `inconclusive`
 * (exit 2), nunca um `passed` silencioso nem um `failed` por causa alheia ao
 * conteúdo da PR.
 *
 * Uso:
 *   node scripts/check-migrations-sync-log-gate.mjs [--base=<ref>] [--json]
 *
 * Em CI: GITHUB_BASE_REF já vem preenchido pelo runner em eventos
 * `pull_request` (mesmo padrão de scripts/check-security-definer-hardening.mjs).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHECK_RESULT_STATUS, concludeCheck } from './check-result-contract.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CHECK_NAME = 'migrations-sync-log-gate';
export const LOG_RELATIVE_PATH = 'supabase/MIGRATIONS_SYNC_LOG.md';
export const MIGRATIONS_RELATIVE_DIR = 'supabase/migrations';
export const MIGRATION_PATH_PREFIX = `${MIGRATIONS_RELATIVE_DIR}/`;

/**
 * Casa qualquer token entre crases markdown que pareça uma `versão` de
 * migration: 8 a 19 dígitos consecutivos, seguidos opcionalmente de um ou
 * mais sufixos `_palavra` (cobre o canônico de 14 dígitos, o malformado de
 * 19 dígitos documentado pela E09 — `2026062311292414001` — e os IDs
 * não-canônicos tipo `20260623_bugalert1` ou
 * `20260623_fix_google_provider_secret_name`). Hashes SHA-256 (64 hex) e MD5
 * (32 hex) não colidem com este padrão: para bater, o conteúdo INTEIRO entre
 * as crases precisaria ser só dígitos (ou dígitos + sufixos `_palavra`), o
 * que hex com letras a-f misturadas quebra quase sempre na prática — e
 * nenhum hash real do arquivo colide (checado nesta sessão).
 */
export const REGISTERED_VERSION_RE = /`(\d{8,19}(?:_[A-Za-z0-9]+)*)`/g;

export function extractMigrationVersion(filename) {
  const match = /^(\d{6,19})_/.exec(filename);
  return match ? match[1] : null;
}

export function extractRegisteredVersions(logContent) {
  const versions = new Set();
  for (const match of logContent.matchAll(REGISTERED_VERSION_RE)) {
    versions.add(match[1]);
  }
  return versions;
}

/** Filtra a saída de `git diff --name-only` para arquivos `.sql` dentro de supabase/migrations/, devolvendo só o nome do arquivo (sem o prefixo do diretório). */
export function changedMigrationFilenames(diffOutput) {
  return diffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => path.startsWith(MIGRATION_PATH_PREFIX) && path.endsWith('.sql'))
    .map((path) => path.slice(MIGRATION_PATH_PREFIX.length));
}

/**
 * Função pura central do gate: dado o conjunto de arquivos de migration
 * alterados (nome, não caminho completo) e o conteúdo de
 * MIGRATIONS_SYNC_LOG.md, decide quais não têm recibo.
 */
export function evaluateSyncLogGate({ changedFilenames, logContent }) {
  const registered = extractRegisteredVersions(logContent);
  const missing = [];

  for (const filename of changedFilenames) {
    const version = extractMigrationVersion(filename);
    if (!version) {
      missing.push({ filename, version: null, reason: 'version_unparseable' });
      continue;
    }
    if (!registered.has(version)) {
      missing.push({ filename, version, reason: 'version_not_registered' });
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    checkedCount: changedFilenames.length,
    registeredCount: registered.size,
  };
}

export function resolveBaseRef(env = process.env) {
  return env.GITHUB_BASE_REF || env.MIGRATIONS_SYNC_LOG_GATE_BASE_REF || 'main';
}

/**
 * Tenta, em ordem: `origin/<base>...HEAD` (PR normal em CI, checkout com
 * fetch-depth:0), `<base>...HEAD` (base local sem remote), `HEAD~1...HEAD`
 * (push direto sem PR aberto, ex. sessão local). A primeira que não lançar
 * vence; se todas lançarem, propaga o último erro para o chamador decidir
 * `inconclusive`.
 */
function runGitDiff({ baseRef, cwd }) {
  const candidates = [`origin/${baseRef}...HEAD`, `${baseRef}...HEAD`, 'HEAD~1...HEAD'];
  let lastError = null;
  for (const range of candidates) {
    try {
      return execFileSync(
        'git',
        ['diff', '--name-only', '--diff-filter=ACMR', range, '--', MIGRATIONS_RELATIVE_DIR],
        { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('git diff falhou para todos os candidatos de base ref.');
}

/**
 * Orquestração com I/O real, mas com pontos de injeção (`diffOutput`,
 * `logContent`) para testes rodarem sem git nem filesystem de verdade —
 * mesmo padrão de `rows` injetável em check-ledger-statements-gate.mjs.
 */
export function runCheck({
  root = ROOT,
  env = process.env,
  diffOutput: injectedDiffOutput = null,
  logContent: injectedLogContent = null,
} = {}) {
  const logPath = resolve(root, LOG_RELATIVE_PATH);

  let logContent = injectedLogContent;
  if (logContent === null) {
    if (!existsSync(logPath)) {
      return {
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary: `${LOG_RELATIVE_PATH} não encontrado — não é possível validar recibos.`,
        details: { logPath },
      };
    }
    logContent = readFileSync(logPath, 'utf8');
  }

  const baseRef = resolveBaseRef(env);
  let diffOutput = injectedDiffOutput;
  if (diffOutput === null) {
    try {
      diffOutput = runGitDiff({ baseRef, cwd: root });
    } catch (error) {
      return {
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary:
          `Não foi possível calcular o diff de ${MIGRATIONS_RELATIVE_DIR} contra a base ` +
          `(${baseRef}): ${String(error.message ?? error).split('\n')[0]}`,
        details: { baseRef },
      };
    }
  }

  const changedFilenames = changedMigrationFilenames(diffOutput);
  if (changedFilenames.length === 0) {
    return {
      status: CHECK_RESULT_STATUS.PASSED,
      summary: `Nenhum arquivo de ${MIGRATIONS_RELATIVE_DIR} alterado neste diff — gate não se aplica.`,
      details: { baseRef, changedCount: 0 },
    };
  }

  const result = evaluateSyncLogGate({ changedFilenames, logContent });

  if (result.ok) {
    return {
      status: CHECK_RESULT_STATUS.PASSED,
      summary:
        `${changedFilenames.length} migration(ões) alterada(s) — todas têm recibo em ` +
        `${LOG_RELATIVE_PATH} (${result.registeredCount} versões registradas no log).`,
      details: { baseRef, changedCount: changedFilenames.length, registeredCount: result.registeredCount },
    };
  }

  return {
    status: CHECK_RESULT_STATUS.FAILED,
    summary:
      `${result.missing.length}/${changedFilenames.length} migration(ões) alterada(s) SEM recibo em ` +
      `${LOG_RELATIVE_PATH}: ${result.missing.map((m) => m.filename).join(', ')}`,
    details: { baseRef, missing: result.missing },
  };
}

export function printUsage() {
  console.log(`Uso: node scripts/check-migrations-sync-log-gate.mjs [opções]

Falha (exit 1) se um PR que altera ${MIGRATIONS_RELATIVE_DIR}/**.sql não tiver
uma linha correspondente (por \`versão\`, entre crases) em ${LOG_RELATIVE_PATH}.

Opções:
  --base <ref>   base a comparar (padrão: $GITHUB_BASE_REF ou "main")
  --json         emite detalhes em JSON no stdout, além do resultado padrão
  --help, -h     mostra esta ajuda

Graceful degradation: se o log não existir, ou o \`git diff\` não puder ser
calculado (ex.: clone raso sem a base disponível), o check devolve
"inconclusive" (exit 2) em vez de passar ou falhar silenciosamente por uma
causa alheia ao conteúdo da PR.`);
}

export function parseCliOptions(argv = process.argv.slice(2)) {
  let base = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      json = true;
      continue;
    }
    if (argument === '--base') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--base exige um valor.');
      base = value;
      index += 1;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      return { help: true };
    }
    throw new Error(`Opção desconhecida: ${argument}.`);
  }

  return { help: false, json, base };
}

export function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCliOptions(argv);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    printUsage();
    process.exit(2);
    return;
  }

  if (options.help) {
    printUsage();
    process.exit(0);
    return;
  }

  const env = options.base ? { ...process.env, GITHUB_BASE_REF: options.base } : process.env;
  const result = runCheck({ env });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  concludeCheck({ check: CHECK_NAME, ...result });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
