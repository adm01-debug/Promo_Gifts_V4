import { randomUUID } from 'node:crypto';

const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CANONICAL_SUPABASE_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;
const PROBE_TIMEOUT_MS = 3_000;

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
  const configuredProjectId = process.env.VITE_SUPABASE_PROJECT_ID || '';
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${CANONICAL_SUPABASE_URL}/auth/v1/health`, {
      headers: {
        apikey: publishableKey,
        'x-request-id': requestId,
      },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      respond(req, res, 200, {
        status: 'degraded',
        checks: {
          config: { status: 'ok' },
          supabase: { status: 'error', http_status: response.status, latency_ms: latencyMs },
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    respond(req, res, 200, {
      status: 'ready',
      checks: {
        config: { status: 'ok' },
        supabase: { status: 'ok', latency_ms: latencyMs },
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    respond(req, res, 200, {
      status: 'degraded',
      checks: {
        config: { status: 'ok' },
        supabase: {
          status: 'error',
          reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unreachable',
          latency_ms: latencyMs,
        },
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } finally {
    clearTimeout(timeout);
  }
}
