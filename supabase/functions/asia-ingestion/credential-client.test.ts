// Real handler + both pinned SDKs; only fetch, environment and serve are isolated.
// Run: deno test --allow-env --config supabase/functions/deno.json <this file>
type Handler = (request: Request) => Response | Promise<Response>;
type Recorded = { url: URL; method: string; client: string; body: string };
const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'ASIA_BASE_URL', 'ASIA_INGESTION_CRON_SECRET', 'ASIA_SUPPLIER_ID', 'LOG_CREDENTIAL_RESOLUTION'];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('asia-ingestion: SSOT credential client preserves authorization and supplier scope', async t => {
  const previous = new Map(keys.map(key => [key, Deno.env.get(key)]));
  const originalFetch = globalThis.fetch;
  const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, 'serve');
  const recorded: Recorded[] = [];
  let handler: Handler | undefined;
  let supplierConfigured = true;
  const env = {
    SUPABASE_URL: 'https://asia-db-contract.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'contract-service-role-only',
    SUPABASE_ANON_KEY: 'contract-anon-only',
    ASIA_BASE_URL: 'https://asia-supplier-contract.invalid',
    ASIA_INGESTION_CRON_SECRET: 'asia-cron-contract-only',
    LOG_CREDENTIAL_RESOLUTION: 'off',
  };
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
  Deno.env.delete('ASIA_SUPPLIER_ID');
  const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.clone().text();
    recorded.push({ url, method: request.method, client: request.headers.get('X-Client-Info') ?? '', body });
    if (url.origin === env.SUPABASE_URL) {
      if (url.pathname === '/rest/v1/rpc/get_edge_function_secret') return json(null);
      if (url.pathname === '/rest/v1/integration_credentials') return json(supplierConfigured ? [{ secret_value: 'supplier-contract-id' }] : []);
      if (url.pathname === '/rest/v1/supplier_products_raw' && request.method === 'POST') return json(null);
    }
    if (url.origin === env.ASIA_BASE_URL && url.pathname === '/api/products') {
      return json({ total_paginas: 1, produtos: [{ referencia: 'CONTRACT-SKU', nome: 'Contract product' }] });
    }
    throw new Error(`Unexpected isolated fetch: ${request.method} ${url.origin}${url.pathname}`);
  };
  Object.defineProperty(Deno, 'serve', { configurable: true, writable: true, value: (candidate: Handler) => { handler = candidate; } });
  try {
    const { invalidateCredentialCache } = await import('../_shared/credentials.ts');
    await import('./index.ts');
    assert(handler, 'The real handler must register');
    const registeredHandler = handler;
    const call = (method: string, secret?: string) => registeredHandler(new Request('https://edge-contract.invalid/asia-ingestion', {
      method,
      headers: secret ? { 'x-cron-secret': secret, 'X-Request-Id': 'asia-client-contract' } : {},
    }));
    await t.step('preflight never reads credentials or writes products', async () => {
      recorded.length = 0;
      const response = await call('OPTIONS');
      assert(response.status === 200, 'Preflight must remain successful');
      assert(recorded.length === 0, 'Preflight must not perform external I/O');
    });
    await t.step('missing or incorrect caller secret never reaches supplier data', async () => {
      for (const secret of [undefined, 'wrong-contract-secret']) {
        recorded.length = 0;
        const response = await call('POST', secret);
        assert(response.status === 401, 'Unauthorized calls must remain rejected');
        assert(recorded.every(entry => entry.url.pathname === '/rest/v1/rpc/get_edge_function_secret'), 'Unauthorized calls must not resolve a supplier or write a product');
      }
    });
    await t.step('SSOT reads the same database, and the ingestion SDK keeps its supplier scope', async () => {
      invalidateCredentialCache();
      recorded.length = 0;
      const response = await call('POST', env.ASIA_INGESTION_CRON_SECRET);
      const data = await response.json();
      assert(response.status === 200 && data.ok === true && data.inserted === 1, 'The real ingestion must complete');
      const credential = recorded.find(entry => entry.url.pathname === '/rest/v1/integration_credentials');
      assert(credential?.url.origin === env.SUPABASE_URL, 'Credential reads must use the canonical request environment');
      assert(credential.url.searchParams.get('secret_name') === 'eq.ASIA_SUPPLIER_ID', 'Credential lookup must stay scoped to the requested name');
      assert(credential.url.searchParams.get('is_active') === 'eq.true', 'Disabled credentials must stay excluded');
      assert(credential.client.includes('2.49.4'), 'The SSOT must use its own pinned SDK');
      const write = recorded.find(entry => entry.url.pathname === '/rest/v1/supplier_products_raw');
      assert(write, 'The real ingestion must write its scoped rows');
      assert(write.client.includes('2.119.0'), 'The ingestion SDK must not be downgraded');
      const rows = JSON.parse(write.body);
      assert(rows.length === 1 && rows[0].supplier_id === 'supplier-contract-id' && rows[0].supplier_sku === 'CONTRACT-SKU', 'The supplied row must retain the resolved supplier and SKU');
    });
    await t.step('missing supplier credential fails before catalogue fetch or mutation', async () => {
      invalidateCredentialCache();
      supplierConfigured = false;
      recorded.length = 0;
      const response = await call('POST', env.ASIA_INGESTION_CRON_SECRET);
      assert(response.status === 500, 'Missing supplier must keep its explicit failure');
      assert(!recorded.some(entry => entry.url.origin === env.ASIA_BASE_URL || entry.url.pathname === '/rest/v1/supplier_products_raw'), 'Missing credentials must prevent catalogue fetches and writes');
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (serveDescriptor) Object.defineProperty(Deno, 'serve', serveDescriptor);
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
