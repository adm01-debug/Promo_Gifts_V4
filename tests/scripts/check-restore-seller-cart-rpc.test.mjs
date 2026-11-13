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

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
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

function runCheck(url, { strict = true, extraEnv = {} } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(ROOT, "scripts", "check-restore-seller-cart-rpc.mjs")],
      {
        cwd: ROOT,
        env: {
          PATH: process.env.PATH ?? "",
          SUPABASE_URL: url,
          SUPABASE_SERVICE_ROLE_KEY: "fixture-service-role-key",
          ...(strict ? { STRICT: "1" } : {}),
          ...extraEnv,
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
      resolveRun({ exitCode, stdout, stderr });
    });
  });
}

describe("check-restore-seller-cart-rpc", () => {
  it("reconhece a RPC protegida (sem EXECUTE para anon) via fn_rpc_exists(_fname) real", async () => {
    const url = await startServer(async (request, response) => {
      const path = new URL(request.url, "http://fixture").pathname;
      if (path.endsWith("/rpc/restore_seller_cart")) {
        return json(response, 404, {
          code: "PGRST202",
          message: "Could not find the function public.restore_seller_cart(_snapshot) in the schema cache",
        });
      }
      if (path.endsWith("/rpc/fn_rpc_exists")) {
        const body = await readJsonBody(request);
        // A função real é fn_rpc_exists(_fname text) — PostgREST só resolve o
        // overload se a chave do corpo bater exatamente com "_fname".
        if (body && body._fname === "restore_seller_cart") {
          return json(response, 200, true);
        }
        return json(response, 404, {
          code: "PGRST202",
          message: "Could not find the function public.fn_rpc_exists(fname) in the schema cache",
        });
      }
      return json(response, 404, { error: "fixture route not found" });
    });

    const outcome = await runCheck(url);

    expect(outcome.stdout + outcome.stderr).toContain(
      "existe em pg_proc (anon sem EXECUTE — intencional, função protegida)",
    );
    expect(outcome.exitCode).toBe(0);
  });

  it("ainda falha quando fn_rpc_exists(_fname) confirma ausência real da RPC", async () => {
    const url = await startServer(async (request, response) => {
      const path = new URL(request.url, "http://fixture").pathname;
      if (path.endsWith("/rpc/restore_seller_cart")) {
        return json(response, 404, { code: "PGRST202", message: "schema cache" });
      }
      if (path.endsWith("/rpc/fn_rpc_exists")) {
        const body = await readJsonBody(request);
        if (body && body._fname === "restore_seller_cart") {
          return json(response, 200, false);
        }
        return json(response, 404, { code: "PGRST202", message: "schema cache" });
      }
      return json(response, 404, { error: "fixture route not found" });
    });

    const outcome = await runCheck(url);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.stdout + outcome.stderr).toContain("NÃO existe no banco canônico");
  });
});
