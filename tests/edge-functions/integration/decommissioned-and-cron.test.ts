/**
 * Preserva os contratos da PR #3203 executando os handlers reais.
 * Apenas fronteiras Deno, autorização, logs e cliente de banco são isoladas;
 * nenhuma resposta HTTP é fornecida pelo mock de fetch e não há rede/DDL.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type EdgeHandler = (request: Request) => Response | Promise<Response>;

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  authorizeCron: vi.fn(),
  createClient: vi.fn(),
  queryFrom: vi.fn(),
  querySelect: vi.fn(),
  queryIs: vi.fn(),
  queryLimit: vi.fn(),
  network: vi.fn(() => {
    throw new Error('Network is forbidden in handler contract tests');
  }),
}));

const registered: EdgeHandler[] = [];
let mcpQuery: EdgeHandler;
let migrateHelper: EdgeHandler;
let imageUploader: EdgeHandler;

beforeAll(() => {
  const deno = {
    serve: (handler: EdgeHandler) => {
      registered.push(handler);
    },
    env: {
      get: (name: string) =>
        name === 'SUPABASE_URL' ? 'https://contract.invalid' : 'contract-only',
    },
  };
  // Node não resolve imports Deno jsr:/npm:. Compila e avalia cada módulo
  // real sem reescrever sua lógica, isolando apenas as dependências externas.
  const dependencies: Record<string, object> = {
    'jsr:@supabase/supabase-js@2': { createClient: mocks.createClient },
    '../_shared/authorize.ts': { authorize: mocks.authorize },
    '../_shared/dispatcher-auth.ts': { authorizeCron: mocks.authorizeCron },
    '../_shared/cors.ts': {
      buildPublicCorsHeaders: () => ({ 'Access-Control-Allow-Origin': '*' }),
    },
    '../_shared/request-id.ts': { getOrCreateRequestId: () => 'contract-request-id' },
    '../_shared/structured-logger.ts': {
      createStructuredLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        respond: (response: Response) => response,
      }),
    },
  };
  for (const name of ['mcp-query', 'migrate-helper', 'xbz-image-uploader']) {
    const sourcePath = resolve(`supabase/functions/${name}/index.ts`);
    const compiled = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: sourcePath,
    });
    runInNewContext(
      compiled.outputText,
      {
        exports: {},
        Deno: deno,
        Request,
        Response,
        Headers,
        fetch: mocks.network,
        require: (specifier: string) => {
          if (!(specifier in dependencies)) throw new Error(`Unexpected dependency: ${specifier}`);
          return dependencies[specifier];
        },
      },
      { filename: sourcePath, timeout: 1000 },
    );
  }
  expect(registered).toHaveLength(3);
  [mcpQuery, migrateHelper, imageUploader] = registered;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.network);
  mocks.authorize.mockResolvedValue({ ok: true, userId: 'contract-dev' });
  mocks.authorizeCron.mockResolvedValue({ ok: true });
  mocks.queryLimit.mockResolvedValue({ data: [], error: null });
  mocks.queryIs.mockReturnValue({ limit: mocks.queryLimit });
  mocks.querySelect.mockReturnValue({ is: mocks.queryIs });
  mocks.queryFrom.mockReturnValue({ select: mocks.querySelect });
  mocks.createClient.mockReturnValue({ from: mocks.queryFrom });
});

afterAll(() => vi.unstubAllGlobals());

function request(method: string) {
  return new Request('https://contract.invalid/functions/v1/handler', {
    method,
    ...(method === 'POST' ? { body: JSON.stringify({ query: 'SELECT 1' }) } : {}),
  });
}

describe('mcp-query real tombstone', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
    '%s retorna 410 sem consultar banco',
    async (method) => {
      const response = await mcpQuery(request(method));
      expect(response.status).toBe(410);
      expect(await response.json()).toMatchObject({ error: 'decommissioned' });
      expect(mocks.createClient).not.toHaveBeenCalled();
      expect(mocks.network).not.toHaveBeenCalled();
    },
  );
});

describe('migrate-helper real handler', () => {
  it('mantém desativação mesmo para dev autorizado', async () => {
    const response = await migrateHelper(request('POST'));
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(Request), { requireRole: 'dev' });
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ error: 'migration_helper_disabled' });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('preserva a resposta da autorização negada', async () => {
    mocks.authorize.mockResolvedValue({
      ok: false,
      response: new Response('Forbidden', { status: 403 }),
    });
    const response = await migrateHelper(request('POST'));
    expect(response.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('OPTIONS não exige autorização nem executa migração', async () => {
    const response = await migrateHelper(request('OPTIONS'));
    expect(response.status).toBe(200);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe('xbz-image-uploader real cron handler', () => {
  it.each(['GET', 'PUT', 'DELETE', 'OPTIONS'])(
    '%s é rejeitado antes de autenticação e banco',
    async (method) => {
      const response = await imageUploader(request(method));
      expect(response.status).toBe(405);
      expect(await response.json()).toMatchObject({ error: 'method_not_allowed' });
      expect(mocks.authorizeCron).not.toHaveBeenCalled();
      expect(mocks.createClient).not.toHaveBeenCalled();
    },
  );
  it('POST sem credencial cron é rejeitado sem consultar banco', async () => {
    mocks.authorizeCron.mockResolvedValue({
      ok: false,
      response: new Response('Unauthorized', { status: 401 }),
    });
    const response = await imageUploader(request('POST'));
    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('POST autorizado conta os pendentes sem fingir processamento', async () => {
    mocks.queryLimit.mockResolvedValue({ data: [{ id: 'one' }, { id: 'two' }], error: null });
    const response = await imageUploader(request('POST'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      pending: 2,
      processed: 0,
      message: 'not_implemented',
    });
    expect(mocks.authorizeCron).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        secretEnvName: 'XBZ_IMAGE_UPLOADER_CRON_SECRET',
        headerName: 'x-cron-secret',
      }),
    );
    expect(mocks.queryFrom).toHaveBeenCalledWith('xbz_image_import_staging');
    expect(mocks.querySelect).toHaveBeenCalledWith('id, image_url');
    expect(mocks.queryIs).toHaveBeenCalledWith('cloudflare_id', null);
    expect(mocks.queryLimit).toHaveBeenCalledWith(20);
    expect(mocks.network).not.toHaveBeenCalled();
  });
  it('falha da consulta retorna 500 em vez de contagem falsa', async () => {
    mocks.queryLimit.mockResolvedValue({ data: null, error: { message: 'database unavailable' } });
    const response = await imageUploader(request('POST'));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: 'select_failed' });
  });
});

it('import visual-search do main e da PR3203 resolvem a mesma versão no mapa Deno canônico', () => {
  const config = JSON.parse(readFileSync(resolve('supabase/functions/deno.json'), 'utf8'));
  const oldSpecifier = ['npm:', '@supabase/supabase-js@2.49.4'].join('');
  const mainSpecifier = 'https://esm.sh/@supabase/supabase-js@2.49.4';
  expect(config.imports[mainSpecifier]).toBe(oldSpecifier);
  expect(config.imports[oldSpecifier] ?? oldSpecifier).toBe(oldSpecifier);
});
