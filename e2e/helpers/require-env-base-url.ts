/**
 * require-env-base-url.ts
 *
 * Incidente 2026-10-13: várias specs E2E que falam DIRETO com o banco (seed
 * de dados de teste, cleanup, polling de RLS, etc. — via `fetch`/supabase-js
 * no processo Node do Playwright, fora do `page.route()` de mock) liam
 * `process.env.VITE_SUPABASE_URL` com fallback silencioso para a URL de
 * PRODUÇÃO (`doufsxqlfjyuvxuezpln`). Sem a env var definida — o caso comum
 * em qualquer ambiente que não seja o dev-box original —, o teste seguia
 * rodando e escrevendo/lendo dados reais em produção sem avisar ninguém.
 *
 * Isto é DIFERENTE de specs que usam a ref de produção só para configurar
 * `page.route()` (interceptação/mock de rede — nunca sai da máquina) ou só
 * em comentários — esses casos são seguros e não usam este helper.
 *
 * Uso: troque
 *   const url = process.env.VITE_SUPABASE_URL || "https://<ref-de-producao>.supabase.co";
 * por
 *   const url = requireE2EBaseUrl();
 * (ou `requireE2EBaseUrl('VITE_SUPABASE_URL')` para outra env var específica).
 *
 * Sem staging real configurado ainda (ver PLANO_ENGENHARIA incidente
 * 2026-10-13, Fase 1), isto faz o teste FALHAR alto e claro em vez de
 * silenciosamente martelar produção — comportamento seguro por padrão.
 * Quando um projeto de staging existir, basta exportar
 * VITE_SUPABASE_URL=https://<staging-ref>.supabase.co (ou configurar em
 * `.env.e2e`, copiado de `.env.e2e.example`) antes de rodar a suíte.
 */
export function requireE2EBaseUrl(envVar = 'VITE_SUPABASE_URL'): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `[e2e] ${envVar} não definida. Este spec fala direto com o banco e NUNCA deve ` +
        'cair em produção por padrão (incidente 2026-10-13 — tráfego de dev/teste batendo ' +
        `em produção). Defina ${envVar}=https://<staging-ou-preview>.supabase.co em .env.e2e ` +
        '(copie .env.e2e.example) antes de rodar esta suíte. Sem um projeto de staging real ' +
        'ainda provisionado, rode só com a variável setada explicitamente para o canônico, ' +
        'nunca por fallback implícito.',
    );
  }
  return value;
}

/**
 * Mesma política de "falhar alto, nunca cair em produção silenciosamente",
 * para a anon/publishable key. Aceita os dois nomes de env var suportados
 * pelo client (ver src/integrations/supabase/client.ts).
 */
export function requireE2EAnonKey(): string {
  const value =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(
      '[e2e] VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY não definida. ' +
        'Defina em .env.e2e (copie .env.e2e.example) antes de rodar esta suíte.',
    );
  }
  return value;
}
