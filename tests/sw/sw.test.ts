/**
 * public/sw.js — suíte de testes real (gap crítico da auditoria 2026-09).
 *
 * Até este commit, o service worker (8+ bugs documentados no próprio
 * CHANGELOG do arquivo: BUG-SW-7 a BUG-SW-24) tinha ZERO cobertura
 * automatizada — todas as correções foram validadas manualmente em
 * produção. Esta suíte carrega o script real via `sw-harness.ts` (vm
 * context com Cache Storage/fetch/clients mockados) e exercita os
 * comportamentos documentados, fixando-os como regressão.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSwHarness, makeRequest, urlOf, MockCacheStorage, ORIGIN } from './sw-harness';

const CACHE_NAME = 'app-cache-v19';

function jsRes(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, headers: { 'content-type': 'application/javascript' }, ...init });
}

describe('sw.js — install/activate', () => {
  it('precacheia os critical assets e ativa skipWaiting sem lançar mesmo se um optional falhar', async () => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.reject(new TypeError('network down')));
    await expect(h.triggerInstall()).resolves.toBeUndefined();

    const cache = await h.cacheStorage.open(CACHE_NAME);
    await expect(cache.match('/index.html')).resolves.toBeDefined();
    await expect(cache.match('/manifest.json')).resolves.toBeDefined();
  });

  it('activate remove caches de versões antigas e preserva os atuais', async () => {
    const h = createSwHarness();
    await h.cacheStorage.open('app-cache-v18');
    await h.cacheStorage.open(CACHE_NAME);
    await h.cacheStorage.open('images-cache-v19');

    await h.triggerActivate();

    const remaining = await h.cacheStorage.keys();
    expect(remaining).not.toContain('app-cache-v18');
    expect(remaining).toContain(CACHE_NAME);
    expect(remaining).toContain('images-cache-v19');
  });
});

describe('sw.js — predicados de roteamento (extensão base64url, BUG-SW-9)', () => {
  it.each([
    ['/assets/CloudStatusBanner-Dkobv_wg.js', true],
    ['/assets/main-abc123.css', true],
    ['/assets/font-Ax_9-Z.woff2', true],
    ['/assets/img.png', false],
    ['/favicon.ico', false],
    ['/assets/no-extension', false],
  ])('isHashedAsset(%s) === %s', async (pathname, expected) => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.resolve(jsRes('ok')));
    const req = makeRequest(ORIGIN + pathname);
    // Roteia via fetch real para confirmar que Seção C (cache-first + recovery)
    // é ou não acionada — proxy observável: cache é populado só na Seção C.
    await h.triggerFetch(req);
    const cache = await h.cacheStorage.open(CACHE_NAME);
    const cached = await cache.match(req.url);
    expect(Boolean(cached)).toBe(expected);
  });

  it('BUG-SW-23: bypassa totalmente os 2 chunks de bootstrap (sem respondWith)', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/rolldown-runtime-abc123.js');
    await expect(h.triggerFetch(req)).rejects.toThrow(/nenhum handler.*respondwith/i);
  });

  it('BUG-SW-8: /api sem trailing slash não é tratado como rota SPA', async () => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.resolve(new Response('{}', { status: 200 })));
    const req = makeRequest(ORIGIN + '/api', { mode: 'cors' });
    const res = await h.triggerFetch(req);
    // Se fosse tratado como SPA, devolveria o index.html cacheado (ou offlineFallback);
    // devendo em vez disso seguir a Seção E normal (network fetch).
    expect(await res.text()).toBe('{}');
  });
});

describe('sw.js — Seção C: handleHashedAsset (BUG-SW-9/10/11/14/15/21)', () => {
  beforeEach(() => {});

  it('cache hit: devolve direto do cache sem tocar a rede', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    const cache = await h.cacheStorage.open(CACHE_NAME);
    await cache.put(req.url, jsRes('cached-content'));
    h.setFetchImpl(() => Promise.reject(new Error('não deveria chamar a rede')));

    const res = await h.triggerFetch(req);
    expect(await res.text()).toBe('cached-content');
  });

  it('network ok: cacheia e corrige Content-Type quando ausente', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    h.setFetchImpl(() => Promise.resolve(new Response('const x=1;', { status: 200 })));

    const res = await h.triggerFetch(req);
    expect(res.headers.get('content-type')).toContain('application/javascript');

    const cache = await h.cacheStorage.open(CACHE_NAME);
    const cached = await cache.match(req.url);
    expect(await cached!.text()).toBe('const x=1;');
  });

  it('BUG-SW-14/15: 503 (Vercel "Stale Chunk") na 1ª tentativa e retry falha → handleStaleChunk + staleChunkResponse 503 (nunca HTML)', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    let calls = 0;
    h.setFetchImpl(() => {
      calls += 1;
      return Promise.resolve(new Response('', { status: 503, statusText: 'Stale Chunk' }));
    });

    const res = await h.triggerFetch(req);
    expect(calls).toBe(2); // 1 tentativa + 1 retry (1s) — ambas 503
    expect(res.status).toBe(503);
    expect(res.headers.get('content-type')).toContain('application/javascript');
    expect(res.headers.get('content-type')).not.toContain('text/html');

    // handleStaleChunk deve ter: (a) postado SW_STALE_CHUNK pros clients
    expect(h.clientsCalls.some((c) => c.type === 'matchAll')).toBe(true);
    // (b) limpo index.html/root do cache
    const cache = await h.cacheStorage.open(CACHE_NAME);
    await expect(cache.match('/index.html')).resolves.toBeUndefined();
  });

  it('BUG-SW-9: 200 mas corpo HTML num módulo (edge devolvendo fallback antigo) é tratado como stale', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    h.setFetchImpl(() =>
      Promise.resolve(new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    );

    const res = await h.triggerFetch(req);
    expect(res.status).toBe(503);
    expect(res.headers.get('content-type')).not.toContain('text/html');
  });

  it('retry (após 1s) recupera: 1ª tentativa 404, 2ª tentativa ok → serve o asset e cacheia', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    let calls = 0;
    h.setFetchImpl(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(new Response('', { status: 404 }));
      return Promise.resolve(new Response('const x=2;', { status: 200 }));
    });

    const res = await h.triggerFetch(req);
    expect(calls).toBe(2);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('const x=2;');
    // Recovery bem-sucedido não deve disparar handleStaleChunk.
    expect(h.clientsCalls.length).toBe(0);
  });

  it('erro de rede (offline) devolve staleChunkResponse sem loop de reload', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    h.setFetchImpl(() => Promise.reject(new TypeError('Failed to fetch')));

    const res = await h.triggerFetch(req);
    expect(res.status).toBe(503);
    expect(h.clientsCalls.length).toBe(0); // path de erro de rede não chama handleStaleChunk
  });

  it('500 é tratado como stale igual 503/404 (looksStale = !res.ok, sem distinção) — dispara recovery', async () => {
    // looksStale() só verifica `!res.ok`: NÃO existe hoje um branch alcançável
    // de "erro não-ok porém não-obsoleto" para hashed assets (o fallback das
    // linhas ~419-421 do sw.js é código morto — acceptable() e looksStale()
    // são complementares para !res.ok). Documentando o comportamento REAL.
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/assets/app-abc123.js');
    h.setFetchImpl(() => Promise.resolve(new Response('server error', { status: 500 })));

    const res = await h.triggerFetch(req);
    expect(res.status).toBe(503);
    expect(h.clientsCalls.some((c) => c.type === 'matchAll')).toBe(true);
    const cache = await h.cacheStorage.open(CACHE_NAME);
    await expect(cache.match(req.url)).resolves.toBeUndefined();
  });
});

describe('sw.js — BUG-SW-24: lastStaleAt persiste em Cache Storage (sobrevive a "restart" do worker)', () => {
  it('um chunk stale detectado por uma instância do worker é lembrado por uma 2ª instância recém-criada', async () => {
    const sharedCache = new MockCacheStorage();
    const h1 = createSwHarness(sharedCache);
    const staleReq = makeRequest(ORIGIN + '/assets/app-abc123.js');
    h1.setFetchImpl(() => Promise.resolve(new Response('', { status: 503 })));
    await h1.triggerFetch(staleReq); // dispara handleStaleChunk → setLastStaleAt

    // "Worker reciclado": nova instância (novo vm context, novos listeners),
    // mas o MESMO Cache Storage (persistido em disco no browser real).
    const h2 = createSwHarness(sharedCache);
    let indexUrlUsed = '';
    h2.setFetchImpl((input) => {
      indexUrlUsed = urlOf(input);
      return Promise.resolve(new Response('<html>fresh</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    });
    const navReq = makeRequest(ORIGIN + '/carrinhos', { mode: 'navigate' });
    await h2.triggerFetch(navReq);

    expect(indexUrlUsed).toContain('__swbust=');
  });

  it('sem chunk stale recente, navegação normal usa cache:no-cache sem __swbust', async () => {
    const h = createSwHarness();
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    h.setFetchImpl((input, init) => {
      capturedUrl = urlOf(input);
      capturedInit = init;
      return Promise.resolve(new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    });
    const navReq = makeRequest(ORIGIN + '/carrinhos', { mode: 'navigate' });
    await h.triggerFetch(navReq);
    expect(capturedUrl).not.toContain('__swbust');
    expect(capturedInit?.cache).toBe('no-cache');
  });

  it('janela de 120s expira: stale há 121s não força mais o cache-bust', async () => {
    const sharedCache = new MockCacheStorage();
    const cache = await sharedCache.open(CACHE_NAME);
    const staleAt = Date.now() - 121_000;
    await cache.put('/__sw-meta/last-stale-at', new Response(String(staleAt)));

    const h = createSwHarness(sharedCache);
    let capturedUrl = '';
    h.setFetchImpl((input) => {
      capturedUrl = urlOf(input);
      return Promise.resolve(new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    });
    await h.triggerFetch(makeRequest(ORIGIN + '/carrinhos', { mode: 'navigate' }));
    expect(capturedUrl).not.toContain('__swbust');
  });

  it('dentro da janela de 120s, força cache-bust mesmo sem __bare na URL', async () => {
    const sharedCache = new MockCacheStorage();
    const cache = await sharedCache.open(CACHE_NAME);
    const staleAt = Date.now() - 5_000;
    await cache.put('/__sw-meta/last-stale-at', new Response(String(staleAt)));

    const h = createSwHarness(sharedCache);
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    h.setFetchImpl((input, init) => {
      capturedUrl = urlOf(input);
      capturedInit = init;
      return Promise.resolve(new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    });
    await h.triggerFetch(makeRequest(ORIGIN + '/carrinhos', { mode: 'navigate' }));
    expect(capturedUrl).toContain('__swbust=');
    expect(capturedInit?.cache).toBe('no-store');
  });
});

describe('sw.js — Seção B: navegação (BUG-SW-22 cache-bust do edge)', () => {
  it('retry via __bare força /index.html?__swbust=... com cache:no-store', async () => {
    const h = createSwHarness();
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    h.setFetchImpl((input, init) => {
      capturedUrl = urlOf(input);
      capturedInit = init;
      return Promise.resolve(new Response('<html>fresh</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    });
    await h.triggerFetch(makeRequest(ORIGIN + '/carrinhos?__bare=1', { mode: 'navigate' }));
    expect(capturedUrl).toContain('__swbust=');
    expect(capturedInit?.cache).toBe('no-store');
  });

  it('navegação ok cacheia /index.html e /', async () => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.resolve(new Response('<html>v2</html>', { status: 200, headers: { 'content-type': 'text/html' } })));
    await h.triggerFetch(makeRequest(ORIGIN + '/orcamentos', { mode: 'navigate' }));

    const cache = await h.cacheStorage.open(CACHE_NAME);
    const indexCached = await cache.match('/index.html');
    const rootCached = await cache.match('/');
    expect(await indexCached!.text()).toBe('<html>v2</html>');
    expect(await rootCached!.text()).toBe('<html>v2</html>');
  });

  it('rede falha (offline) → serve /index.html do cache; sem cache, offlineFallback (200 HTML)', async () => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.reject(new TypeError('Failed to fetch')));

    const res = await h.triggerFetch(makeRequest(ORIGIN + '/orcamentos', { mode: 'navigate' }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('offline');
  });

  it('rede responde não-ok (5xx) e há index.html cacheado → serve o cache em vez do erro', async () => {
    const h = createSwHarness();
    const cache = await h.cacheStorage.open(CACHE_NAME);
    await cache.put('/index.html', new Response('<html>cached</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    h.setFetchImpl(() => Promise.resolve(new Response('gateway error', { status: 502 })));

    const res = await h.triggerFetch(makeRequest(ORIGIN + '/orcamentos', { mode: 'navigate' }));
    expect(await res.text()).toBe('<html>cached</html>');
  });
});

describe('sw.js — Seção E: rotas SPA não-navigate servem index.html do cache (BUG-SW-7/8)', () => {
  it('prefetch de rota SPA sem extensão usa o cache, nunca a rede', async () => {
    const h = createSwHarness();
    const cache = await h.cacheStorage.open(CACHE_NAME);
    await cache.put('/index.html', new Response('<html>spa</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    h.setFetchImpl(() => Promise.reject(new Error('não deveria tocar a rede')));

    const res = await h.triggerFetch(makeRequest(ORIGIN + '/filtros', { mode: 'cors' }));
    expect(await res.text()).toBe('<html>spa</html>');
  });

  it('sem index.html em cache, cai no offlineFallback', async () => {
    const h = createSwHarness();
    const res = await h.triggerFetch(makeRequest(ORIGIN + '/filtros', { mode: 'cors' }));
    expect(await res.text()).toContain('offline');
  });

  it('caminho com extensão (ex: /robots.txt) NÃO é tratado como SPA — segue Seção E genérica', async () => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.resolve(new Response('User-agent: *', { status: 200, headers: { 'content-type': 'text/plain' } })));
    const res = await h.triggerFetch(makeRequest(ORIGIN + '/robots.txt'));
    expect(await res.text()).toBe('User-agent: *');
  });
});

describe('sw.js — Seção D: imagens (Cache First + LRU)', () => {
  it('serve do cache quando presente e não expirado', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/img/produto.png');
    const cache = await h.cacheStorage.open('images-cache-v19');
    await cache.put(req.url, new Response('cached-bytes', { status: 200, headers: { date: new Date().toUTCString() } }));
    h.setFetchImpl(() => Promise.reject(new Error('não deveria tocar a rede')));

    const res = await h.triggerFetch(req);
    expect(await res.text()).toBe('cached-bytes');
  });

  it('imagem expirada (TTL 90d) busca de novo na rede e recacheia', async () => {
    const h = createSwHarness();
    const req = makeRequest(ORIGIN + '/img/produto.png');
    const cache = await h.cacheStorage.open('images-cache-v19');
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toUTCString();
    await cache.put(req.url, new Response('stale-bytes', { status: 200, headers: { date: oldDate } }));
    h.setFetchImpl(() => Promise.resolve(new Response('fresh-bytes', { status: 200 })));

    const res = await h.triggerFetch(req);
    expect(await res.text()).toBe('fresh-bytes');
  });

  it('falha de rede sem cache devolve /placeholder.svg', async () => {
    const h = createSwHarness();
    const precache = await h.cacheStorage.open(CACHE_NAME);
    await precache.put('/placeholder.svg', new Response('<svg/>', { status: 200 }));
    h.setFetchImpl(() => Promise.reject(new TypeError('offline')));

    const res = await h.triggerFetch(makeRequest(ORIGIN + '/img/nao-existe.png'));
    expect(await res.text()).toBe('<svg/>');
  });
});

describe('sw.js — Google Fonts (Stale-While-Revalidate)', () => {
  it('serve do cache imediatamente quando presente', async () => {
    const h = createSwHarness();
    const req = makeRequest('https://fonts.gstatic.com/s/font.woff2');
    const cache = await h.cacheStorage.open('fonts-cache-v19');
    await cache.put(req.url, new Response('font-bytes', { status: 200 }));
    h.setFetchImpl(() => Promise.reject(new Error('não deveria bloquear no cache hit')));

    const res = await h.triggerFetch(req);
    expect(await res.text()).toBe('font-bytes');
  });

  it('sem cache, aguarda a rede', async () => {
    const h = createSwHarness();
    h.setFetchImpl(() => Promise.resolve(new Response('font-bytes-fresh', { status: 200 })));
    const res = await h.triggerFetch(makeRequest('https://fonts.googleapis.com/css?family=Inter'));
    expect(await res.text()).toBe('font-bytes-fresh');
  });
});

describe('sw.js — shouldSkipCache: exclusões de segurança/dados dinâmicos', () => {
  it('requests para *.supabase.co nunca são interceptadas (sem respondWith)', async () => {
    const h = createSwHarness();
    await expect(
      h.triggerFetch(makeRequest('https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/products')),
    ).rejects.toThrow(/nenhum handler.*respondwith/i);
  });

  it('requests com header Authorization nunca são interceptadas', async () => {
    const h = createSwHarness();
    await expect(
      h.triggerFetch(makeRequest(ORIGIN + '/api/whoami', { headers: { Authorization: 'Bearer x' } })),
    ).rejects.toThrow(/nenhum handler.*respondwith/i);
  });

  it('métodos não-GET nunca são interceptados', async () => {
    const h = createSwHarness();
    await expect(
      h.triggerFetch(makeRequest(ORIGIN + '/api/orcamentos', { method: 'POST' })),
    ).rejects.toThrow(/nenhum handler.*respondwith/i);
  });
});

describe('sw.js — push / notificationclick', () => {
  it('push com payload JSON mostra notificação com título/corpo do payload', async () => {
    const h = createSwHarness();
    await h.triggerPush({ title: 'Novo pedido', body: 'Você tem um orçamento pendente' });
    expect(h.notifications).toEqual([
      { title: 'Novo pedido', options: expect.objectContaining({ body: 'Você tem um orçamento pendente' }) },
    ]);
  });

  it('push sem payload usa o fallback padrão', async () => {
    const h = createSwHarness();
    await h.triggerPush(undefined);
    expect(h.notifications[0].title).toBe('Promo Gifts');
  });

  it('notificationclick abre a janela raiz', async () => {
    const h = createSwHarness();
    await h.triggerNotificationClick();
    expect(h.openedWindows).toEqual(['/']);
  });
});
