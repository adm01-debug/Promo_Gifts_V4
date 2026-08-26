import { appendFileSync } from 'node:fs';

export const CHECK_RESULT_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  INCONCLUSIVE: 'inconclusive',
  STATIC_PASS: 'static-pass',
  DRY_RUN_PASS: 'dry-run-pass',
};

export function shouldRequireLive(argv = process.argv.slice(2), env = process.env) {
  return argv.includes('--require-live') || env.REQUIRE_LIVE === '1';
}

export function maskUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.host;
    if (!host) return rawUrl;
    const parts = host.split('.');
    if (parts.length < 3) return `${parsed.protocol}//${host}`;
    const projectRef = parts[0];
    const maskedRef =
      projectRef.length <= 6
        ? `${projectRef.slice(0, 2)}***`
        : `${projectRef.slice(0, 3)}***${projectRef.slice(-3)}`;
    return `${parsed.protocol}//${maskedRef}.${parts.slice(1).join('.')}`;
  } catch {
    // Nunca devolva a string original: uma URL inválida pode conter token,
    // credencial Basic ou outro material que não deve parar no log do CI.
    return '[invalid-url]';
  }
}

export function formatCheckResultLine({ check, status, summary }) {
  return `[${check}] ${status}: ${summary}`;
}

export function emitCheckResult({
  check,
  status,
  summary,
  details = {},
  stream = 'stderr',
}) {
  const writer = stream === 'stdout' ? process.stdout : process.stderr;
  const payload = {
    check,
    status,
    summary,
    ...details,
  };

  writer.write(`${formatCheckResultLine({ check, status, summary })}\n`);
  writer.write(`[${check}] result=${JSON.stringify(payload)}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `\n### ${check}\n- Status: **${status.toUpperCase()}**\n- Resumo: ${summary}\n`,
      );
    } catch (error) {
      // A observabilidade adicional não pode esconder o resultado primário.
      writer.write(`[${check}] warning: não foi possível escrever GITHUB_STEP_SUMMARY (${error.message})\n`);
    }
  }
  return payload;
}

export function exitCodeForStatus(status) {
  if (status === CHECK_RESULT_STATUS.FAILED) return 1;
  if (status === CHECK_RESULT_STATUS.INCONCLUSIVE) return 2;
  return 0;
}

export function concludeCheck(result) {
  emitCheckResult(result);
  process.exit(exitCodeForStatus(result.status));
}
