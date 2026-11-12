#!/usr/bin/env node
/**
 * ssot-report-annotations.mjs
 *
 * Lê ssot-report.json e emite workflow commands do GitHub Actions
 * (`::error` / `::warning`) para cada gate que falhou, tentando
 * extrair file/line/col do stdout+stderr.
 *
 * Padrões reconhecidos:
 *   path/to/file.ext:LINE:COL: msg
 *   path/to/file.ext:LINE: msg
 *   path/to/file.ext(LINE,COL): msg
 *   at path/to/file.ext:LINE:COL
 * Linhas sem file são emitidas como annotation sem `file=` (aparece no job).
 *
 * Uso:
 *   node scripts/ssot-report-annotations.mjs --in=ssot-report.json
 *
 * Nunca falha o build por si — exit 0 sempre (é apenas UX).
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const inArg = argv.find((a) => a.startsWith('--in='));
const IN_PATH = inArg ? inArg.slice(5) : 'ssot-report.json';

if (!existsSync(IN_PATH)) {
  process.stderr.write(`[annotations] arquivo não encontrado: ${IN_PATH}\n`);
  process.exit(0);
}

let report;
try {
  report = JSON.parse(readFileSync(IN_PATH, 'utf8'));
} catch (e) {
  process.stderr.write(`[annotations] JSON inválido em ${IN_PATH}: ${e.message}\n`);
  process.exit(0);
}

// `null`/não-objeto no JSON (relatório truncado) não pode virar TypeError: o script promete exit 0 sempre.
const gates = Array.isArray(report?.details) ? report.details : [];
const failed = gates.filter((g) => !g.ok);

if (failed.length === 0) {
  process.stderr.write('[annotations] nenhum gate falhou — nada a anotar.\n');
  process.exit(0);
}

// Regex de localização (ordem importa: mais específico primeiro).
const RX = [
  // file.ext:LINE:COL
  /(?<file>(?:[a-zA-Z]:)?[\w./\-@]+\.[a-zA-Z0-9]+):(?<line>\d+):(?<col>\d+)/,
  // file.ext(LINE,COL)
  /(?<file>(?:[a-zA-Z]:)?[\w./\-@]+\.[a-zA-Z0-9]+)\((?<line>\d+),(?<col>\d+)\)/,
  // file.ext:LINE
  /(?<file>(?:[a-zA-Z]:)?[\w./\-@]+\.[a-zA-Z0-9]+):(?<line>\d+)(?!\d)/,
];

// Propriedades (title=, file=) usam delimitadores ":" e "," — precisam escapar
// esses caracteres também. A mensagem (depois do "::") não usa esses
// delimitadores, e o runner do GitHub Actions não decodifica %3A/%2C ali —
// escapá-los lá faz a mensagem aparecer com "%3A"/"%2C" literais na UI.
function escProp(s) {
  return String(s)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}
function escData(s) {
  return String(s)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function tryLocate(line) {
  for (const rx of RX) {
    const m = line.match(rx);
    if (m?.groups?.file) {
      const rel = m.groups.file.replace(/^\.\//, '');
      // Descarta capturas óbvias de node internals / node_modules.
      if (rel.startsWith('node:') || rel.includes('node_modules/')) continue;
      return {
        file: rel,
        line: m.groups.line ? Number(m.groups.line) : undefined,
        col: m.groups.col ? Number(m.groups.col) : undefined,
      };
    }
  }
  return null;
}

// Linhas de SUCESSO do stdout de um gate falho (✅ …) não são erro: antes viravam `::error`.
const NOISE = /^(?:npm (?:warn|notice|info)|>|\s*$|===|---|✅|✓|\[ok\])/i;

let count = 0;
for (const g of failed) {
  const title = `SSOT gate falhou: ${g.label}`;
  const combined = `${g.stdout || ''}\n${g.stderr || ''}`
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !NOISE.test(l));

  const seen = new Set();
  let emittedForGate = 0;

  for (const raw of combined) {
    const loc = tryLocate(raw);
    const key = loc ? `${loc.file}:${loc.line ?? ''}:${loc.col ?? ''}:${raw}` : `nofile:${raw}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const props = [`title=${escProp(title)}`];
    if (loc) {
      props.push(`file=${escProp(loc.file)}`);
      if (loc.line) props.push(`line=${loc.line}`);
      if (loc.col) props.push(`col=${loc.col}`);
    }
    process.stdout.write(`::error ${props.join(',')}::${escData(raw)}\n`);
    count++;
    emittedForGate++;
    if (emittedForGate >= 25) break; // limita ruído por gate
  }

  // Se não achou nada útil, emite pelo menos uma annotation resumo.
  if (emittedForGate === 0) {
    const fallback = (g.stderr || g.stdout || `exit=${g.exitCode}`).split(/\r?\n/)[0] || `exit=${g.exitCode}`;
    process.stdout.write(`::error title=${escProp(title)}::${escData(fallback)}\n`);
    count++;
  }
}

process.stderr.write(`[annotations] emitidas ${count} annotation(s) para ${failed.length} gate(s) que falharam.\n`);
process.exit(0);
