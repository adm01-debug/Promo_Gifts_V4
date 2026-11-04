-- ============================================================================
-- FIX P1: 403 Forbidden em views wrapper public.* -> analytics.mv_*
--
-- CAUSA RAIZ: views em public foram convertidas para security_invoker=true.
-- Com invoker, o SELECT na matview subjacente e checado como o role chamador
-- (authenticated/anon), nao mais como o owner (postgres). As matviews em
-- analytics nunca receberam GRANT => permission denied => PostgREST 403.
--
-- PRINCIPIO DA CORRECAO: a view wrapper em public JA declara a intencao de
-- acesso. Espelhamos essa intencao exata na matview subjacente. Nada de
-- politica nova inventada aqui.
-- ============================================================================

-- Pre-requisito: USAGE no schema (ja existia, mantido idempotente)
GRANT USAGE ON SCHEMA analytics TO authenticated, anon, service_role;

-- --- authenticated: tem SELECT nas 5 views wrapper -> precisa nas 5 matviews
GRANT SELECT ON analytics.categories_tree_visual  TO authenticated;
GRANT SELECT ON analytics.mv_product_cards        TO authenticated;
GRANT SELECT ON analytics.mv_product_compositions TO authenticated;
GRANT SELECT ON analytics.mv_product_intelligence TO authenticated;
GRANT SELECT ON analytics.mv_stock_velocity       TO authenticated;

-- --- service_role: perdeu SELECT em 2 matviews (quebra edge functions / n8n / crons)
GRANT SELECT ON analytics.mv_product_intelligence TO service_role;
GRANT SELECT ON analytics.mv_stock_velocity       TO service_role;
GRANT SELECT ON analytics.categories_tree_visual  TO service_role;
GRANT SELECT ON analytics.mv_product_cards        TO service_role;
GRANT SELECT ON analytics.mv_product_compositions TO service_role;

-- --- anon: NAO recebe SELECT em stock_velocity/product_intelligence/product_cards.
-- Essas matviews contem supplier_id, supplier_branch_id, current_price,
-- price_changes_30d e sale_price = inteligencia competitiva.
-- A view wrapper ja nega anon (anon=m, sem r). Mantemos a negacao coerente.
-- anon so mantem mv_product_compositions (sem coluna sensivel, ja concedido).
REVOKE ALL ON analytics.mv_stock_velocity       FROM anon;
REVOKE ALL ON analytics.mv_product_intelligence FROM anon;
REVOKE ALL ON analytics.mv_product_cards        FROM anon;
REVOKE ALL ON analytics.categories_tree_visual  FROM anon;
GRANT SELECT ON analytics.mv_product_compositions TO anon;

-- --- HIGIENE: matview nao e atualizavel. INSERT/UPDATE/DELETE/TRIGGER/
-- REFERENCES concedidos a anon/authenticated sao lixo perigoso (achado P1).
-- Remove o write mantendo o read onde ele deve existir.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON analytics.mv_stock_velocity, analytics.mv_product_intelligence,
     analytics.mv_product_cards, analytics.mv_product_compositions,
     analytics.categories_tree_visual
  FROM anon, authenticated;

-- Mesma limpeza nas matviews que vivem direto em public
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.mv_supplier_reliability, public.mv_ema_kpi_by_level,
     public.mv_stock_rupture_alert, public.mv_product_images_audit
  FROM anon, authenticated;

-- Idem nas views wrapper de public (tinham anon=m / authenticated=rm)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.mv_stock_velocity, public.mv_product_intelligence,
     public.mv_product_cards, public.mv_product_compositions,
     public.categories_tree_visual
  FROM anon, authenticated;

-- --- Blindagem contra recorrencia: novas matviews em analytics ja nascem
-- legiveis por authenticated/service_role e mudas para anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  GRANT SELECT ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  REVOKE ALL ON TABLES FROM anon;

-- Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
