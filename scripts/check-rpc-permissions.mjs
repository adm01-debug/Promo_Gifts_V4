#!/usr/bin/env node
/**
 * Gate 5 — confirma a postura de EXECUTE da RPC get_profile_and_roles.
 *
 * `--require-live` (ou REQUIRE_LIVE=1) torna qualquer falta de evidência
 * remota verificável um exit 2/inconclusive. Assim, um workflow que declara
 * validar permissões não pode passar apenas porque information_schema não foi
 * exposto pelo PostgREST ou porque houve erro de credencial/rede.
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
        ? "SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários para consultar permissões live."
        : "Sem credenciais, a verificação ficou explicitamente em modo estático.",
    );
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/information_schema.routine_privileges?select=grantee,privilege_type&specific_schema=eq.public&routine_name=eq.get_profile_and_roles`;
  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
  } catch {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "network_error",
      "A consulta live de permissões não pôde alcançar o PostgREST.",
    );
  }

  if (!response.ok) {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "http_error",
      "O PostgREST não disponibilizou uma resposta verificável para information_schema.routine_privileges.",
      { httpStatus: response.status },
    );
  }

  let privileges;
  try {
    privileges = await response.json();
  } catch {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "invalid_payload",
      "A consulta live de permissões retornou JSON inválido.",
    );
  }

  if (!Array.isArray(privileges)) {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "unexpected_payload",
      "A consulta live de permissões não retornou a lista esperada de grants.",
    );
  }

  const grantees = privileges
    .filter((row) => row && row.privilege_type === "EXECUTE")
    .map((row) => row.grantee)
    .filter((grantee) => typeof grantee === "string");
  const anonHasExecute = grantees.includes("anon");
  const authenticatedHasExecute = grantees.includes("authenticated");

  if (anonHasExecute || !authenticatedHasExecute) {
    const violations = [
      ...(anonHasExecute ? ["anon possui EXECUTE"] : []),
      ...(!authenticatedHasExecute ? ["authenticated não possui EXECUTE"] : []),
    ];
    return conclude(
      CHECK_RESULT_STATUS.FAILED,
      "permission_violation",
      `A evidência live encontrou permissão incompatível: ${violations.join("; ")}.`,
      { grantees },
    );
  }

  return conclude(
    CHECK_RESULT_STATUS.PASSED,
    "live_permissions_verified",
    "A evidência live confirma anon=false e authenticated=true para EXECUTE.",
    { grantees },
  );
}

main().catch(() => {
  conclude(
    CHECK_RESULT_STATUS.INCONCLUSIVE,
    "unexpected_error",
    "O check encontrou um erro inesperado antes de produzir evidência live.",
  );
});
