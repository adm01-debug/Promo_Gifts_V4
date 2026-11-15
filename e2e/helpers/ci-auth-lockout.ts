export type AccessGatePayload = Record<string, unknown>;

/**
 * Libera somente o lockout compartilhado do runner de CI. Demais decisões da
 * validate-access continuam sendo exercitadas pelo login E2E.
 */
export function rewriteCiSharedIpLockout(
  enabled: boolean,
  status: number,
  payload: unknown,
): AccessGatePayload | null {
  if (
    !enabled ||
    status < 200 ||
    status >= 300 ||
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return null;
  }

  const decision = payload as AccessGatePayload;
  if (decision.allowed !== false || decision.reason !== "too_many_attempts") {
    return null;
  }

  return { ...decision, allowed: true, ciSharedIpLockoutBypass: true };
}
