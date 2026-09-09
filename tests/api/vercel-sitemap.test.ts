import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import sitemapHandler from '../../api/sitemap';

interface MockResponse {
  headers: Record<string, string>;
  statusCode: number;
  body: string | undefined;
  ended: boolean;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  send(payload: string): void;
  end(): void;
}

function responseMock(): MockResponse {
  return {
    headers: {},
    statusCode: 0,
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
    },
    end() {
      this.ended = true;
    },
  };
}

const canonicalEnv = {
  VITE_SUPABASE_URL: 'https://doufsxqlfjyuvxuezpln.supabase.co',
  VITE_SUPABASE_PROJECT_ID: 'doufsxqlfjyuvxuezpln',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

describe('Vercel dynamic sitemap', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, ...canonicalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('generates XML from canonical PostgREST and exposes the result count', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json([
        {
          url_type: 'product',
          url_path: '/produto/caneca',
          identifier: 'caneca',
          title: 'Caneca & Café',
          lastmod: '2026-09-09T12:00:00.000Z',
          priority: 0.8,
          changefreq: 'weekly',
          image_url: 'https://images.example/caneca?a=1&b=2',
        },
      ]),
    );
    const res = responseMock();

    await sitemapHandler({ method: 'GET', headers: { 'x-request-id': 'sitemap-check-1' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/xml; charset=UTF-8');
    expect(res.headers['cache-control']).toContain('max-age=43200');
    expect(res.headers['x-sitemap-count']).toBe('2');
    expect(res.headers['x-request-id']).toBe('sitemap-check-1');
    expect(res.body).toContain('<loc>https://www.promogifts.com.br/produto/caneca</loc>');
    expect(res.body).toContain('<image:title>Caneca &amp; Café</image:title>');
    expect(res.body).toContain('caneca?a=1&amp;b=2');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/rpc/get_sitemap_public',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_limit: 1000, p_offset: 0 }),
        headers: expect.objectContaining({
          apikey: 'test-publishable-key',
          Authorization: 'Bearer test-publishable-key',
          'x-request-id': 'sitemap-check-1',
        }),
      }),
    );
  });

  it('fails closed with 503 before fetching when configuration is incomplete', async () => {
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = responseMock();

    await sitemapHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect(res.headers['retry-after']).toBe('60');
    expect(res.body).toContain('code="not_ready"');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('paginates the public RPC with bounded parameters', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      url_type: 'product',
      url_path: `/produto/item-${index}`,
      identifier: `item-${index}`,
      title: `Item ${index}`,
      lastmod: '2026-09-09T12:00:00.000Z',
      priority: 0.7,
      changefreq: 'weekly',
      image_url: null,
    }));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(fullPage))
      .mockResolvedValueOnce(Response.json([]));
    const res = responseMock();

    await sitemapHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-sitemap-count']).toBe('1001');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ p_limit: 1000, p_offset: 0 }));
    expect(fetchMock.mock.calls[1][1]?.body).toBe(
      JSON.stringify({ p_limit: 1000, p_offset: 1000 }),
    );
  });

  it('fails closed with 503 and no credential disclosure on a PostgREST error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const res = responseMock();

    await sitemapHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect(res.body).toContain('code="degraded"');
    expect(res.body).not.toContain('401');
    expect(res.body).not.toContain('test-publishable-key');
  });

  it('supports HEAD and rejects mutating methods', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]));
    const head = responseMock();
    const post = responseMock();

    await sitemapHandler({ method: 'HEAD', headers: {} }, head);
    await sitemapHandler({ method: 'POST', headers: {} }, post);

    expect(head.statusCode).toBe(200);
    expect(head.ended).toBe(true);
    expect(head.body).toBeUndefined();
    expect(post.statusCode).toBe(405);
    expect(post.headers.allow).toBe('GET, HEAD');
  });

  it('has no embedded key or static file that can shadow the rewrite', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../api/sitemap.ts'), 'utf8');
    const staticSitemap = path.resolve(__dirname, '../../public/sitemap.xml');

    expect(source).not.toContain('eyJhbGci');
    expect(source).not.toContain('@vercel/node');
    expect(source).not.toContain('/rest/v1/vw_sitemap_all');
    expect(fs.existsSync(staticSitemap)).toBe(false);
  });
});
