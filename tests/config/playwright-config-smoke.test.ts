import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Playwright server isolation contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.E2E_BASE_URL;
    delete process.env.E2E_REUSE_EXISTING_SERVER;
    delete process.env.CI;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('starts a fresh default local Vite server', async () => {
    const config = (await import('../../playwright.config')).default;

    expect(config.use?.baseURL).toBe('http://localhost:8080');
    expect(config.webServer).toMatchObject({
      command: 'npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: false,
    });
  });

  it('starts Vite when E2E_BASE_URL points to localhost', async () => {
    process.env.E2E_BASE_URL = 'http://localhost:8080';
    const config = (await import('../../playwright.config')).default;

    expect(config.use?.baseURL).toBe('http://localhost:8080');
    expect(config.webServer).toMatchObject({
      url: 'http://localhost:8080',
      reuseExistingServer: false,
    });
  });

  it('reuses an existing local server in ephemeral CI', async () => {
    process.env.CI = 'true';
    process.env.E2E_BASE_URL = 'http://localhost:8080';
    const config = (await import('../../playwright.config')).default;

    expect(config.webServer).toMatchObject({ reuseExistingServer: true });
  });

  it('allows explicit local reuse outside CI', async () => {
    process.env.E2E_REUSE_EXISTING_SERVER = '1';
    const config = (await import('../../playwright.config')).default;

    expect(config.webServer).toMatchObject({ reuseExistingServer: true });
  });

  it('does not start a local server when a remote E2E_BASE_URL is provided', async () => {
    process.env.E2E_BASE_URL = 'https://preview.example.test';
    const config = (await import('../../playwright.config')).default;

    expect(config.use?.baseURL).toBe('https://preview.example.test');
    expect(config.webServer).toBeUndefined();
  });
});
