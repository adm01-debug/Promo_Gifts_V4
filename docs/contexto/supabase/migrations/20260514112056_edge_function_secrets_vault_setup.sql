-- ============================================================================
-- Edge Function Secrets Setup — Vault
-- ----------------------------------------------------------------------------
-- Provisiona dois secrets no Supabase Vault para hardening de autenticação
-- das edge functions `webhook-dispatcher` e `connections-auto-test`.
--
-- Auditoria: AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (Bloqueadores 3.1 e 3.2)
-- Branch: cleanup/edge-functions-auth-hardening
-- Data: 2026-05-14
--
-- O mesmo valor de secret precisa ser configurado em:
-- 1) Supabase Dashboard → Edge Functions → Secrets (Deno.env.get)
-- 2) Aqui, no vault.secrets (para chamadores SQL: cron, triggers, RPCs)
-- ============================================================================

DO $$
BEGIN
  -- WEBHOOK_DISPATCHER_SECRET
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'WEBHOOK_DISPATCHER_SECRET') THEN
    PERFORM vault.create_secret(
      '4aszZ/Nh0cInRX0RVTkt+YGqA8BObghWsoAjEOGB7g8=',
      'WEBHOOK_DISPATCHER_SECRET',
      'Secret para autenticar chamadas ao webhook-dispatcher edge function (Modo A). Sincronizar com painel Supabase Edge Functions Secrets.'
    );
  ELSE
    PERFORM vault.update_secret(
      (SELECT id FROM vault.secrets WHERE name = 'WEBHOOK_DISPATCHER_SECRET'),
      '4aszZ/Nh0cInRX0RVTkt+YGqA8BObghWsoAjEOGB7g8='
    );
  END IF;

  -- CONNECTIONS_AUTO_TEST_SECRET
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'CONNECTIONS_AUTO_TEST_SECRET') THEN
    PERFORM vault.create_secret(
      'j/nKCXCqyvYgucMAX1wuHJO6QhEDPVaWLWoIsqlfp+o=',
      'CONNECTIONS_AUTO_TEST_SECRET',
      'Secret para autenticar chamadas ao connections-auto-test edge function (cron job). Sincronizar com painel Supabase Edge Functions Secrets.'
    );
  ELSE
    PERFORM vault.update_secret(
      (SELECT id FROM vault.secrets WHERE name = 'CONNECTIONS_AUTO_TEST_SECRET'),
      'j/nKCXCqyvYgucMAX1wuHJO6QhEDPVaWLWoIsqlfp+o='
    );
  END IF;
END $$;

-- Sanity check
DO $$
DECLARE
  webhook_count int;
  conn_count int;
BEGIN
  SELECT count(*) INTO webhook_count FROM vault.secrets WHERE name = 'WEBHOOK_DISPATCHER_SECRET';
  SELECT count(*) INTO conn_count FROM vault.secrets WHERE name = 'CONNECTIONS_AUTO_TEST_SECRET';
  IF webhook_count != 1 OR conn_count != 1 THEN
    RAISE EXCEPTION 'Secrets nao foram provisionados corretamente: webhook=%, conn=%', webhook_count, conn_count;
  END IF;
END $$;
