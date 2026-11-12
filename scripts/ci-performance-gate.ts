import { existsSync, readFileSync, writeFileSync } from 'fs';

/**
 * Gate de performance do módulo Reposição.
 *
 * Antes: os "resultados" eram números literais no código (450/320/1200 ms) e o gate dizia
 * "GATE PASSED" sempre, sem medir nada. Agora lê as medições reais de
 * `tests/results/performance-metrics.json` (array de { name, duration, status, route? } gerado
 * pelos testes de performance). Sem o arquivo: fora do CI = "NÃO VERIFICADO" (exit 0);
 * em CI/REQUIRE_LIVE=1 = falha (exit 2). Nunca imprime "PASSED" sem ter medido.
 */

export interface TestResult {
  name: string;
  duration: number; // ms
  status: 'passed' | 'failed';
  route?: string;
}

export const METRICS_FILE = 'tests/results/performance-metrics.json';

export const THRESHOLDS: Record<string, number> = {
  'replenishment-listing': 800, // 800ms
  'product-webhook-upsert': 1500, // 1.5s (includes DB write)
  'replenishment-stats': 500,
};
const DEFAULT_THRESHOLD_MS = 1000;

export function isStrictRun(env: Record<string, string | undefined> = process.env, argv: string[] = process.argv.slice(2)): boolean {
  return env.CI === 'true' || env.CI === '1' || env.GITHUB_ACTIONS === 'true' || env.REQUIRE_LIVE === '1' || argv.includes('--require-live');
}

export function evaluate(results: TestResult[]) {
  const details = results.map((res) => {
    const threshold = res.route ? THRESHOLDS[res.route] ?? DEFAULT_THRESHOLD_MS : DEFAULT_THRESHOLD_MS;
    const passedGate = res.status === 'passed' && Number.isFinite(res.duration) && res.duration <= threshold;
    return { ...res, threshold, passedGate };
  });
  return { details, failedGates: details.filter((d) => !d.passedGate).length };
}

export function loadResults(path: string = METRICS_FILE): TestResult[] | null {
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${path}: esperado um array de resultados`);
  return parsed as TestResult[];
}

function runPerfGate(): number {
  console.log('Running Performance Gate for Reposição module...');
  let results: TestResult[] | null;
  try {
    results = loadResults();
  } catch (error) {
    console.error(`❌ métricas ilegíveis: ${(error as Error).message}`);
    return 2;
  }
  if (!results || results.length === 0) {
    const reason = results ? `${METRICS_FILE} está vazio` : `${METRICS_FILE} ausente`;
    if (isStrictRun()) {
      console.error(`❌ ${reason}: o gate não mediu nada (modo estrito).`);
      return 2;
    }
    console.log(`[ci-performance-gate] static-pass: ${reason}; NÃO VERIFICADO (REQUIRE_LIVE=1 torna obrigatório).`);
    return 0;
  }

  const { details, failedGates } = evaluate(results);
  for (const d of details) {
    if (d.passedGate) console.log(`✅ GATE PASSED: ${d.name} took ${d.duration}ms (Threshold: ${d.threshold}ms)`);
    else console.error(`❌ GATE FAILED: ${d.name} took ${d.duration}ms, status=${d.status} (Threshold: ${d.threshold}ms)`);
  }
  writeFileSync(
    'replenishment-perf-report.json',
    JSON.stringify({ timestamp: new Date().toISOString(), module: 'Reposição', summary: { total: details.length, failed_gates: failedGates }, details }, null, 2),
  );
  console.log('Report saved to replenishment-perf-report.json');
  return failedGates > 0 ? 1 : 0;
}

// Check if run from CLI
if (process.argv[1] && (process.argv[1].endsWith('ci-performance-gate.ts') || process.argv[1].endsWith('ci-performance-gate.js'))) {
  process.exit(runPerfGate());
}
