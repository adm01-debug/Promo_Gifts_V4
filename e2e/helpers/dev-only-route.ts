/**
 * Rotas montadas só sob `import.meta.env.DEV` (ex.: /debug/images,
 * /promoflix-playground) não existem em build de produção. Contra o dev
 * server (padrão do playwright.config.ts) os specs rodam normalmente; contra
 * `vite preview` (E2E_SERVER_MODE=preview) ou uma URL externa a rota cai no
 * 404 e o grupo deve ser pulado.
 */
const externalBaseUrl = process.env.E2E_BASE_URL?.trim();
const isLocalBaseUrl =
  !externalBaseUrl || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(externalBaseUrl);

export const isProductionBuild = process.env.E2E_SERVER_MODE === 'preview' || !isLocalBaseUrl;

export function devOnlyRouteReason(routePath: string): string {
  return `${routePath} só é montada em dev (import.meta.env.DEV); o alvo é um build de produção.`;
}
