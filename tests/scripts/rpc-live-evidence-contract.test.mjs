import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const openServers = [];

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(
      (server) =>
        new Promise((resolveClose, rejectClose) => {
          server.close((error) => (error ? rejectClose(error) : resolveClose()));
        }),
    ),
  );
});

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function startServer(handler) {
  const server = createServer((request, response) => {
    Promise.resolve(handler(request, response)).catch((error) => {
      json(response, 500, { error: error.message });
    });
  });
  openServers.push(server);

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor de fixture sem porta TCP.");
  return `http://127.0.0.1:${address.port}`;
}

function runCheck(script, { url, includeCredentials = true } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(ROOT, "scripts", script), "--require-live"],
      {
        cwd: ROOT,
        env: {
          PATH: process.env.PATH ?? "",
          ...(url ? { SUPABASE_URL: url } : {}),
          ...(includeCredentials ? { SUPABASE_SERVICE_KEY: "fixture-read-key" } : {}),
        },
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", rejectRun);
    child.once("close", (exitCode) => {
      const output = `${stdout}${stderr}`.trim();
      const matches = [...output.matchAll(/\] result=(\{.+\})$/gm)];
      const resultLine = matches.at(-1)?.[1];
      if (!resultLine) {
        rejectRun(new Error(`Resultado estruturado ausente. Saída: ${output}`));
        return;
      }
      resolveRun({ exitCode, result: JSON.parse(resultLine) });
    });
  });
}

describe("RPC live-evidence checks", () => {
  it("classifica uma negativa sem prova 42501 como inconclusiva em modo live obrigatório", async () => {
    const url = await startServer((_request, response) => json(response, 403, { message: "forbidden" }));

    const outcome = await runCheck("check-rpc-permissions.mjs", { url });

    expect(outcome.exitCode).toBe(2);
    expect(outcome.result).toMatchObject({
      status: "inconclusive",
      reason: "unverified_denial",
      httpStatus: 403,
    });
  });

  it("aprova a permissão apenas após anon receber a negativa 42501 da RPC exata", async () => {
    const url = await startServer((request, response) => {
      expect(new URL(request.url, "http://fixture").pathname).toBe(
        "/rest/v1/rpc/get_profile_and_roles",
      );
      json(response, 401, {
        code: "42501",
        message: "permission denied for function get_profile_and_roles",
      });
    });

    const outcome = await runCheck("check-rpc-permissions.mjs", { url });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.result).toMatchObject({
      status: "passed",
      reason: "anon_denied_live",
      httpStatus: 401,
      postgrestCode: "42501",
    });
  });

  it("falha quando anon consegue alcançar a execução da RPC", async () => {
    const url = await startServer((_request, response) => json(response, 200, { profile: null, roles: [] }));

    const outcome = await runCheck("check-rpc-permissions.mjs", { url });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.result).toMatchObject({
      status: "failed",
      reason: "permission_violation",
      httpStatus: 200,
    });
  });

  it("não converte falta de credencial em aprovação", async () => {
    const outcome = await runCheck("check-rpc-permissions.mjs", { includeCredentials: false });

    expect(outcome.exitCode).toBe(2);
    expect(outcome.result).toMatchObject({
      status: "inconclusive",
      reason: "missing_credentials",
    });
  });

  it("exige audit e confirmação de existência quando o smoke retorna 404", async () => {
    const url = await startServer((request, response) => {
      const path = new URL(request.url, "http://fixture").pathname;
      if (path.endsWith("/audit_security_definer_acl")) return json(response, 200, []);
      if (path.endsWith("/get_profile_and_roles")) return json(response, 404, { code: "PGRST202" });
      if (path.endsWith("/fn_rpc_exists")) return json(response, 200, true);
      return json(response, 404, { error: "fixture route not found" });
    });

    const outcome = await runCheck("check-rpc-get-profile-and-roles.mjs", { url });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.result).toMatchObject({
      status: "passed",
      reason: "audit_and_existence_verified",
      smokeHttpStatus: 404,
    });
  });

  it("falha explicitamente quando fn_rpc_exists comprova ausência da RPC", async () => {
    const url = await startServer((request, response) => {
      const path = new URL(request.url, "http://fixture").pathname;
      if (path.endsWith("/audit_security_definer_acl")) return json(response, 200, []);
      if (path.endsWith("/get_profile_and_roles")) return json(response, 404, { code: "PGRST202" });
      if (path.endsWith("/fn_rpc_exists")) return json(response, 200, false);
      return json(response, 404, { error: "fixture route not found" });
    });

    const outcome = await runCheck("check-rpc-get-profile-and-roles.mjs", { url });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.result).toMatchObject({
      status: "failed",
      reason: "rpc_missing",
    });
  });

  it("aprova a RPC protegida quando o PostgREST comprova existência por 42501", async () => {
    const url = await startServer((request, response) => {
      const path = new URL(request.url, "http://fixture").pathname;
      if (path.endsWith("/audit_security_definer_acl")) return json(response, 200, []);
      if (path.endsWith("/get_profile_and_roles")) {
        return json(response, 401, {
          code: "42501",
          message: "permission denied for function get_profile_and_roles",
        });
      }
      return json(response, 404, { error: "fixture route not found" });
    });

    const outcome = await runCheck("check-rpc-get-profile-and-roles.mjs", { url });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.result).toMatchObject({
      status: "passed",
      reason: "protected_endpoint_verified",
      httpStatus: 401,
      postgrestCode: "42501",
    });
  });

  it("não aceita audit inacessível como smoke aprovado", async () => {
    const url = await startServer((_request, response) => json(response, 503, { message: "unavailable" }));

    const outcome = await runCheck("check-rpc-get-profile-and-roles.mjs", { url });

    expect(outcome.exitCode).toBe(2);
    expect(outcome.result).toMatchObject({
      status: "inconclusive",
      reason: "audit_http_error",
      httpStatus: 503,
    });
  });
});
