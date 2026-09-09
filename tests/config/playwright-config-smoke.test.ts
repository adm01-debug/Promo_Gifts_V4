import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Playwright server isolation contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.E2E_BASE_URL;
    delete process.env.E2E_REUSE_EXISTING_SERVER;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('starts a fresh local server and refuses implicit server reuse by default', async () => {
    const config = (await import('../../playwright.config')).default;

    expect(config.use?.baseURL).toBe('http://localhost:8080');
    expect(config.webServer).toMatchObject({
      command: 'npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: false,
    });
  });

  it('reuses a local server only after explicit opt-in', async () => {
    process.env.E2E_REUSE_EXISTING_SERVER = '1';
    const config = (await import('../../playwright.config')).default;

    expect(config.webServer).toMatchObject({ reuseExistingServer: true });
  });

  it('does not start a local server when E2E_BASE_URL is provided', async () => {
    process.env.E2E_BASE_URL = 'https://preview.example.test';
    const config = (await import('../../playwright.config')).default;

    expect(config.use?.baseURL).toBe('https://preview.example.test');
    expect(config.webServer).toBeUndefined();
  });
});
