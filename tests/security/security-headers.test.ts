/**
 * Security Headers Validation
 * Verifies that vercel.json configures all required security headers
 * per OWASP best practices.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'fs';
import path from 'path';

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelHeaderBlock {
  source: string;
  headers: VercelHeader[];
}

interface VercelConfig {
  headers?: VercelHeaderBlock[];
}

let allHeaders: VercelHeader[] = [];

beforeAll(() => {
  const vercelPath = path.resolve(__dirname, '../../vercel.json');
  const config: VercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  const blocks = config.headers || [];
  for (const block of blocks) {
    allHeaders.push(...(block.headers || []));
  }
});

function findHeader(name: string): string | undefined {
  const h = allHeaders.find((h) => h.key.toLowerCase() === name.toLowerCase());
  return h?.value;
}

describe('Security Headers: HSTS', () => {
  it('Strict-Transport-Security is configured', () => {
    const val = findHeader('Strict-Transport-Security');
    expect(val).toBeDefined();
  });

  it('HSTS max-age is at least 1 year (31536000)', () => {
    const val = findHeader('Strict-Transport-Security')!;
    const maxAge = parseInt(val.match(/max-age=(\d+)/)?.[1] || '0', 10);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it('HSTS includes includeSubDomains', () => {
    const val = findHeader('Strict-Transport-Security')!;
    expect(val).toContain('includeSubDomains');
  });

  it('HSTS includes preload', () => {
    const val = findHeader('Strict-Transport-Security')!;
    expect(val).toContain('preload');
  });
});

describe('Security Headers: X-Frame-Options', () => {
  it('is set to DENY', () => {
    const val = findHeader('X-Frame-Options');
    expect(val).toBe('DENY');
  });
});

describe('Security Headers: X-Content-Type-Options', () => {
  it('is set to nosniff', () => {
    const val = findHeader('X-Content-Type-Options');
    expect(val).toBe('nosniff');
  });
});

describe('Security Headers: Referrer-Policy', () => {
  it('is configured with a strict policy', () => {
    const val = findHeader('Referrer-Policy');
    expect(val).toBeDefined();
    const safeValues = [
      'no-referrer',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
    ];
    expect(safeValues).toContain(val);
  });
});

describe('Security Headers: Permissions-Policy', () => {
  it('is configured', () => {
    const val = findHeader('Permissions-Policy');
    expect(val).toBeDefined();
  });

  it('restricts camera', () => {
    const val = findHeader('Permissions-Policy')!;
    expect(val).toMatch(/camera=\(\)/);
  });

  it('restricts geolocation', () => {
    const val = findHeader('Permissions-Policy')!;
    expect(val).toMatch(/geolocation=\(\)/);
  });

  it('restricts payment', () => {
    const val = findHeader('Permissions-Policy')!;
    expect(val).toMatch(/payment=\(\)/);
  });
});

describe('Security Headers: Content-Security-Policy', () => {
  let csp = '';

  beforeAll(() => {
    csp = findHeader('Content-Security-Policy') || '';
  });

  it('CSP header exists', () => {
    expect(csp.length).toBeGreaterThan(0);
  });

  it('has default-src directive', () => {
    expect(csp).toContain("default-src 'self'");
  });

  it('has an explicit script-src directive', () => {
    expect(csp).toMatch(/script-src\s/);
  });

  it('does not allow unsafe-eval in script-src', () => {
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)![1];
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('does not allow unsafe-inline in style-src', () => {
    const styleSrc = csp.match(/style-src\s+([^;]+)/)?.[1] || '';
    expect(styleSrc).not.toContain("'unsafe-inline'");
  });

  it('allows React inline style attributes without allowing inline style blocks', () => {
    const styleSrc = csp.match(/style-src\s+([^;]+)/)?.[1] || '';
    const styleSrcAttr = csp.match(/style-src-attr\s+([^;]+)/)?.[1] || '';

    expect(styleSrc).not.toContain("'unsafe-inline'");
    expect(styleSrcAttr.trim()).toBe("'unsafe-inline'");
  });

  it('allows only the deterministic Sonner style element hashes', () => {
    const styleSrc = csp.match(/style-src\s+([^;]+)/)?.[1] || '';
    const sonnerBundle = fs.readFileSync(
      path.resolve(__dirname, '../../node_modules/sonner/dist/index.mjs'),
      'utf8',
    );
    const cssStart = sonnerBundle.indexOf('`:where(html[dir="ltr"])') + 1;
    const cssEnd = sonnerBundle.indexOf('`);', cssStart);

    expect(cssStart).toBeGreaterThan(0);
    expect(cssEnd).toBeGreaterThan(cssStart);

    const sonnerCss = sonnerBundle.slice(cssStart, cssEnd);
    const emptyStyleHash = createHash('sha256').update('').digest('base64');
    const sonnerStyleHash = createHash('sha256').update(sonnerCss).digest('base64');

    expect(styleSrc).not.toContain("'unsafe-inline'");
    expect(styleSrc).toContain(`'sha256-${emptyStyleHash}'`);
    expect(styleSrc).toContain(`'sha256-${sonnerStyleHash}'`);
  });

  it('does not allow unsafe-inline in script-src', () => {
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)![1];
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('does not allow data: or blob: in script-src (XSS vectors)', () => {
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)![1];
    expect(scriptSrc).not.toContain('data:');
    expect(scriptSrc).not.toContain('blob:');
  });

  it('does not allow data: in worker-src', () => {
    const workerSrc = csp.match(/worker-src\s+([^;]+)/)?.[1];
    expect(workerSrc).toBeDefined();
    expect(workerSrc).not.toContain('data:');
  });

  it('restricts object-src to none', () => {
    expect(csp).toContain("object-src 'none'");
  });

  it('has frame-ancestors none (anti-clickjacking)', () => {
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('restricts base-uri to self', () => {
    expect(csp).toContain("base-uri 'self'");
  });

  it('restricts form-action to self', () => {
    expect(csp).toContain("form-action 'self'");
  });

  it('enables upgrade-insecure-requests', () => {
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('has report-uri or report-to configured', () => {
    const hasReport = csp.includes('report-uri') || csp.includes('report-to');
    expect(hasReport).toBe(true);
  });

  it('contains a syntactically valid hash for the critical boot recovery script', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    const bootScript = html.match(/<script>([\s\S]*?var PARAM = '__bare'[\s\S]*?)<\/script>/)?.[1];

    expect(bootScript).toBeDefined();
    const hash = createHash('sha256').update(bootScript!).digest('base64');
    const configuredHashes = [...csp.matchAll(/'sha256-([^']+)'/g)].map((match) => match[1]);

    expect(configuredHashes.every((value) => value.length === 44)).toBe(true);
    expect(configuredHashes).toContain(hash);
  });
});

describe('Security Headers: public/_headers mirror', () => {
  it('CSP in public/_headers is identical to vercel.json', () => {
    const headersPath = path.resolve(__dirname, '../../public/_headers');
    const raw = fs.readFileSync(headersPath, 'utf-8');
    const line = raw.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
    expect(line).toBeDefined();
    const mirrorCsp = line!.trim().replace(/^Content-Security-Policy:\s*/, '');
    expect(mirrorCsp).toBe(findHeader('Content-Security-Policy'));
  });
});
