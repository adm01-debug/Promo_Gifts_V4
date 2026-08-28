/**
 * Proves that the real ai-recommendations handler honors its existing remote
 * kill switch before authentication, rate limiting, credential resolution, or
 * any AI gateway request.
 */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

type EdgeHandler = (request: Request) => Response | Promise<Response>;

const ENV_NAMES = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;
const originalEnv = new Map(ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const));

Deno.env.set('SUPABASE_URL', 'https://ai-kill-switch-contract.invalid');
Deno.env.set('SUPABASE_ANON_KEY', 'anon-contract-only');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-contract-only');

let handler: EdgeHandler | undefined;
const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, 'serve');
Object.defineProperty(Deno, 'serve', {
  configurable: true,
  writable: true,
  value: (candidate: EdgeHandler) => {
    handler = candidate;
    return {};
  },
});

try {
  await import('./index.ts');
} finally {
  if (serveDescriptor) Object.defineProperty(Deno, 'serve', serveDescriptor);
}

assert(handler, 'index.ts must register a Deno.serve callback');

const originalFetch = globalThis.fetch;

Deno.test({
  name: 'ai-recommendations real handler: disabled switch returns 410 before auth and AI',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const requests: string[] = [];
    globalThis.fetch = ((input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      requests.push(url.pathname);
      if (url.pathname === '/rest/v1/system_kill_switches') {
        return Promise.resolve(new Response(JSON.stringify([{
          enabled: false,
          legacy_message: 'AI recommendations temporarily disabled.',
        }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'unexpected_request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));
    }) as typeof fetch;

    try {
      const response = await handler!(new Request(
        'https://edge-contract.invalid/functions/v1/ai-recommendations',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ client: { name: 'Acme' }, products: [] }),
        },
      ));
      assertEquals(response.status, 410);
      const body = await response.json();
      assertEquals(body.switch, 'edge_ai_recommendations');
      assertEquals(requests.length, 1);
      assertEquals(requests[0], '/rest/v1/system_kill_switches');
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of ENV_NAMES) {
        const value = originalEnv.get(name);
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
});
