import { randomUUID } from 'node:crypto';

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

export default function handler(req: ApiRequest, res: ApiResponse): void {
  const requestId = requestIdFrom(req);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ status: 'error', error: 'method_not_allowed', requestId });
    return;
  }

  const commit =
    process.env.APP_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    'unknown';
  const version = process.env.APP_VERSION || process.env.npm_package_version || commit.slice(0, 7);
  const payload = {
    status: 'ok',
    version,
    commit,
    requestId,
    timestamp: new Date().toISOString(),
  };

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).json(payload);
}
