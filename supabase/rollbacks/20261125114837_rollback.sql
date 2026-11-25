-- Rollback: 20261125114837_revoke_anon_internal_grants_public.sql
-- Devolve o SELECT de anon nas 13 tabelas (estado anterior, herdado do legado).
--
-- Efeito colateral esperado e correto: o tripwire `fn_verify_anon_catalog_grants()` v4 mantem as 13 na
-- lista "NAO podem ter anon SELECT", entao apos o rollback a auditoria agendada passa a acusar
-- 'VAZAMENTO: anon SELECT em tabela sensivel' para cada uma. E o sinal desejado ? o rollback da etapa
-- 008 volta atras de proposito e tem que ficar visivel, nao silencioso. Nao "conserte" o tripwire para
-- calar esse achado; reverta o rollback.
--
-- Nenhuma policy de RLS e criada por este rollback: o estado anterior tambem nao tinha policy de SELECT
-- para anon, e o grant sozinho continua entregando 0 linha.

DO $rollback$
DECLARE
  v_tables text[] := ARRAY[
    'collections', 'collection_products', 'content_articles', 'favorite_item_reactions',
    'favorite_items', 'favorite_lists', 'product_ai_content', 'product_fiscal', 'product_seo',
    'product_supply', 'system_kill_switches', 'system_settings', 'video_sim_results'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_name) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', v_name);
      RAISE NOTICE 'anon SELECT devolvido em public.%', v_name;
    ELSE
      RAISE NOTICE 'public.% nao existe mais ? pulando', v_name;
    END IF;
  END LOOP;
END
$rollback$;
