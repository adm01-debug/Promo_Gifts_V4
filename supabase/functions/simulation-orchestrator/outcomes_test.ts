import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyHttpScenario,
  responseStatusForSummary,
  skippedScenario,
  summarizeSimulationOutcomes,
} from "./outcomes.ts";

Deno.test("simulation outcomes: distingue passed, rejected, infra_failed e skipped", () => {
  const passed = classifyHttpScenario({
    fnName: "target-positive",
    expectation: "accept",
    statusCode: 200,
    latencyMs: 12,
  });
  const rejected = classifyHttpScenario({
    fnName: "target-negative",
    expectation: "reject",
    statusCode: 422,
    latencyMs: 8,
    expectedStatuses: [400, 422],
  });
  const serverFailure = classifyHttpScenario({
    fnName: "target-broken",
    expectation: "accept",
    statusCode: 500,
    latencyMs: 21,
  });
  const skipped = skippedScenario("target-gated", "approved_sandbox_required");

  assertEquals(passed.outcome, "passed");
  assertEquals(passed.expectationMet, true);
  assertEquals(rejected.outcome, "rejected");
  assertEquals(rejected.expectationMet, true);
  assertEquals(serverFailure.outcome, "infra_failed");
  assertEquals(serverFailure.expectationMet, false);
  assertEquals(skipped.outcome, "skipped");

  const summary = summarizeSimulationOutcomes([
    passed,
    rejected,
    serverFailure,
    skipped,
  ]);
  assertEquals(summary, {
    total: 4,
    passed: 1,
    rejected: 1,
    infra_failed: 1,
    skipped: 1,
    expectation_failed: 2,
  });
  assertEquals(responseStatusForSummary(summary), 502);
});

Deno.test("simulation outcomes: 4xx inesperado nao vira sucesso", () => {
  const rejected = classifyHttpScenario({
    fnName: "target-positive",
    expectation: "accept",
    statusCode: 401,
    latencyMs: 3,
  });
  const summary = summarizeSimulationOutcomes([rejected]);

  assertEquals(rejected.outcome, "rejected");
  assertEquals(rejected.expectationMet, false);
  assertEquals(summary.passed, 0);
  assertEquals(responseStatusForSummary(summary), 502);
});

Deno.test("simulation outcomes: bloqueio sem alvo seguro retorna dependencia ausente", () => {
  const summary = summarizeSimulationOutcomes([
    skippedScenario("webhook-inbound", "webhook_contract_pending"),
  ]);

  assertEquals(responseStatusForSummary(summary), 424);
});
