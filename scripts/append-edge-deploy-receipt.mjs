#!/usr/bin/env node
/**
 * append-edge-deploy-receipt.mjs
 *
 * E66 (plano de 100 etapas, 2026-09-24) — grava uma linha nova na tabela
 * "## Recibos" de `supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md`, análogo a
 * `scripts/append-migration-receipt.mjs` (PLANO_DBA E15) para migrations.
 * O workflow chamador (`.github/workflows/deploy-edge-functions.yml`, job
 * `ledger`) é quem commita e abre o PR com o resultado — este script só
 * escreve o `.md` local.
 *
 * Uso:
 *   node scripts/append-edge-deploy-receipt.mjs \
 *     --slug=<slug> --version=<n|-> --sha=<git-sha> --run=<run-id> \
 *     --executor=<texto> --metodo=<texto> \
 *     [--log-path=<path>] [--data-utc=<iso>]
 *
 * Exit: 0 em sucesso, 1 se a seção "## Recibos" não existir no log (arquivo
 * renomeado/reformatado sem atualizar este script) ou faltar `--slug`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
export const DEFAULT_LOG_PATH = resolve(ROOT, 'supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md');
export const SECTION_HEADING = '## Recibos';

function codeCell(value) {
  return value && value !== '-' ? `\`${value}\`` : '—';
}

function plainCell(value) {
  return value && String(value).trim() !== '' ? value : '—';
}

export function formatReceiptRow({ dataUtc, slug, version, sha, run, executor, metodo }) {
  return `| ${plainCell(dataUtc)} | ${codeCell(slug)} | ${plainCell(version)} | ${codeCell(sha)} | ${plainCell(run)} | ${plainCell(executor)} | ${plainCell(metodo)} |`;
}

/**
 * Insere `row` como a última linha da tabela Markdown que segue `heading`
 * (antes do próximo `## `, ou do fim do arquivo). Função pura — testável sem
 * tocar o disco. Mesmo algoritmo de `append-migration-receipt.mjs`.
 */
export function appendReceiptRow({ logContent, heading = SECTION_HEADING, row }) {
  const lines = logContent.split('\n');
  const headingIdx = lines.findIndex((l) => l.trim() === heading);
  if (headingIdx === -1) {
    throw new Error(`seção "${heading}" não encontrada em EDGE_FUNCTIONS_DEPLOY_LOG.md.`);
  }

  let lastTableLineIdx = -1;
  for (let i = headingIdx + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) break;
    if (lines[i].trimStart().startsWith('|')) lastTableLineIdx = i;
  }
  if (lastTableLineIdx === -1) {
    throw new Error(`nenhuma tabela Markdown encontrada na seção "${heading}".`);
  }

  const newLines = [...lines];
  newLines.splice(lastTableLineIdx + 1, 0, row);
  return newLines.join('\n');
}

export function parseCliOptions(argv) {
  const opts = { logPath: DEFAULT_LOG_PATH, dataUtc: new Date().toISOString() };
  for (const arg of argv) {
    const match = /^--([a-z0-9-]+)=(.*)$/.exec(arg);
    if (!match) throw new Error(`Opção desconhecida: ${arg}.`);
    const [, key, value] = match;
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    opts[camel] = value;
  }
  if (!opts.slug) throw new Error('--slug=<slug> é obrigatório.');
  return opts;
}

export function runCli(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parseCliOptions(argv);
  } catch (error) {
    process.stderr.write(`[append-edge-deploy-receipt] erro: ${error.message}\n`);
    process.exit(1);
    return;
  }

  const logPath = opts.logPath;
  let logContent;
  try {
    logContent = readFileSync(logPath, 'utf8');
  } catch (error) {
    process.stderr.write(`[append-edge-deploy-receipt] erro ao ler ${logPath}: ${error.message}\n`);
    process.exit(1);
    return;
  }

  const row = formatReceiptRow(opts);

  let updated;
  try {
    updated = appendReceiptRow({ logContent, row });
  } catch (error) {
    process.stderr.write(`[append-edge-deploy-receipt] erro: ${error.message}\n`);
    process.exit(1);
    return;
  }

  writeFileSync(logPath, updated, 'utf8');
  process.stdout.write(`[append-edge-deploy-receipt] recibo de ${opts.slug} adicionado a ${logPath}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
