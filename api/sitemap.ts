/**
 * api/sitemap.ts — Sitemap XML Dinâmico
 *
 * Vercel Serverless Function que gera sitemap.xml completo
 * a partir do RPC público restrito get_sitemap_public no Supabase.
 *
 * URL pública: https://www.promogifts.com.br/sitemap.xml
 * Cache: 12h (stale-while-revalidate: 24h) — Google reindexação diária
 *
 * Pré-requisito: vercel.json deve mapear /sitemap.xml → /api/sitemap e não
 * pode existir public/sitemap.xml, pois um arquivo estático vence a rewrite.
 * fix_version: seo_sitemap_dynamic_v1_20260627
 */
import { randomUUID } from 'node:crypto';

const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CANONICAL_SUPABASE_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;
const BASE_URL = 'https://www.promogifts.com.br';
const PAGE_SIZE = 1000;

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  send(payload: string): void;
  end(): void;
}

interface SitemapRow {
  url_type: string;
  url_path: string;
  identifier: string;
  title: string;
  lastmod: string;
  priority: number;
  changefreq: string;
  image_url: string | null;
}

class SitemapUpstreamError extends Error {
  constructor(readonly httpStatus: number) {
    super(`Supabase REST returned HTTP ${httpStatus}`);
    this.name = 'SitemapUpstreamError';
  }
}

function requestIdFrom(req: ApiRequest): string {
  const raw = req.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;

  if (candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchPage(
  offset: number,
  publishableKey: string,
  requestId: string,
): Promise<SitemapRow[]> {
  const url = `${CANONICAL_SUPABASE_URL}/rest/v1/rpc/get_sitemap_public`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
      'x-request-id': requestId,
    },
    body: JSON.stringify({ p_limit: PAGE_SIZE, p_offset: offset }),
  });

  if (!res.ok) throw new SitemapUpstreamError(res.status);
  return (await res.json()) as SitemapRow[];
}

function sendXml(req: ApiRequest, res: ApiResponse, status: number, body: string): void {
  if (req.method === 'HEAD') {
    res.status(status).end();
    return;
  }

  res.status(status).send(body);
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const requestId = requestIdFrom(req);
  res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    sendXml(
      req,
      res,
      405,
      '<?xml version="1.0"?><error code="method_not_allowed">Method not allowed</error>',
    );
    return;
  }

  const configuredUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const configuredProjectId = process.env.VITE_SUPABASE_PROJECT_ID || '';
  const publishableKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const configIsCanonical =
    configuredUrl === CANONICAL_SUPABASE_URL && configuredProjectId === CANONICAL_PROJECT_ID;

  if (!configIsCanonical || !publishableKey) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Retry-After', '60');
    sendXml(
      req,
      res,
      503,
      '<?xml version="1.0"?><error code="not_ready">Sitemap unavailable</error>',
    );
    return;
  }

  try {
    // Paginar até 15.000 URLs (suficiente para 7k produtos + 413 categorias)
    const allRows: SitemapRow[] = [];
    let offset = 0;

    while (offset < 15_000) {
      const page = await fetchPage(offset, publishableKey, requestId);
      if (!page || page.length === 0) break;
      allRows.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    // Adicionar homepage estática
    const staticUrls: SitemapRow[] = [
      {
        url_type: 'static',
        url_path: '/',
        identifier: 'home',
        title: 'Início',
        lastmod: new Date().toISOString(),
        priority: 1.0,
        changefreq: 'daily',
        image_url: null,
      },
    ];

    const rows = [...staticUrls, ...allRows];

    // Gerar XML
    const urlset = rows
      .map((row) => {
        const loc = `${BASE_URL}${row.url_path}`;
        const lastmod = row.lastmod ? new Date(row.lastmod).toISOString().split('T')[0] : '';
        const imageTag = row.image_url
          ? `
    <image:image>
      <image:loc>${escapeXml(row.image_url)}</image:loc>
      <image:title>${escapeXml(row.title || '')}</image:title>
    </image:image>`
          : '';

        return `  <url>
    <loc>${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${row.changefreq || 'weekly'}</changefreq>
    <priority>${(row.priority || 0.7).toFixed(1)}</priority>${imageTag}
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlset}
</urlset>`;

    // Cache 12h, stale-while-revalidate 24h — Google não precisa de tempo real
    res.setHeader('Cache-Control', 'public, max-age=43200, stale-while-revalidate=86400');
    res.setHeader('X-Sitemap-Count', String(rows.length));
    sendXml(req, res, 200, xml);
  } catch (err) {
    console.error('[sitemap] upstream unavailable', {
      requestId,
      httpStatus: err instanceof SitemapUpstreamError ? err.httpStatus : undefined,
      errorKind: err instanceof SitemapUpstreamError ? 'http_error' : 'unreachable',
    });
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Retry-After', '60');
    sendXml(
      req,
      res,
      503,
      '<?xml version="1.0"?><error code="degraded">Sitemap unavailable</error>',
    );
  }
}
