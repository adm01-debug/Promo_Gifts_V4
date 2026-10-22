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

const MAX_RETRIES = 3;
const _rawRetryDelay = parseInt(process.env.CHECK_RETRY_DELAY_MS ?? "15000", 10);
const RETRY_DELAY_MS = Number.isFinite(_rawRetryDelay) && _rawRetryDelay >= 0 ? _rawRetryDelay : 15000;
const RETRYABLE_HTTP_STATUSES = new Set([500, 503, 504, 521]);

/** @param {number} ms */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postRpc(name, body) {
  return fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(body),
  });
}

async function postRpcWithRetry(name, body, label) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await postRpc(name, body);
    } catch (err) {
      lastError = { kind: "network", message: String(err) };
      console.warn(`⚠️  [${label}] falha de rede (tentativa ${attempt}/${MAX_RETRIES}): ${err}`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
      continue;
    }
    if (RETRYABLE_HTTP_STATUSES.has(res.status)) {
      lastError = { kind: "http", status: res.status };
      console.warn(`⚠️  [${label}] HTTP ${res.status} (tentativa ${attempt}/${MAX_RETRIES}) — aguardando ${RETRY_DELAY_MS / 1000}s...`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return { exhausted: true, status: res.status };
    }
    lastError = null;
    return { res, exhausted: false };
  }
  return { exhausted: true, networkError: lastError };
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

  const auditResult = await postRpcWithRetry("audit_security_definer_acl", {}, "audit-acl");
  if (auditResult.networkError) {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "audit_network_error",
      "O audit SECURITY DEFINER não pôde ser consultado no alvo live.",
    );
  }
  if (auditResult.exhausted) {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "audit_http_error_exhausted",
      `O audit SECURITY DEFINER retornou HTTP ${auditResult.status} após ${MAX_RETRIES} tentativas — serviço indisponível.`,
      { httpStatus: auditResult.status, attempts: MAX_RETRIES },
    );
  }

  const auditResponse = auditResult.res;

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

  const smokeResult = await postRpcWithRetry(
    "get_profile_and_roles",
    { _user_id: "00000000-0000-0000-0000-000000000000" },
    "smoke-rpc",
  );
  if (smokeResult.networkError) {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "smoke_network_error",
      "O smoke da RPC não pôde alcançar o PostgREST após o audit aprovado.",
    );
  }
  if (smokeResult.exhausted) {
    conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      "smoke_http_error_exhausted",
      `O smoke da RPC retornou HTTP ${smokeResult.status} após ${MAX_RETRIES} tentativas — serviço indisponível.`,
      { httpStatus: smokeResult.status, attempts: MAX_RETRIES },
    );
  }
  const smokeResponse = smokeResult.res;

  if (smokeResponse.status === 404) {
    const existsResult = await postRpcWithRetry("fn_rpc_exists", { _fname: "get_profile_and_roles" }, "fn-rpc-exists");
    if (existsResult.networkError) {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "existence_network_error",
        "O PostgREST retornou 404 e fn_rpc_exists não pôde confirmar a existência da RPC.",
      );
    }
    if (existsResult.exhausted) {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "existence_http_error_exhausted",
        `fn_rpc_exists retornou HTTP ${existsResult.status} após ${MAX_RETRIES} tentativas.`,
        { httpStatus: existsResult.status, attempts: MAX_RETRIES },
      );
    }
    const existsResponse = existsResult.res;

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

  if ([401, 403].includes(smokeResponse.status)) {
    let deniedPayload;
    try {
      deniedPayload = await smokeResponse.json();
    } catch {
      conclude(
        CHECK_RESULT_STATUS.INCONCLUSIVE,
        "protected_endpoint_invalid_payload",
        "A RPC negou acesso, mas a resposta não permitiu comprovar qual função foi protegida.",
        { httpStatus: smokeResponse.status },
      );
    }

    const isExpectedPrivilegeDenial =
      deniedPayload?.code === "42501" &&
      typeof deniedPayload?.message === "string" &&
      deniedPayload.message.includes("permission denied for function get_profile_and_roles");

    conclude(
      isExpectedPrivilegeDenial ? CHECK_RESULT_STATUS.PASSED : CHECK_RESULT_STATUS.INCONCLUSIVE,
      isExpectedPrivilegeDenial ? "protected_endpoint_verified" : "protected_endpoint_unverified",
      isExpectedPrivilegeDenial
        ? "O audit está limpo e o PostgREST confirmou que a RPC existe e bloqueia anon."
        : "A negativa do PostgREST não comprovou existência e proteção da RPC esperada.",
      { httpStatus: smokeResponse.status, postgrestCode: deniedPayload?.code },
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
