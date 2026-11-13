// Teste de integração do crm-db-bridge com supabase-js REAL e rede falsa (fetch stub).
// Rodar: deno test --config <deno.json com nodeModulesDir:auto> -A --no-check supabase/functions/crm-db-bridge/scope_integration_test.ts
// (BRIDGE_PATH=file://…/index.ts). Regra do dono (12/11): vendedor só vê os dele; o dono no
// CRM é o usuário do CRM com o MESMO e-mail (o user_id do CRM não é o auth.uid deste app).
// Prova, pela URL PostgREST efetivamente montada, que select/search/batch aplicam o escopo.
import { assert, assertEquals } from "jsr:@std/assert@1";

const UID = "11111111-1111-4111-8111-111111111111";
const APP = "http://app.local";
const CRM = "http://crm.local";
let ROLE: string | null = "vendedor";
const CRM_UID = "22222222-2222-4222-8222-222222222222";
let EMAIL: string | null = "vendedor@promobrindes.com.br";
// Sem `email`, a linha devolvida pelo CRM usa o e-mail do chamador (vínculo exato).
let CRM_USERS: { id: string; email?: string }[] = [{ id: CRM_UID }];
const crmCalls: string[] = [];
// Quando definido, a próxima consulta de dados ao CRM devolve este erro do PostgREST.
let CRM_DATA_ERROR: { status: number; body: unknown } | null = null;

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
    if (u.includes("/rest/v1/users?select=id")) return json(CRM_USERS.map((r) => ({ email: EMAIL, ...r })));
    if (CRM_DATA_ERROR) return json(CRM_DATA_ERROR.body, CRM_DATA_ERROR.status);
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
  assert(lastData(r.calls, "companies").includes(`or=(user_id.eq.${CRM_UID},user_id.is.null)`), lastData(r.calls, "companies"));
  assert(!lastData(r.calls, "companies").includes(UID), "não pode filtrar pelo auth.uid do app");
});

Deno.test("batch contacts + contact_emails (vendedor): eq no dono e junção !inner no servidor", async () => {
  reset();
  const r = await call({ operation: "batch", queries: [
    { table: "contacts", select: "id,name" },
    { table: "contact_emails", select: "contact_id,email" },
  ] });
  assertEquals(r.status, 200);
  assert(lastData(r.calls, "contacts").includes(`or=(user_id.eq.${CRM_UID},user_id.is.null)`));
  const emails = lastData(r.calls, "contact_emails");
  assert(emails.includes("contacts!inner(user_id)") && emails.includes(`contacts.or=(user_id.eq.${CRM_UID},user_id.is.null)`), emails);
  assert(!emails.includes("contact_id=in."), "sem lista de ids na URL");
});

