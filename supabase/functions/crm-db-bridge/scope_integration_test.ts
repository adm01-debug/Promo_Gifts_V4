// Teste de integração do crm-db-bridge com supabase-js REAL e rede falsa (fetch stub).
// Rodar: deno test --config <deno.json com nodeModulesDir:auto> -A --no-check supabase/functions/crm-db-bridge/scope_integration_test.ts
// (BRIDGE_PATH=file://…/index.ts). Regra do dono (12/11): vendedor só vê os dele; o dono no
// CRM é o usuário do CRM com o MESMO e-mail (o user_id do CRM não é o auth.uid deste app).
// Prova, pela URL PostgREST efetivamente montada, que select/search/batch aplicam o escopo.
import { assert, assertEquals } from "jsr:@std/assert@1";

const UID = "11111111-1111-4111-8111-111111111111";
const APP = "http://app.local";
const CRM = "http://crm.local";
let ROLE = "vendedor";
const CRM_UID = "22222222-2222-4222-8222-222222222222";
let EMAIL: string | null = "vendedor@promobrindes.com.br";
let CRM_USERS: { id: string }[] = [{ id: CRM_UID }];
const crmCalls: string[] = [];

Deno.env.set("SUPABASE_URL", APP);
Deno.env.set("SUPABASE_ANON_KEY", "anon");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc");
Deno.env.set("EXTERNAL_CRM_URL", CRM);
Deno.env.set("EXTERNAL_CRM_SERVICE_ROLE_KEY", "crmsvc");
Deno.env.set("LOG_CREDENTIAL_RESOLUTION", "off");

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

globalThis.fetch = (async (input: Request | URL | string) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith(CRM)) {
    const u = decodeURIComponent(url);
    crmCalls.push(u);
    if (u.includes("/users?select=id&email=ilike.")) return json(CRM_USERS);
    return json([]);
  }
  if (url.includes("/auth/v1/user")) return json({ id: UID, email: EMAIL, aud: "authenticated", role: "authenticated" });
  if (url.includes("/rest/v1/user_roles")) return json([{ role: ROLE }]);
  if (url.includes("/rpc/check_ip_access")) return json("allow");
  if (url.includes("/rpc/check_rate_limit")) return json({ allowed: true });
  return json([]); // kill switch, integration_credentials, etc.
}) as typeof fetch;

let handler!: (req: Request) => Promise<Response>;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: any) => { handler = h; return {} as unknown; };
const BRIDGE = Deno.env.get("BRIDGE_PATH") ?? new URL("./index.ts", import.meta.url).href;
await import(BRIDGE);

async function call(body: unknown) {
  crmCalls.length = 0;
  const res = await handler(new Request("http://fn.local/crm-db-bridge", {
    method: "POST",
    headers: { Authorization: "Bearer tok", "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify(body),
  }));
  return { status: res.status, body: await res.json(), calls: [...crmCalls] };
}
const lastData = (calls: string[], table: string) =>
  calls.filter((c) => c.startsWith(`${CRM}/rest/v1/${table}?`)).at(-1) ?? "";


const reset = () => { ROLE = "vendedor"; EMAIL = "vendedor@promobrindes.com.br"; CRM_USERS = [{ id: CRM_UID }]; };

Deno.test("search companies (vendedor) filtra pelo usuário do CRM vinculado por e-mail", async () => {
  reset();
  const r = await call({ operation: "search", table: "companies", search: { column: "name", term: "abc" } });
  assertEquals(r.status, 200);
  assert(lastData(r.calls, "companies").includes(`user_id=eq.${CRM_UID}`), lastData(r.calls, "companies"));
  assert(!lastData(r.calls, "companies").includes(UID), "não pode filtrar pelo auth.uid do app");
});

Deno.test("batch contacts + contact_emails (vendedor): eq no dono e junção !inner no servidor", async () => {
  reset();
  const r = await call({ operation: "batch", queries: [
    { table: "contacts", select: "id,name" },
    { table: "contact_emails", select: "contact_id,email" },
  ] });
  assertEquals(r.status, 200);
  assert(lastData(r.calls, "contacts").includes(`user_id=eq.${CRM_UID}`));
  const emails = lastData(r.calls, "contact_emails");
  assert(emails.includes("contacts!inner(user_id)") && emails.includes(`contacts.user_id=eq.${CRM_UID}`), emails);
  assert(!emails.includes("contact_id=in."), "sem lista de ids na URL");
});

Deno.test("vendedor sem usuário no CRM (e-mail sem vínculo) → 403 com mensagem clara, sem consultar a tabela", async () => {
  reset(); CRM_USERS = [];
  // e-mail diferente para não reaproveitar o cache do teste anterior
  EMAIL = "sem-vinculo@promobrindes.com.br";
  const r = await call({ operation: "select", table: "companies" });
  assertEquals(r.status, 403);
  assert(String(r.body.error).includes("não está vinculado"), JSON.stringify(r.body));
  assertEquals(lastData(r.calls, "companies"), "");
});

Deno.test("supervisor NÃO recebe filtro de dono", async () => {
  reset(); ROLE = "supervisor";
  const r = await call({ operation: "search", table: "companies", search: { column: "name", term: "abc" } });
  assertEquals(r.status, 200);
  assert(!lastData(r.calls, "companies").includes("user_id=eq."));
});

Deno.test("escrita por vendedor continua 403", async () => {
  reset();
  const r = await call({ operation: "update", table: "companies", id: "33333333-3333-4333-8333-333333333333", data: { name: "y" } });
  assertEquals(r.status, 403);
});

Deno.test("batch com embedding no select é recusado (antes vazava companies/contatos sem escopo)", async () => {
  reset();
  const r = await call({ operation: "batch", queries: [
    { table: "suppliers", select: "id,companies(*,contacts(*,contact_emails(*),contact_phones(*)))" },
  ] });
  assertEquals(r.body.results[0].success, false);
  assertEquals(r.body.results[0].status, 400);
  assertEquals(lastData(r.calls, "suppliers"), "");
});

Deno.test("batch recusa chave de filtro arbitrária / or/and/not", async () => {
  reset();
  for (const filters of [{ "a.b": "x" }, { or: "x" }, { not: "x" }]) {
    const r = await call({ operation: "batch", queries: [{ table: "companies", filters }] });
    assertEquals(r.body.results[0].status, 400, JSON.stringify(filters));
  }
});
