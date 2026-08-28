#!/usr/bin/env node
/**
 * Gate 5 — confirma a postura de EXECUTE da RPC get_profile_and_roles.
 *
 * `--require-live` (ou REQUIRE_LIVE=1) torna qualquer falta de evidência
 * remota verificável um exit 2/inconclusive. A prova usa o comportamento real
 * do endpoint como anon; auditoria de catálogo não deve depender de expor
 * information_schema pelo PostgREST.
 */
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  shouldRequireLive,
} from "./check-result-contract.mjs";

const CHECK = "RPC get_profile_and_roles permissions";
const REQUIRE_LIVE = shouldRequireLive();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function conclude(status, reason, summary, details = {}) {
  concludeCheck({
    check: CHECK,
    status,
    summary,
    details: { reason, requireLive: REQUIRE_LIVE, ...details },
  });
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return conclude(
      REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
      "missing_credentials",
      REQUIRE_LIVE
        ? "SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários para testar a permissão anon live."
        : "Sem credenciais, a verificação ficou explicitamente em modo estático.",
    );
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/get_profile_and_roles`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _user_id: "00000000-0000-0000-0000-000000000000" }),
    });
  } catch {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "network_error",
      "O teste live da permissão anon não pôde alcançar o PostgREST.",
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "invalid_payload",
      "O teste live da permissão anon retornou JSON inválido.",
      { httpStatus: response.status },
    );
  }

  const deniedAsExpected =
    [401, 403].includes(response.status) &&
    payload?.code === "42501" &&
    typeof payload?.message === "string" &&
    payload.message.includes("permission denied for function get_profile_and_roles");

  if (deniedAsExpected) {
    return conclude(
      CHECK_RESULT_STATUS.PASSED,
      "anon_denied_live",
      "O PostgREST confirmou ao vivo que anon não pode executar get_profile_and_roles.",
      { httpStatus: response.status, postgrestCode: payload.code },
    );
  }

  if ([200, 204, 400, 422].includes(response.status)) {
    return conclude(
      CHECK_RESULT_STATUS.FAILED,
      "permission_violation",
      "A chamada anônima alcançou a execução da RPC protegida.",
      { httpStatus: response.status },
    );
  }

  return conclude(
    CHECK_RESULT_STATUS.INCONCLUSIVE,
    "unverified_denial",
    "A resposta live não comprovou nem execução indevida nem a negativa 42501 esperada.",
    { httpStatus: response.status, postgrestCode: payload?.code },
  );
}

main().catch(() => {
  conclude(
    CHECK_RESULT_STATUS.INCONCLUSIVE,
    "unexpected_error",
    "O check encontrou um erro inesperado antes de produzir evidência live.",
  );
});
