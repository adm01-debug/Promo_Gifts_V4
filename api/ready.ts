import { randomUUID } from 'node:crypto';

const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CANONICAL_SUPABASE_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;
const PROBE_TIMEOUT_MS = 3_000;
const AUTH_HEALTH_PATH = '/auth/v1/health';
const POSTGREST_HEALTH_PATH = '/rest/v1/rpc/get_sitemap_public';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(payload: unknown): void;
  end(): void;
}

interface ProbeResult {
  status: 'ok' | 'error';
  latency_ms: number;
  http_status?: number;
  reason?: 'timeout' | 'unreachable';
}

function requestIdFrom(req: ApiRequest): string {
  const raw = req.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;

  if (candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}

function respond(
  req: ApiRequest,
  res: ApiResponse,
  statusCode: number,
  payload: Record<string, unknown>,
): void {
  if (req.method === 'HEAD') {
    res.status(statusCode).end();
    return;
  }

  res.status(statusCode).json(payload);
}

async function probe(url: string, init: RequestInit): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return { status: 'error', http_status: response.status, latency_ms: latencyMs };
    }

    return { status: 'ok', latency_ms: latencyMs };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unreachable',
      latency_ms: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const requestId = requestIdFrom(req);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ status: 'error', error: 'method_not_allowed', requestId });
    return;
  }

  const configuredUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const configuredProjectId = (process.env.VITE_SUPABASE_PROJECT_ID || '').trim();
  const publishableKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const configIsCanonical =
    configuredUrl === CANONICAL_SUPABASE_URL && configuredProjectId === CANONICAL_PROJECT_ID;

  if (!configIsCanonical || !publishableKey) {
    respond(req, res, 503, {
      status: 'not_ready',
      checks: {
        config: {
          status: 'error',
          reason: !configIsCanonical ? 'canonical_project_mismatch' : 'publishable_key_missing',
        },
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const [auth, postgrest] = await Promise.all([
    probe(`${CANONICAL_SUPABASE_URL}${AUTH_HEALTH_PATH}`, {
      headers: {
        apikey: publishableKey,
        'x-request-id': requestId,
      },
    }),
    probe(`${CANONICAL_SUPABASE_URL}${POSTGREST_HEALTH_PATH}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ p_limit: 1, p_offset: 0 }),
    }),
  ]);

  const checks = {
    config: { status: 'ok' },
    auth,
    postgrest,
  };

  if (auth.status !== 'ok' || postgrest.status !== 'ok') {
    respond(req, res, 503, {
      status: 'degraded',
      checks,
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  respond(req, res, 200, {
    status: 'ready',
    checks,
    requestId,
    timestamp: new Date().toISOString(),
  });
}
