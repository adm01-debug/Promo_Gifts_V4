import { describe, expect, it } from "vitest";
import {
  classifyHttpScenario,
  responseStatusForSummary,
  summarizeSimulationOutcomes,
  type SimulationScenarioResult,
} from "../../supabase/functions/simulation-orchestrator/outcomes";

/**
 * Fuzzing hermético da semântica do simulation-orchestrator.
 *
 * O gate de PR não recebe service-role e não atinge produção. Cenários live são
 * opt-in em workflow próprio, com URL e credenciais de teste validadas antes da
 * chamada. Este teste cobre 1.000 combinações sem depender de rede/localhost.
 */

function buildScenario(index: number): SimulationScenarioResult {
  const latencyMs = index % 250;
  switch (index % 4) {
    case 0:
      return classifyHttpScenario({
        fnName: `accept-${index}`,
        expectation: "accept",
        statusCode: index % 8 === 0 ? 200 : 202,
        latencyMs,
      });
    case 1:
      return classifyHttpScenario({
        fnName: `reject-${index}`,
        expectation: "reject",
        statusCode: index % 8 === 1 ? 400 : 422,
        expectedStatuses: [400, 422],
        latencyMs,
      });
    case 2:
      return classifyHttpScenario({
        fnName: `server-failure-${index}`,
        expectation: "accept",
        statusCode: index % 8 === 2 ? 500 : 503,
        latencyMs,
      });
    default:
      return classifyHttpScenario({
        fnName: `negative-accepted-${index}`,
        expectation: "reject",
        statusCode: 200,
        expectedStatuses: [400, 422],
        latencyMs,
      });
  }
}

describe("Massive Webhook & Edge Function Fuzzing", () => {
  it("classifica 1.000 cenários sem tratar 4xx/5xx como sucesso", () => {
    const scenarios = Array.from({ length: 1_000 }, (_, index) =>
      buildScenario(index)
    );
    const summary = summarizeSimulationOutcomes(scenarios);

    expect(summary).toEqual({
      total: 1_000,
      passed: 250,
      rejected: 250,
      infra_failed: 500,
      skipped: 0,
      expectation_failed: 500,
    });
    expect(responseStatusForSummary(summary)).toBe(502);
    expect(
      scenarios.filter((scenario) =>
        scenario.statusCode !== undefined && scenario.statusCode >= 500 &&
        scenario.expectationMet
      ),
    ).toEqual([]);
    expect(
      scenarios.filter((scenario) =>
        scenario.outcome === "rejected" && scenario.expectationMet
      ),
    ).toHaveLength(250);
  });
});