Deno.test("vendedor sem usuário no CRM (e-mail sem vínculo) → vê só os registros SEM dono (regra 13/11)", async () => {
  reset(); CRM_USERS = [];
  // e-mail diferente para não reaproveitar o cache do teste anterior
  EMAIL = "sem-vinculo@promobrindes.com.br";
  const r = await call({ operation: "select", table: "companies" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const u = lastData(r.calls, "companies");
  assert(u.includes("or=(user_id.is.null)") && !u.includes("user_id.eq."), u);
  const e = await call({ operation: "search", table: "contact_emails", search: { column: "email", term: "a" } });
  const eu = lastData(e.calls, "contact_emails");
  assert(eu.includes("contacts!inner(user_id)") && eu.includes("contacts.or=(user_id.is.null)") && !eu.includes(".eq."), eu);
  const c = await call({ operation: "select", table: "customers" });
  assert(lastData(c.calls, "customers").includes("or=(vendedor_id.is.null)"), lastData(c.calls, "customers"));
});

Deno.test("supervisor NÃO recebe filtro de dono", async () => {
  reset(); ROLE = "supervisor";
  const r = await call({ operation: "search", table: "companies", search: { column: "name", term: "abc" } });
  assertEquals(r.status, 200);
  assert(!lastData(r.calls, "companies").includes("user_id."), lastData(r.calls, "companies"));
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

// ── Gaps cobertos na revisão de 12/11 ───────────────────────────────────────────────
const usersLookups = (calls: string[]) => calls.filter((c) => c.startsWith(`${CRM}/rest/v1/users?`));

Deno.test("papel nulo / desconhecido cai em vendedor (com filtro de dono), nunca em leitura ampla", async () => {
  for (const role of [null, "agente", "coordenador"]) {
    reset(); ROLE = role;
    const r = await call({ operation: "select", table: "companies" });
    assertEquals(r.status, 200, String(role));
    assert(lastData(r.calls, "companies").includes(`or=(user_id.eq.${CRM_UID},user_id.is.null)`), `${role}: ${lastData(r.calls, "companies")}`);
  }
});

Deno.test("e-mail com % e _ : metacaracteres escapados no ilike do vínculo", async () => {
  reset(); EMAIL = "a%b_c@promobrindes.com.br";
  const r = await call({ operation: "select", table: "companies" });
  assertEquals(r.status, 200);
  const lookup = usersLookups(r.calls).at(-1) ?? "";
  assert(lookup.includes("email=ilike.a\\%b\\_c@promobrindes.com.br"), lookup);
});

Deno.test("e-mail com curinga do PostgREST (*) não vincula ao usuário do CRM de outra pessoa", async () => {
  reset(); EMAIL = "*@promobrindes.com.br";
  // o ilike do PostgREST trata * como %: o CRM devolve o usuário de OUTRO e-mail
  CRM_USERS = [{ id: CRM_UID, email: "diretor@promobrindes.com.br" }];
  const r = await call({ operation: "select", table: "companies" });
  assertEquals(r.status, 200);
  const u = lastData(r.calls, "companies");
  assert(u.includes("or=(user_id.is.null)") && !u.includes(CRM_UID), u); // nunca os do diretor
});

Deno.test("dois usuários do CRM com o mesmo e-mail → ambíguo → sem vínculo: só os sem dono", async () => {
  reset(); EMAIL = "duplicado@promobrindes.com.br";
  CRM_USERS = [{ id: CRM_UID }, { id: "44444444-4444-4444-8444-444444444444" }];
  const r = await call({ operation: "search", table: "contacts", search: { column: "name", term: "x" } });
  assertEquals(r.status, 200);
  const u = lastData(r.calls, "contacts");
  assert(u.includes("or=(user_id.is.null)") && !u.includes(CRM_UID) && !u.includes("44444444"), u);
});

Deno.test("cache do vínculo: mesmo e-mail não reconsulta; e-mail trocado reconsulta e usa o novo id", async () => {
  reset(); EMAIL = "cache-a@promobrindes.com.br";
  const r1 = await call({ operation: "select", table: "companies" });
  assertEquals(usersLookups(r1.calls).length, 1);
  const r2 = await call({ operation: "select", table: "companies" });
  assertEquals(usersLookups(r2.calls).length, 0, "segunda chamada deve vir do cache");
  // o usuário troca o e-mail no app → chave nova, consulta nova, id novo
  const NEW_UID = "55555555-5555-4555-8555-555555555555";
  EMAIL = "cache-b@promobrindes.com.br"; CRM_USERS = [{ id: NEW_UID }];
  const r3 = await call({ operation: "select", table: "companies" });
  assertEquals(usersLookups(r3.calls).length, 1);
  assert(lastData(r3.calls, "companies").includes(`or=(user_id.eq.${NEW_UID},user_id.is.null)`), lastData(r3.calls, "companies"));
});

Deno.test("batch: filtro do cliente em user_id não sobrepõe o escopo (AND com o dono)", async () => {
  reset();
  const r = await call({ operation: "batch", queries: [
    { table: "contacts", filters: { user_id: "99999999-9999-4999-8999-999999999999" } },
  ] });
  const u = lastData(r.calls, "contacts");
  assert(u.includes(`or=(user_id.eq.${CRM_UID},user_id.is.null)`), u);
});

Deno.test("search em contacts e contact_emails (vendedor) aplica o escopo", async () => {
  reset();
  const c = await call({ operation: "search", table: "contacts", search: { column: "name", term: "ana" } });
  assertEquals(c.status, 200);
  assert(lastData(c.calls, "contacts").includes(`or=(user_id.eq.${CRM_UID},user_id.is.null)`), lastData(c.calls, "contacts"));
  const e = await call({ operation: "search", table: "contact_emails", search: { column: "email", term: "ana" } });
  assertEquals(e.status, 200);
  const u = lastData(e.calls, "contact_emails");
  assert(u.includes("contacts!inner(user_id)") && u.includes(`contacts.or=(user_id.eq.${CRM_UID},user_id.is.null)`), u);
});

Deno.test("customers: vendedor vê os dele + sem dono (vendedor_id) em select/search/batch; filtro por company_id aceito; supervisor lê tudo", async () => {
  reset();
  const s = await call({ operation: "select", table: "customers", filters: { company_id: "c1" } });
  assertEquals(s.status, 200, JSON.stringify(s.body));
  const su = lastData(s.calls, "customers");
  assert(su.includes(`or=(vendedor_id.eq.${CRM_UID},vendedor_id.is.null)`) && su.includes("company_id=eq.c1"), su);
  const q = await call({ operation: "search", table: "customers", search: { column: "name", term: "x" } });
  assertEquals(q.status, 200);
  assert(lastData(q.calls, "customers").includes(`or=(vendedor_id.eq.${CRM_UID},vendedor_id.is.null)`), lastData(q.calls, "customers"));
  const b = await call({ operation: "batch", queries: [{ table: "customers" }] });
  assertEquals(b.body.results[0].success, true, JSON.stringify(b.body));
  assert(lastData(b.calls, "customers").includes(`or=(vendedor_id.eq.${CRM_UID},vendedor_id.is.null)`), lastData(b.calls, "customers"));
  // filtro do cliente em vendedor_id de OUTRO não amplia: os dois filtros somam (AND)
  const o = await call({ operation: "select", table: "customers", filters: { vendedor_id: "outro" } });
  const ou = lastData(o.calls, "customers");
  assert(ou.includes(`or=(vendedor_id.eq.${CRM_UID},vendedor_id.is.null)`), ou);
  reset(); ROLE = "supervisor";
  const ok = await call({ operation: "select", table: "customers", filters: { company_id: "c1" } });
  assertEquals(ok.status, 200);
  assert(!lastData(ok.calls, "customers").includes("vendedor_id"), lastData(ok.calls, "customers"));
});

Deno.test("erro de entrada do cliente vira 400 e NÃO abre o disjuntor (vendedor não derruba o bridge para todos)", async () => {
  reset();
  // 6 requisições com filtro 'or' (recusado na validação) e 6 com coluna inexistente (42703 do PostgREST)
  for (let i = 0; i < 6; i++) {
    const r = await call({ operation: "select", table: "companies", filters: { or: "x" } });
    assertEquals(r.status, 400, JSON.stringify(r.body));
  }
  CRM_DATA_ERROR = { status: 400, body: { code: "42703", message: "column companies.nao_existe does not exist" } };
  for (let i = 0; i < 6; i++) {
    const r = await call({ operation: "select", table: "companies", filters: { name: "x" } });
    assertEquals(r.status, 400, JSON.stringify(r.body));
  }
  CRM_DATA_ERROR = null;
  ROLE = "supervisor";
  const ok = await call({ operation: "select", table: "companies" });
  assertEquals(ok.status, 200, `disjuntor abriu por erro de cliente: ${JSON.stringify(ok.body)}`);
});

Deno.test("search/orderBy recusam coluna com ponto (tabela embutida) com 400", async () => {
  reset();
  const s = await call({ operation: "search", table: "contact_emails", search: { column: "contacts.user_id", term: "x" } });
  assertEquals(s.status, 400, JSON.stringify(s.body));
  const o = await call({ operation: "select", table: "companies", orderBy: { column: "contacts.user_id" } });
  assertEquals(o.status, 400, JSON.stringify(o.body));
});

Deno.test("erro 5xx real do CRM continua 500", async () => {
  reset();
  CRM_DATA_ERROR = { status: 503, body: { code: "PGRST002", message: "schema cache" } };
  const r = await call({ operation: "select", table: "suppliers" });
  CRM_DATA_ERROR = null;
  assertEquals(r.status, 500, JSON.stringify(r.body));
});
