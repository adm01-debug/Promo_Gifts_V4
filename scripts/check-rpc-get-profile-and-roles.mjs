#!/usr/bin/env node
/**
 * Gate 5 — verifica que get_profile_and_roles existe e não aparece no audit
 * SECURITY DEFINER. Nenhum ramo sem audit e smoke verificáveis é tratado como
 * aprovação quando o caller usa `--require-live`.
 */
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  shouldRequireLive,
} from "./check-result-contract.mjs";

const CHECK = "RPC get_profile_and_roles evidence";
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

function requestHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function postRpc(name, body) {
  return fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(body),
  });
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    conclude(
      REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
      "missing_credentials",
      REQUIRE_LIVE
        ? "SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários para auditar a RPC live."
        : "Sem credenciais, a verificação ficou explicitamente em modo estático.",
    );
  }

  let auditResponse;
  try {
    auditResponse = await postRpc("audit_security_definer_acl", {});
  } catch {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "audit_network_error",
      "O audit SECURITY DEFINER não pôde ser consultado no alvo live.",
    );
  }

  if (!auditResponse.ok) {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "audit_http_error",
      "O audit SECURITY DEFINER não retornou evidência verificável.",
      { httpStatus: auditResponse.status },
    );
  }

  let auditData;
  try {
    auditData = await auditResponse.json();
  } catch {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "audit_invalid_payload",
      "O audit SECURITY DEFINER retornou JSON inválido.",
    );
  }

  if (!Array.isArray(auditData)) {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "audit_unexpected_payload",
      "O audit SECURITY DEFINER não retornou a lista esperada de achados.",
    );
  }

  const securityProblems = auditData.filter(
    (row) =>
      row &&
      row.function_name === "get_profile_and_roles" &&
      typeof row.problem === "string" &&
      row.problem.length > 0,
  );
  if (securityProblems.length > 0) {
    conclude(
      CHECK_RESULT_STATUS.FAILED,
      "audit_violation",
      "O audit SECURITY DEFINER encontrou problema(s) na RPC get_profile_and_roles.",
      { problems: securityProblems.map((row) => ({ problem: row.problem, grantedTo: row.granted_to })) },
    );
  }

  let smokeResponse;
  try {
    smokeResponse = await postRpc("get_profile_and_roles", {
      user_id: "00000000-0000-0000-0000-000000000000",
    });
  } catch {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "smoke_network_error",
      "O smoke da RPC não pôde alcançar o PostgREST após o audit aprovado.",
    );
  }

  if (smokeResponse.status === 404) {
    let existsResponse;
    try {
      existsResponse = await postRpc("fn_rpc_exists", { fname: "get_profile_and_roles" });
    } catch {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "existence_network_error",
        "O PostgREST retornou 404 e fn_rpc_exists não pôde confirmar a existência da RPC.",
      );
    }

    if (!existsResponse.ok) {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "existence_http_error",
        "O PostgREST retornou 404 e fn_rpc_exists não forneceu evidência de existência.",
        { httpStatus: existsResponse.status },
      );
    }

    let exists;
    try {
      exists = await existsResponse.json();
    } catch {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "existence_invalid_payload",
        "fn_rpc_exists retornou JSON inválido.",
      );
    }

    if (exists !== true && exists !== false) {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "existence_unexpected_payload",
        "fn_rpc_exists não retornou um booleano verificável.",
      );
    }

    if (!exists) {
      conclude(
        CHECK_RESULT_STATUS.FAILED,
        "rpc_missing",
        "fn_rpc_exists confirmou que get_profile_and_roles não existe no schema público.",
      );
    }

    conclude(
      CHECK_RESULT_STATUS.PASSED,
      "audit_and_existence_verified",
      "O audit está limpo e fn_rpc_exists confirmou a RPC protegida contra anon.",
      { smokeHttpStatus: smokeResponse.status },
    );
  }

  if ([200, 204, 400, 422].includes(smokeResponse.status)) {
    conclude(
      CHECK_RESULT_STATUS.PASSED,
      "audit_and_smoke_verified",
      "O audit está limpo e o PostgREST respondeu de forma compatível com uma RPC existente.",
      { smokeHttpStatus: smokeResponse.status },
    );
  }

  conclude(
    CHECK_RESULT_STATUS.INCONCLUSIVE,
    "smoke_unexpected_http_status",
    "O smoke da RPC não forneceu uma resposta que comprove existência/saúde do endpoint.",
    { httpStatus: smokeResponse.status },
  );
}

main().catch(() => {
  conclude(
    CHECK_RESULT_STATUS.INCONCLUSIVE,
    "unexpected_error",
    "O check encontrou um erro inesperado antes de produzir evidência live.",
  );
});
