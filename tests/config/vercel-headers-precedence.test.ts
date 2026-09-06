/**
 * vercel.json — precedência de Cache-Control entre regras de headers.
 *
 * Achado da auditoria (2026-09): /sw.js e /icons/* batiam SIMULTANEAMENTE na
 * regra genérica de extensão (.js/.css/... → immutable, max-age=31536000) e
 * em regras específicas (/sw.js → no-store; /icons/(.*) → max-age=604800).
 * A regra correta vencia só por estar depois no array — dependência frágil
 * e não testada: se alguém reordenar o array (inclusive o Lovable, que edita
 * configs sem aviso — ver CLAUDE.md REGRA #7), /sw.js pode virar `immutable`
 * silenciosamente, impedindo a distribuição de atualizações do Service
 * Worker em produção.
 *
 * Fix: a regra genérica de extensão agora exclui /sw.js e /icons/* via
 * negative lookahead — as duas nunca mais colidem, independente de ordem.
 * Este teste simula o matching de path real (como o roteador da Vercel faz:
 * cada `source` é uma regex ancorada em `^...$`) para garantir que a
 * garantia se mantém mesmo que o arquivo seja reordenado no futuro.
 */
import { describe, it, expect, beforeAll } from 'vitest';
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

let blocks: VercelHeaderBlock[] = [];

beforeAll(() => {
  const vercelPath = path.resolve(__dirname, '../../vercel.json');
  const config: VercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  blocks = config.headers || [];
});

/**
 * Replica o matching de `source` da Vercel: cada source é uma regex
 * ancorada no início e no fim do pathname.
 */
function matchingBlocks(pathname: string): VercelHeaderBlock[] {
  return blocks.filter((b) => new RegExp(`^${b.source}$`).test(pathname));
}

/**
 * Cache-Control final para um path, replicando a regra real da Vercel:
 * quando múltiplas regras casam o mesmo path e definem a MESMA chave, a
 * regra que aparece DEPOIS no array vence (mesmo comportamento do
 * `headers()` do Next.js, que a Vercel espelha).
 */
function effectiveCacheControl(pathname: string): string | undefined {
  let value: string | undefined;
  for (const block of matchingBlocks(pathname)) {
    const cc = block.headers.find((h) => h.key === 'Cache-Control');
    if (cc) value = cc.value;
  }
  return value;
}

describe('vercel.json — precedência de Cache-Control (regressão BUG-SW-23/24 header collision)', () => {
  it('/sw.js NUNCA recebe immutable — precisa ser sempre revalidado para distribuir updates do SW', () => {
    const cc = effectiveCacheControl('/sw.js');
    expect(cc).toBeDefined();
    expect(cc).not.toMatch(/immutable/);
    expect(cc).toMatch(/no-store/);
  });

  it('/sw.js só bate na regra específica de extensão (a genérica está excluída)', () => {
    const matches = matchingBlocks('/sw.js');
    const genericExtRule = matches.find((b) => b.source.includes('woff2'));
    expect(genericExtRule).toBeUndefined();
  });

  it.each(['/icons/logo.svg', '/icons/app.png', '/icons/sub/dir/icon-192.png'])(
    '%s NUNCA recebe immutable — mantém max-age=604800 pretendido para ícones',
    (iconPath) => {
      const cc = effectiveCacheControl(iconPath);
      expect(cc).toBeDefined();
      expect(cc).not.toMatch(/immutable/);
      expect(cc).toMatch(/max-age=604800/);
    },
  );

  it.each(['/assets/index-abc123.js', '/assets/style-xyz789.css', '/assets/font.woff2'])(
    '%s (asset hashed fora de /icons) continua recebendo immutable normalmente',
    (assetPath) => {
      const cc = effectiveCacheControl(assetPath);
      expect(cc).toMatch(/immutable/);
      expect(cc).toMatch(/max-age=31536000/);
    },
  );

  it('/index.html e / continuam no-store (SPA shell nunca cacheado)', () => {
    expect(effectiveCacheControl('/')).toMatch(/no-store/);
    expect(effectiveCacheControl('/index.html')).toMatch(/no-store/);
  });

  it('rotas SPA sem extensão (catch-all) recebem no-store', () => {
    expect(effectiveCacheControl('/carrinhos')).toMatch(/no-store/);
    expect(effectiveCacheControl('/produtos/123')).toMatch(/no-store/);
  });

  it('/api e subpaths não são capturados pelo catch-all de no-store', () => {
    const matches = matchingBlocks('/api/webhook');
    const catchAll = matches.find((b) => b.source.startsWith('/((?!api'));
    expect(catchAll).toBeUndefined();
  });
});
