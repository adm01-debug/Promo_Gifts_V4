import fs from 'fs';
import path from 'path';

/**
 * Dashboard de métricas do CI para o módulo de Reposição.
 *
 * Antes: o "dashboard" gravado era SEMPRE um objeto literal no código (rotas/edges/status
 * 'WARNING' inventados) — o arquivo de métricas real era lido e descartado, e o JSON versionado
 * parecia medição. Agora o relatório é derivado de `tests/results/performance-metrics.json`
 * ({ routes: [{ path, avg_response_ms, p95_ms, error_rate }], edge_functions: [{ name,
 * avg_execution_ms, success_rate }] }). Sem o arquivo NADA é gravado (o dashboard anterior
 * permanece como está): fora do CI = "NÃO VERIFICADO" (exit 0); em CI/REQUIRE_LIVE=1 = exit 2.
 */

export const METRICS_FILE = 'tests/results/performance-metrics.json';
export const OUTPUT_REPORT = 'replenishment-performance-dashboard.json';
export const LATENCY_THRESHOLD_MS = 500;
export const ERROR_THRESHOLD_PERCENT = 2;

export function isStrictRun(env = process.env, argv = process.argv.slice(2)) {
  return env.CI === 'true' || env.CI === '1' || env.GITHUB_ACTIONS === 'true' || env.REQUIRE_LIVE === '1' || argv.includes('--require-live');
}

/** CRITICAL: alguma rota acima do limite de erro; WARNING: alguma rota com p95 acima do limite; senão OK. */
export function evaluateGates(metrics) {
  const routes = Array.isArray(metrics?.routes) ? metrics.routes : [];
  const critical = routes.filter((r) => Number(r.error_rate) * 100 > ERROR_THRESHOLD_PERCENT);
  const slow = routes.filter((r) => Number(r.p95_ms) > LATENCY_THRESHOLD_MS);
  return {
    latency_threshold_ms: LATENCY_THRESHOLD_MS,
    error_threshold_percent: ERROR_THRESHOLD_PERCENT,
    status: critical.length ? 'CRITICAL' : slow.length ? 'WARNING' : 'OK',
    critical_routes: critical.map((r) => r.path),
    slow_routes: slow.map((r) => r.path),
  };
}

export function generateDashboard({ metricsFile = METRICS_FILE, outputReport = OUTPUT_REPORT, strict = isStrictRun() } = {}) {
  console.log('--- Gerando Dashboard de Performance: Reposição ---');
  if (!fs.existsSync(metricsFile)) {
    if (strict) {
      console.error(`❌ ${metricsFile} ausente: nada medido (modo estrito).`);
      return 2;
    }
    console.log(`[metrics-dashboard] static-pass: ${metricsFile} ausente; NÃO VERIFICADO — dashboard não foi alterado (REQUIRE_LIVE=1 torna obrigatório).`);
    return 0;
  }
  let metrics;
  try {
    metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
  } catch (error) {
    console.error(`❌ Métricas ilegíveis em ${metricsFile}: ${error.message}`);
    return 2;
  }
  const report = {
    timestamp: new Date().toISOString(),
    module: 'Reposição',
    source: metricsFile,
    routes: metrics.routes ?? [],
    edge_functions: metrics.edge_functions ?? [],
    gates: evaluateGates(metrics),
  };
  fs.mkdirSync(path.dirname(path.resolve(outputReport)), { recursive: true });
  fs.writeFileSync(outputReport, JSON.stringify(report, null, 2));
  console.log(`Relatório gerado em: ${outputReport} (status ${report.gates.status})`);
  if (report.gates.status === 'CRITICAL') {
    console.error('CI GATE FAILED: Performance thresholds not met for Reposição module.');
    return 1;
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  process.exit(generateDashboard());
}
