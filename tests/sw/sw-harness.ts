/**
 * Harness de simulação para public/sw.js.
 *
 * O service worker é um script raw (sem import/export, roda em worker
 * context com `self`/`caches`/`fetch` globais) — não dá pra importar
 * direto num teste Vitest normal. Este harness carrega o arquivo via
 * `vm.createContext` com mocks de Cache Storage, `fetch`, `clients` e
 * `registration`, e expõe helpers para disparar os event listeners
 * (`install`, `activate`, `fetch`, `push`, `notificationclick`) que o
 * script registra em `self.addEventListener`.
 *
 * Não reimplementa a Cache API real — MockCache é um Map em memória,
 * suficiente para verificar o CONTRATO do sw.js (o que ele lê/escreve/
 * decide), não o comportamento do browser em si.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const ORIGIN = 'https://www.promogifts.com.br';

function normalize(urlOrRequest: string | { url: string }): string {
  const raw = typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url;
  return new URL(raw, ORIGIN).toString();
}

export class MockCache {
  store = new Map<string, Response>();

  async match(request: string | { url: string }): Promise<Response | undefined> {
    const res = this.store.get(normalize(request));
    return res ? res.clone() : undefined;
  }

  async put(request: string | { url: string }, response: Response): Promise<void> {
    this.store.set(normalize(request), response);
  }

  async delete(request: string | { url: string }): Promise<boolean> {
    return this.store.delete(normalize(request));
  }

  async keys(): Promise<{ url: string }[]> {
    return [...this.store.keys()].map((url) => ({ url }));
  }

  async add(url: string): Promise<void> {
    this.store.set(normalize(url), new Response('', { status: 200, headers: { date: new Date().toUTCString() } }));
  }

  async addAll(urls: string[]): Promise<void> {
    for (const u of urls) await this.add(u);
  }
}

export class MockCacheStorage {
  named = new Map<string, MockCache>();

  async open(name: string): Promise<MockCache> {
    if (!this.named.has(name)) this.named.set(name, new MockCache());
    return this.named.get(name)!;
  }

  async keys(): Promise<string[]> {
    return [...this.named.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.named.delete(name);
  }

  // Real Cache Storage searches every named cache; suficiente pros nossos testes
  // (cada teste sabe em qual cache o dado foi colocado).
  async match(request: string | { url: string }): Promise<Response | undefined> {
    for (const cache of this.named.values()) {
      const res = await cache.match(request);
      if (res) return res;
    }
    return undefined;
  }
}

export interface FakeRequest {
  url: string;
  method: string;
  mode?: string;
  headers: Headers;
}

export function urlOf(input: FakeRequest | string): string {
  return typeof input === 'string' ? input : input.url;
}

export function makeRequest(
  url: string,
  opts: { method?: string; mode?: string; headers?: Record<string, string> } = {},
): FakeRequest {
  return {
    url: new URL(url, ORIGIN).toString(),
    method: opts.method ?? 'GET',
    mode: opts.mode,
    headers: new Headers(opts.headers ?? {}),
  };
}

interface FetchEventLike {
  request: FakeRequest;
  respondWith(p: Promise<Response> | Response): void;
  waitUntil(p: Promise<unknown>): void;
}

// sw.js chama `fetch` de duas formas: `fetch(request)` (objeto, na maioria
// das seções) e `fetch(url, init)` (string + RequestInit, só na navegação —
// ver indexRequestFor). O mock precisa aceitar as duas.
export type FetchImpl = (input: FakeRequest | string, init?: RequestInit) => Promise<Response>;

export function createSwHarness(sharedCacheStorage?: MockCacheStorage) {
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  // Passar `sharedCacheStorage` simula "o worker foi reciclado pelo browser,
  // mas o Cache Storage em disco sobrevive" — cria um 2º harness (nova
  // instância de vm context, novos listeners) reaproveitando o MESMO
  // MockCacheStorage do primeiro. Ver BUG-SW-24.
  const cacheStorage = sharedCacheStorage ?? new MockCacheStorage();

  let fetchImpl: FetchImpl = () => Promise.reject(new TypeError('fetch não mockado neste teste'));
  const setFetchImpl = (fn: FetchImpl) => {
    fetchImpl = fn;
  };

  const clientsCalls: { type: 'matchAll' | 'openWindow'; args: unknown[] }[] = [];
  const postedMessages: { client: unknown; message: unknown }[] = [];
  let mockClients: { postMessage(msg: unknown): void }[] = [];
  const setMockClients = (clients: { postMessage(msg: unknown): void }[]) => {
    mockClients = clients;
  };

  const notifications: { title: string; options: unknown }[] = [];
  const openedWindows: string[] = [];

  const selfObj = {
    addEventListener(type: string, handler: (event: unknown) => void) {
      (listeners[type] ??= []).push(handler);
    },
    skipWaiting: () => Promise.resolve(),
    clients: {
      claim: () => Promise.resolve(),
      matchAll: (...args: unknown[]) => {
        clientsCalls.push({ type: 'matchAll', args });
        return Promise.resolve(mockClients);
      },
      openWindow: (...args: unknown[]) => {
        clientsCalls.push({ type: 'openWindow', args });
        openedWindows.push(String(args[0]));
        return Promise.resolve(null);
      },
    },
    registration: {
      showNotification: (title: string, options: unknown) => {
        notifications.push({ title, options });
        return Promise.resolve();
      },
    },
    location: { origin: ORIGIN },
  };

  const sandbox: Record<string, unknown> = {
    self: selfObj,
    caches: cacheStorage,
    fetch: (input: FakeRequest | string, init?: RequestInit) => fetchImpl(input, init),
    Response,
    Headers,
    URL,
    Promise,
    setTimeout,
    console,
    Date,
    clients: selfObj.clients,
  };

  const context = vm.createContext(sandbox);
  const code = readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf-8');
  new vm.Script(code, { filename: 'public/sw.js' }).runInContext(context);

  async function trigger(type: string, event: FetchEventLike | Record<string, unknown>) {
    const handlers = listeners[type] ?? [];
    for (const h of handlers) h(event);
  }

  async function triggerFetch(request: FakeRequest): Promise<Response> {
    let responded: Promise<Response> | Response | undefined;
    const event: FetchEventLike = {
      request,
      respondWith(p) {
        responded = p;
      },
      waitUntil() {},
    };
    await trigger('fetch', event);
    if (!responded) {
      throw new Error(`Nenhum handler de fetch chamou respondWith() para ${request.url}`);
    }
    return responded;
  }

  async function triggerInstall(): Promise<void> {
    let waited: Promise<unknown> | undefined;
    await trigger('install', { waitUntil: (p: Promise<unknown>) => { waited = p; } });
    await waited;
  }

  async function triggerActivate(): Promise<void> {
    let waited: Promise<unknown> | undefined;
    await trigger('activate', { waitUntil: (p: Promise<unknown>) => { waited = p; } });
    await waited;
  }

  async function triggerPush(data: unknown): Promise<void> {
    let waited: Promise<unknown> | undefined;
    await trigger('push', {
      data: data === undefined ? undefined : { json: () => data },
      waitUntil: (p: Promise<unknown>) => { waited = p; },
    });
    await waited;
  }

  async function triggerNotificationClick(): Promise<void> {
    let waited: Promise<unknown> | undefined;
    let closed = false;
    await trigger('notificationclick', {
      notification: { close: () => { closed = true; } },
      waitUntil: (p: Promise<unknown>) => { waited = p; },
    });
    await waited;
    return closed as unknown as void;
  }

  return {
    cacheStorage,
    setFetchImpl,
    setMockClients,
    clientsCalls,
    postedMessages,
    notifications,
    openedWindows,
    triggerFetch,
    triggerInstall,
    triggerActivate,
    triggerPush,
    triggerNotificationClick,
  };
}
