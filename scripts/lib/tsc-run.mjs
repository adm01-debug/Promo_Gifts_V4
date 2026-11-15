/**
 * Classifica uma execução do `tsc --noEmit` para os gates/ratchets de erro TypeScript.
 *
 * Por quê: os gates comparavam "quantidade de erros" com uma baseline. Se o tsc nem chegava a
 * checar (tsconfig ausente/inválido, binário faltando, OOM), a contagem virava 0 (ou 1) e o
 * gate comemorava "drift positivo" — fail-open silencioso. Aqui só é "contagem confiável"
 * quando o tsc realmente rodou.
 *
 * Diagnóstico de código:  `src/a.ts(10,5): error TS2322: …`  → conta.
 * Diagnóstico de infra:   `error TS5083: Cannot read file …` ou `tsconfig.json(2,3): error TS1005`
 *                         (qualquer `error TS` fora de arquivo .ts/.tsx) → o tsc não checou.
 */
const CODE_DIAGNOSTIC = /^\S+\.[cm]?tsx?\(\d+,\d+\): error TS\d+:/;
const ANY_DIAGNOSTIC = /error TS\d+:/;

/**
 * @param {{ status: number|null, signal?: string|null, error?: Error|null, output: string }} run
 * @returns {{ ok: boolean, count: number, reason?: string }}
 */
export function classifyTscRun({ status, signal = null, error = null, output }) {
  if (error) return { ok: false, count: 0, reason: `tsc não executou: ${error.message}` };
  if (signal || status === null) {
    return { ok: false, count: 0, reason: `tsc interrompido (${signal ?? 'sem status'}) — possível OOM` };
  }
  const lines = String(output ?? '').split('\n');
  const count = lines.filter((line) => CODE_DIAGNOSTIC.test(line)).length;
  const infra = lines.filter((line) => ANY_DIAGNOSTIC.test(line) && !CODE_DIAGNOSTIC.test(line));
  if (infra.length > 0) {
    return { ok: false, count, reason: `tsc não conseguiu checar o projeto: ${infra[0].trim().slice(0, 200)}` };
  }
  if (status !== 0 && count === 0) {
    return { ok: false, count, reason: `tsc saiu com código ${status} sem nenhum diagnóstico de código` };
  }
  return { ok: true, count };
}

/**
 * Argumentos de heap do V8 para o processo filho do tsc.
 *
 * Por quê: com o heap padrão do Node o `tsc -p tsconfig.eslint.json` aborta com
 * "JavaScript heap out of memory" (SIGABRT) — o gate nunca conclui fora do CI, que injeta
 * NODE_OPTIONS. Respeita um `--max-old-space-size` já presente em NODE_OPTIONS (o CI decide)
 * e aceita override via TSC_MAX_OLD_SPACE_MB.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string[]}
 */
export function tscHeapArgs(env = process.env) {
  if (/--max-old-space-size[=\s]/.test(env.NODE_OPTIONS ?? '')) return [];
  const mb = Number.parseInt(env.TSC_MAX_OLD_SPACE_MB ?? '', 10);
  return [`--max-old-space-size=${Number.isFinite(mb) && mb > 0 ? mb : 6144}`];
}
