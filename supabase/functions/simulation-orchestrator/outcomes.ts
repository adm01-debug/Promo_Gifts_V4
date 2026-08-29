/**
 * Semântica de resultado para o simulation-orchestrator.
 *
 * Um status HTTP não é, por si só, êxito de uma simulação. O consumidor precisa
 * distinguir uma resposta aceita, uma rejeição esperada, uma falha de
 * infraestrutura e um cenário que nem sequer pode ser executado com segurança.
 */

export type SimulationOutcome =
  | "passed"
  | "rejected"
  | "infra_failed"
  | "skipped";

export type SimulationExpectation = "accept" | "reject";

export interface SimulationScenarioResult {
  fnName: string;
  outcome: SimulationOutcome;
  expectation: SimulationExpectation;
  expectationMet: boolean;
  statusCode?: number;
  latencyMs?: number;
  reason?: string;
}

export interface ClassifyHttpScenarioInput {
  fnName: string;
  expectation: SimulationExpectation;
  statusCode: number;
  latencyMs: number;
  /** Quando definido, o status precisa estar nesta lista para satisfazer a expectativa. */
  expectedStatuses?: readonly number[];
}

function statusMatchesExpectation(input: ClassifyHttpScenarioInput): boolean {
  if (input.expectedStatuses?.length) {
    return input.expectedStatuses.includes(input.statusCode);
  }

  return input.expectation === "accept"
    ? input.statusCode >= 200 && input.statusCode < 300
    : input.statusCode >= 400 && input.statusCode < 500;
}

/**
 * Classifica a resposta real de um alvo sem tratar 4xx/5xx como sucesso.
 *
 * - `passed`: o alvo aceitou um cenário que devia ser aceito;
 * - `rejected`: o alvo rejeitou com 4xx; isto só satisfaz a expectativa em
 *   cenários explicitamente negativos;
 * - `infra_failed`: rede, 5xx, redirecionamento inesperado ou aceitação de um
 *   payload que deveria ser recusado;
 * - `skipped`: pré-condição não atendida, criado por `skippedScenario`.
 */
export function classifyHttpScenario(
  input: ClassifyHttpScenarioInput,
): SimulationScenarioResult {
  const matches = statusMatchesExpectation(input);
  const base = {
    fnName: input.fnName,
    expectation: input.expectation,
    statusCode: input.statusCode,
    latencyMs: input.latencyMs,
  };

  if (
    input.statusCode >= 500 || input.statusCode < 200 ||
    input.statusCode >= 300 && input.statusCode < 400
  ) {
    return {
      ...base,
      outcome: "infra_failed",
      expectationMet: false,
      reason: input.statusCode >= 500
        ? "target_server_error"
        : "unexpected_http_status",
    };
  }

  if (input.statusCode >= 400) {
    return {
      ...base,
      outcome: "rejected",
      expectationMet: input.expectation === "reject" && matches,
      reason: "target_rejected_request",
    };
  }

  if (input.expectation === "accept" && matches) {
    return {
      ...base,
      outcome: "passed",
      expectationMet: true,
    };
  }

  return {
    ...base,
    outcome: "infra_failed",
    expectationMet: false,
    reason: input.expectation === "reject"
      ? "target_accepted_negative_scenario"
      : "unexpected_success_status",
  };
}

export function infraFailedScenario(
  fnName: string,
  reason: string,
): SimulationScenarioResult {
  return {
    fnName,
    outcome: "infra_failed",
    expectation: "accept",
    expectationMet: false,
    reason,
  };
}

export function skippedScenario(
  fnName: string,
  reason: string,
): SimulationScenarioResult {
  return {
    fnName,
    outcome: "skipped",
    expectation: "accept",
    expectationMet: false,
    reason,
  };
}

export interface SimulationOutcomeSummary {
  total: number;
  passed: number;
  rejected: number;
  infra_failed: number;
  skipped: number;
  expectation_failed: number;
}

export function summarizeSimulationOutcomes(
  scenarios: readonly SimulationScenarioResult[],
): SimulationOutcomeSummary {
  const summary: SimulationOutcomeSummary = {
    total: scenarios.length,
    passed: 0,
    rejected: 0,
    infra_failed: 0,
    skipped: 0,
    expectation_failed: 0,
  };

  for (const scenario of scenarios) {
    summary[scenario.outcome] += 1;
    if (!scenario.expectationMet) summary.expectation_failed += 1;
  }

  return summary;
}

/**
 * Respostas de orquestração só são verdes quando nenhum cenário ficou bloqueado
 * ou falhou. Rejeições explicitamente esperadas em testes negativos continuam
 * visíveis no relatório, mas não falham a asserção do próprio teste.
 */
export function responseStatusForSummary(
  summary: SimulationOutcomeSummary,
): number {
  // Um cenário skipped é bloqueio de pré-condição (424), não falha do alvo
  // (502). As demais expectativas não atendidas continuam sendo 502.
  if (
    summary.infra_failed > 0 ||
    summary.expectation_failed > summary.skipped
  ) return 502;
  if (summary.skipped > 0) return 424;
  return 200;
}
