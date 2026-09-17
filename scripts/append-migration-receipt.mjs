#!/usr/bin/env node
/**
 * append-migration-receipt.mjs
 *
 * PLANO_DBA E15 — passo 5 do workflow de aplicação controlada
 * (`.github/workflows/db-apply-migration.yml`, job `receipt`): grava uma
 * linha nova na tabela "## Recibos — E15 (workflow de aplicação controlada)"
 * de `supabase/MIGRATIONS_SYNC_LOG.md`, seguindo o contrato de colunas
 * definido em "## Contrato (vigente a partir de 2026-09-16)" no mesmo
 * arquivo (ver E48).
 *
 * Só escreve texto local (`.md`) — não toca no banco. O workflow chamador é
 * quem abre o PR com o resultado (mesmo padrão de
 * `.github/workflows/schema-snapshot-export.yml`, job `weekly-live-drift`:
 * `git commit` + `git push` + `gh pr create`, não um merge direto em `main`).
 *
 * Uso:
 *   node scripts/append-migration-receipt.mjs \
 *     --version=<version> --sha256=<hash|--> --executor=<texto> \
 *     --metodo=E15 --data-utc=<texto> --pos-check=<texto> --status=<texto> \
 *     [--md5=<hash|-->] [--log-path=<path>]
 *
 * Exit: 0 em sucesso, 1 se a seção-alvo não existir no log (arquivo não foi
 * reformatado pela E48, ou a seção E15 ainda não foi criada).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
export const DEFAULT_LOG_PATH = resolve(ROOT, 'supabase/MIGRATIONS_SYNC_LOG.md');
export const SECTION_HEADING = '## Recibos — E15 (workflow de aplicação controlada)';

function cell(value) {
  return value && value !== '-' ? `\`${value}\`` : '—';
}

function plainCell(value) {
  return value && value.trim() !== '' ? value : '—';
}

export function formatReceiptRow({ version, sha256, md5, executor, metodo, dataUtc, posCheck, status }) {
  return `| ${cell(version)} | ${cell(sha256)} | ${cell(md5)} | ${plainCell(executor)} | ${plainCell(metodo)} | ${plainCell(dataUtc)} | ${plainCell(posCheck)} | ${plainCell(status)} |`;
}

/**
 * Insere `row` como a última linha da tabela Markdown que segue `heading`
 * (antes do próximo `## `, ou do fim do arquivo). Função pura — testável sem
 * tocar o disco.
 */
export function appendReceiptRow({ logContent, heading = SECTION_HEADING, row }) {
  const lines = logContent.split('\n');
  const headingIdx = lines.findIndex((l) => l.trim() === heading);
  if (headingIdx === -1) {
    throw new Error(`seção "${heading}" não encontrada em MIGRATIONS_SYNC_LOG.md.`);
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
  const opts = { logPath: DEFAULT_LOG_PATH };
  for (const arg of argv) {
    const match = /^--([a-z0-9-]+)=(.*)$/.exec(arg);
    if (!match) throw new Error(`Opção desconhecida: ${arg}.`);
    const [, key, value] = match;
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    opts[camel] = value;
  }
  if (!opts.version) throw new Error('--version=<version> é obrigatório.');
  return opts;
}

export function runCli(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parseCliOptions(argv);
  } catch (error) {
    process.stderr.write(`[append-migration-receipt] erro: ${error.message}\n`);
    process.exit(1);
    return;
  }

  const logPath = opts.logPath;
  let logContent;
  try {
    logContent = readFileSync(logPath, 'utf8');
  } catch (error) {
    process.stderr.write(`[append-migration-receipt] erro ao ler ${logPath}: ${error.message}\n`);
    process.exit(1);
    return;
  }

  const row = formatReceiptRow(opts);

  let updated;
  try {
    updated = appendReceiptRow({ logContent, row });
  } catch (error) {
    process.stderr.write(`[append-migration-receipt] erro: ${error.message}\n`);
    process.exit(1);
    return;
  }

  writeFileSync(logPath, updated, 'utf8');
  process.stdout.write(`[append-migration-receipt] recibo de ${opts.version} adicionado a ${logPath}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
