import { authorize } from "../_shared/authorize.ts";
import { parseContract } from "../_shared/contracts/index.ts";
import {
  SimulationOrchestratorSchemas,
} from "../_shared/contracts/schemas/simulation-orchestrator.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import {
  responseStatusForSummary,
  type SimulationScenarioResult,
  skippedScenario,
  summarizeSimulationOutcomes,
} from "./outcomes.ts";

const corsHeaders = buildPublicCorsHeaders();

/**
 * Cada alvo abaixo foi caracterizado como indisponível para execução sintética
 * no projeto canônico. Não há fallback que dispare uma edge parcialmente
 * compatível ou que possa alterar dados de catálogo sem um ambiente isolado.
 */
const TARGET_GATES: Readonly<Record<string, string>> = {
  "external-db-bridge": "target_decommissioned",
  "webhook-inbound": "webhook_contract_pending",
  "product-webhook": "mutating_target_requires_approved_sandbox",
  "webhook-dispatcher": "target_scenario_not_defined",
};

interface SimulationReport {
  id: string;
  status: "blocked";
  requestedScenarios: number;
  totalScenarios: number;
  successes: number;
  failures: number;
  rejections: number;
  skipped: number;
  outcomes: ReturnType<typeof summarizeSimulationOutcomes>;
  details: Array<{
    fnName: string;
    status: number | null;
    payload: string;
    error: string;
  }>;
  startTime: string;
  endTime: string;
  consistencyChecks: { passed: number; failed: number };
  latencies: number[];
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function targetGate(target: string): string {
  return TARGET_GATES[target] ?? "target_not_allowlisted";
}

function buildReport(
  runId: string,
  requestedScenarios: number,
  scenarios: SimulationScenarioResult[],
  startTime: string,
): SimulationReport {
  const outcomes = summarizeSimulationOutcomes(scenarios);
  return {
    id: runId,
    status: "blocked",
    requestedScenarios,
    totalScenarios: outcomes.total,
    successes: outcomes.passed,
    // Mantém o campo legado sem converter rejeições ou skips em sucesso.
    failures: outcomes.rejected + outcomes.infra_failed + outcomes.skipped,
    rejections: outcomes.rejected,
    skipped: outcomes.skipped,
    outcomes,
    details: scenarios.map((scenario) => ({
      fnName: scenario.fnName,
      status: scenario.statusCode ?? null,
      payload: "",
      error: scenario.reason ?? scenario.outcome,
    })),
    startTime,
    endTime: new Date().toISOString(),
    consistencyChecks: { passed: 0, failed: 0 },
    latencies: scenarios.flatMap((scenario) =>
      scenario.latencyMs === undefined ? [] : [scenario.latencyMs]
    ),
  };
}

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({
    fn: "simulation-orchestrator",
    requestId,
    req,
  });
  log.info("request_start");

  if (req.method === "OPTIONS") {
    return log.respond(new Response("ok", { headers: corsHeaders }));
  }

  try {
    const auth = await authorize(req, {
      requireRole: "dev",
      requireAal2: true,
    });
    if (!auth.ok) return log.respond(auth.response);

    const contractResult = await parseContract(
      req,
      SimulationOrchestratorSchemas,
      {
        corsHeaders,
        requestId,
      },
    );
    if (!contractResult.ok) return log.respond(contractResult.response);

    const { data: parsedBody, responseHeaders } = contractResult;
    const count = parsedBody.count ?? 100;
    const targetFunctions = parsedBody.targetFunctions ?? [
      "external-db-bridge",
      "webhook-inbound",
      "product-webhook",
    ];
    const mode = parsedBody.mode ?? "resilience";

    const startTime = new Date().toISOString();
    const scenarios = targetFunctions.map((target) =>
      skippedScenario(target, targetGate(target))
    );
    const report = buildReport(
      crypto.randomUUID(),
      count,
      scenarios,
      startTime,
    );

    // Relatório deliberadamente efêmero: enquanto todos os alvos estiverem
    // gated, não há motivo para criar runs/logs que aparentem execução real.
    const responseStatus = responseStatusForSummary(report.outcomes);
    log.warn("simulation_targets_gated", {
      mode,
      requested_scenarios: count,
      outcomes: report.outcomes,
      response_status: responseStatus,
    });
    return log.respond(
      new Response(JSON.stringify(report), {
        status: responseStatus,
        headers: {
          ...corsHeaders,
          ...responseHeaders,
          "Content-Type": "application/json",
        },
      }),
    );
  } catch (error) {
    log.error("simulation_orchestrator_failed", { error });
    return log.respond(jsonResponse(
      {
        error: "simulation_orchestrator_failed",
        outcome: "infra_failed",
        request_id: requestId,
      },
      500,
      corsHeaders,
    ));
  }
});
