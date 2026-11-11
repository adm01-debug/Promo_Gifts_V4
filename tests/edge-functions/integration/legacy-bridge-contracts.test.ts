import { deepStrictEqual, ok } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createContext, Script } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

type Handler = (request: Request) => Response | Promise<Response>;
const functionRoot = resolve(process.cwd(), 'supabase/functions');
const bridgeRoot = resolve(functionRoot, 'external-db-bridge');

/** Runs real local modules; only the runtime/stdlib boundaries are substituted. */
function isolatedModules(options: { register?: (name: string, fn: () => void) => void; captureHandler?: (handler: Handler) => void; silentLogs?: unknown[][] } = {}) {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const capturedConsole = options.silentLogs ? {
    log: (...args: unknown[]) => options.silentLogs?.push(args),
    warn: (...args: unknown[]) => options.silentLogs?.push(args),
    error: (...args: unknown[]) => options.silentLogs?.push(args),
  } : console;
  const context = createContext({
    console: capturedConsole, Request, Response, Headers, URL, TextEncoder, TextDecoder,
    crypto: webcrypto, performance, setTimeout, clearTimeout,
    fetch: () => { throw new Error('Network is forbidden in this contract test'); },
    Deno: {
      env: { get: () => undefined },
      test: (name: string, fn: () => void) => {
        if (!options.register) throw new Error('Unexpected test registration');
        options.register(name, fn);
      },
      serve: (handler: Handler) => {
        if (!options.captureHandler) throw new Error('Pure helpers must not start the retired endpoint');
        options.captureHandler(handler);
      },
    },
  });
  const assertions = {
    assert: (condition: unknown, message?: string) => ok(condition, message ?? 'Historical assertion failed'),
    assertEquals: (actual: unknown, expected: unknown, message?: string) =>
      deepStrictEqual(structuredClone(actual), structuredClone(expected), message ?? 'Historical values differ'),
  };
  function load(filename: string): Record<string, unknown> {
    const file = resolve(filename);
    if (!file.startsWith(functionRoot + '/')) throw new Error(`Unexpected local import: ${file}`);
    const cached = cache.get(file);
    if (cached) return cached.exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = readFileSync(file, 'utf8');
    const { outputText, diagnostics } = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    if (diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error(`Cannot transpile ${file}`);
    const requireLocal = (specifier: string) => {
      if (specifier === 'https://deno.land/std@0.224.0/assert/mod.ts') return assertions;
      if (!specifier.startsWith('.')) throw new Error(`Unexpected external import: ${specifier}`);
      return load(resolve(dirname(file), specifier));
    };
    const factory = new Script(`(function(exports, require, module) {\n${outputText}\n})`, { filename: file }).runInContext(context);
    factory(module.exports, requireLocal, module);
    return module.exports;
  }
  return { load };
}

// These are the original test bodies, not a rewritten model of the helpers.
// VM Node is not Deno; the original Deno check/test entry points remain intact.
for (const filename of [
  'applyFiltersAndSwap.integration.test.ts',
  'callerSelectIsHeavy.test.ts',
  'resolveProductsSelect.test.ts',
  'wideSelectThreshold.test.ts',
]) {
  describe(`preserved historical bridge contract: ${filename}`, () => {
    const runtime = isolatedModules({ register: (name, fn) => it(name, fn) });
    runtime.load(resolve(bridgeRoot, filename));
  });
}

describe('retired bridge endpoint stays retired', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])('%s returns 410 without a client or external I/O', async method => {
    let handler: Handler | undefined;
    const logs: unknown[][] = [];
    const runtime = isolatedModules({ captureHandler: registered => { handler = registered; }, silentLogs: logs });
    runtime.load(resolve(bridgeRoot, 'index.ts'));
    expect(handler).toBeTypeOf('function');
    if (!handler) throw new Error('The real endpoint did not register');
    const response = await handler(new Request('https://edge-contract.invalid/external-db-bridge', {
      method,
      headers: { 'X-Request-Id': 'retired-bridge-contract', Origin: 'https://www.promogifts.com.br' },
    }));
    expect(response.status).toBe(410);
    expect(response.headers.get('X-Request-Id')).toBe('retired-bridge-contract');
    expect(await response.json()).toMatchObject({ error: 'endpoint_decommissioned' });
    expect(logs.some(args => args.some(value => String(value).includes('request_decommissioned')))).toBe(true);
  });
});
