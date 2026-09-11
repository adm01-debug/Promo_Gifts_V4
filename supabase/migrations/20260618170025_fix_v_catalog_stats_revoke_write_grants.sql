
-- ================================================================
-- HYGIENE FIX: C3 — Revogar grants de escrita desnecessários em v_catalog_stats
-- ================================================================
-- Contexto: v_catalog_stats é uma aggregate view (GROUP-less COUNT — nunca updatable).
-- Supabase herdou INSERT/UPDATE/DELETE/REFERENCES/TRIGGER via ALTER DEFAULT PRIVILEGES.
-- Esses grants são dead-code perigoso (não funcionam, pois is_insertable_into='NO'),
-- mas causam HTTP 500 ao invés de 403/405 em tentativas de escrita — comportamento confuso.
-- Fix: manter apenas SELECT (necessário para o frontend) e revogar o resto.
REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
  ON public.v_catalog_stats
  FROM anon, authenticated;

-- Confirmar resultado esperado:
-- anon: SELECT only | authenticated: SELECT only
;
