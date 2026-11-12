/**
 * Busca de string literal em árvores de arquivos para os gates de "frase banida".
 *
 * Antes: `rg … 2>/dev/null || true` — sem ripgrep no PATH a saída era vazia e o gate dava ✅ sem
 * varrer nada (fail-open). Aqui: usa `rg` quando existe (sem shell) e, se não existir, varre com
 * fs nativo. Qualquer erro real do rg (status > 1) falha em vez de virar "nenhuma ocorrência".
 *
 * Formato de retorno idêntico ao `rg -n --no-heading`: `caminho:linha:texto`.
 */
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'playwright-report', 'test-results']);
const MAX_BYTES = 2_000_000; // ignora binários/artefatos enormes (rg também pula binários)

function nativeSearch(phrase, paths) {
  const hits = [];
  const visit = (target) => {
    // Abre UMA vez e decide tudo pelo descritor (fstat): sem checar o caminho e reabri-lo
    // depois — não há janela para trocar arquivo por diretório/link entre a checagem e a leitura.
    let fd;
    let text;
    try {
      fd = openSync(target, 'r');
      const st = fstatSync(fd);
      if (st.isDirectory()) {
        closeSync(fd);
        fd = undefined;
        for (const name of readdirSync(target)) {
          if (!SKIP_DIRS.has(name)) visit(join(target, name));
        }
        return;
      }
      if (!st.isFile() || st.size > MAX_BYTES) return;
      text = readFileSync(fd, 'utf8');
    } catch {
      return;
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
    if (text.includes('\u0000') || !text.includes(phrase)) return;
    text.split(/\r?\n/).forEach((line, index) => {
      if (line.includes(phrase)) hits.push(`${target}:${index + 1}:${line}`);
    });
  };
  paths.forEach(visit);
  return hits;
}

/**
 * @param {string} phrase string literal (não regex)
 * @param {string[]} paths arquivos/diretórios a varrer (inexistentes são ignorados)
 * @param {{ forceNative?: boolean }} [options]
 * @returns {string[]} linhas `caminho:linha:texto`
 */
export function searchFixedString(phrase, paths, { forceNative = false } = {}) {
  const existing = paths.filter((p) => existsSync(p));
  if (existing.length === 0) return [];
  if (!forceNative) {
    const res = spawnSync('rg', ['-n', '--no-heading', '-F', '--', phrase, ...existing], { encoding: 'utf8' });
    if (!res.error) {
      if (res.status === 0) return res.stdout.split('\n').filter(Boolean);
      if (res.status === 1) return []; // rg: nenhuma ocorrência
      throw new Error(`rg falhou (status ${res.status}): ${String(res.stderr).slice(0, 300)}`);
    }
    if (res.error.code !== 'ENOENT') throw res.error;
  }
  return nativeSearch(phrase, existing);
}
