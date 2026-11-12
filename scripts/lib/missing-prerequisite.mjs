/**
 * Contrato único para "pré-requisito ausente" (credencial, relatório, Docker, Deno…).
 *
 * - Modo estrito → falha fechado, com o exit code que o script sempre usou.
 *   Ativo quando CI=true|1, GITHUB_ACTIONS=true, REQUIRE_LIVE=1 ou `--require-live`.
 * - Fora do CI   → `static-pass` explícito (exit 0): o dev roda sem credenciais e a
 *   saída deixa claro que NADA foi verificado.
 *
 * GUARD: um gate nunca pode sair 0 no CI sem ter verificado. Não troque esta
 * chamada por `process.exit(0)` incondicional.
 */
import { shouldRequireLive } from '../check-result-contract.mjs';

export function isStrictRun(argv = process.argv.slice(2), env = process.env) {
  return (
    shouldRequireLive(argv, env) ||
    env.CI === 'true' ||
    env.CI === '1' ||
    env.GITHUB_ACTIONS === 'true'
  );
}

/**
 * Decide o desfecho sem encerrar o processo (testável).
 * @returns {{ strict: boolean, exitCode: number, stream: 'stdout'|'stderr', lines: string[] }}
 */
export function resolveMissingPrerequisite(
  check,
  reason,
  { exitCode = 1, hint, argv = process.argv.slice(2), env = process.env } = {},
) {
  if (isStrictRun(argv, env)) {
    const lines = [`[${check}] ❌ pré-requisito ausente: ${reason}`];
    if (hint) lines.push(`[${check}] ${hint}`);
    lines.push(
      `[${check}] modo estrito (CI ou REQUIRE_LIVE=1): a verificação não pode ser pulada.`,
    );
    return { strict: true, exitCode: exitCode === 0 ? 1 : exitCode, stream: 'stderr', lines };
  }
  const lines = [
    `[${check}] static-pass: ${reason}; nada foi verificado (REQUIRE_LIVE=1 torna obrigatório).`,
  ];
  if (hint) lines.push(`[${check}] ${hint}`);
  return { strict: false, exitCode: 0, stream: 'stdout', lines };
}

/** Encerra o processo conforme o contrato acima. */
export function missingPrerequisite(check, reason, options = {}) {
  const outcome = resolveMissingPrerequisite(check, reason, options);
  const write = outcome.stream === 'stderr' ? console.error : console.log;
  for (const line of outcome.lines) write(line);
  process.exit(outcome.exitCode);
}
