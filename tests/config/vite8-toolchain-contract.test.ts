import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');

describe('Vite 8 toolchain contract', () => {
  it('uses the Rolldown dependency optimizer instead of the deprecated esbuild adapter', () => {
    expect(viteConfig).toContain('optimizeDeps:');
    expect(viteConfig).toContain('rolldownOptions:');
    expect(viteConfig).not.toContain('esbuildOptions:');
  });

  it('uses the official React plugin instead of the legacy SWC integration', () => {
    expect(viteConfig).toContain("from '@vitejs/plugin-react'");
    expect(packageJson).toContain('"@vitejs/plugin-react"');
    expect(packageJson).not.toContain('"@vitejs/plugin-react-swc"');
  });
});
