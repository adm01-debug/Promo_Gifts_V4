import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

import { gotoAndSettle, settleAfterAction, waitForRouteIdle } from '../../e2e/helpers/nav';

type WaitForFunctionCall = [pageFunction: unknown, arg: unknown, options: unknown];

function createPageDouble() {
  const waitForFunctionCalls: WaitForFunctionCall[] = [];
  const page = {
    addStyleTag: vi.fn().mockResolvedValue(undefined),
    goto: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForFunction: vi.fn((...args: WaitForFunctionCall) => {
      waitForFunctionCalls.push(args);
      return Promise.reject(new Error('timeout sintético'));
    }),
  } as unknown as Page;

  return { page, waitForFunctionCalls };
}

describe('helpers E2E de navegação', () => {
  it('encaminha os limites de gotoAndSettle como options do Playwright', async () => {
    const { page, waitForFunctionCalls } = createPageDouble();

    await gotoAndSettle(page, '/novidades');

    expect(waitForFunctionCalls).toHaveLength(3);
    expect(waitForFunctionCalls.map(([, arg]) => arg)).toEqual([undefined, undefined, undefined]);
    expect(waitForFunctionCalls.map(([, , options]) => options)).toEqual([
      { timeout: 10_000 },
      { timeout: 20_000 },
      { timeout: 3_000 },
    ]);
  });

  it('encaminha o timeout customizado de waitForRouteIdle', async () => {
    const { page, waitForFunctionCalls } = createPageDouble();

    await waitForRouteIdle(page, { timeout: 7_000 });

    expect(waitForFunctionCalls).toHaveLength(2);
    expect(waitForFunctionCalls.map(([, arg]) => arg)).toEqual([undefined, undefined]);
    expect(waitForFunctionCalls.map(([, , options]) => options)).toEqual([
      { timeout: 7_000 },
      { timeout: 3_000 },
    ]);
  });

  it('encaminha o timeout customizado de settleAfterAction', async () => {
    const { page, waitForFunctionCalls } = createPageDouble();

    await settleAfterAction(page, { timeout: 2_500 });

    expect(waitForFunctionCalls).toHaveLength(1);
    expect(waitForFunctionCalls[0]?.[1]).toBeUndefined();
    expect(waitForFunctionCalls[0]?.[2]).toEqual({ timeout: 2_500 });
  });
});
