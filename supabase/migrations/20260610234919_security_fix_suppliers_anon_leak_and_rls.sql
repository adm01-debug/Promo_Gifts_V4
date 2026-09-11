
-- ============================================================
-- SECURITY FIX (2026-06-10) — aplicado via execute_sql, registrado aqui
-- ============================================================
-- VULN 1 (CRÍTICA): anon tinha SELECT table-level em public.suppliers
--   + policy suppliers_anon_read (active=true) → vazava api_credentials
--   (token XBZ, api_key Asia Import, password Só Marcas) para qualquer
--   visitante via anon key pública no bundle JS.
-- FIX: REVOKE SELECT table-level; GRANT SELECT só nas 10 colunas seguras
--   (as mesmas expostas por v_suppliers_public security_invoker).
--   Também revogado INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES do anon.
--
-- VULN 2 (ALTA): 11 tabelas internas com RLS OFF + grant anon de escrita
--   (xbz_upload_mapping, asia_upload_mapping, spot_typecode_map,
--    supplier_sub_brands, pipeline_known_issues, asia_legacy_upload_queue,
--    e 5 partições supplier_products_raw_history_p2026_06..10).
--   anon podia INSERT/UPDATE/DELETE via PostgREST.
-- FIX: ENABLE ROW LEVEL SECURITY (sem policy = nega anon; service_role
--   do pipeline bypassa RLS e continua funcionando — validado em dry-run).
--
-- Todos os passos validados com BEGIN…ROLLBACK antes do apply real.
-- DDL idempotente abaixo para registro/reaplicação.
-- ============================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES, SELECT ON public.suppliers FROM anon;
GRANT SELECT (id, name, code, trading_name, logo_url, website, active, is_product_supplier, is_engraving_supplier, state_uf)
  ON public.suppliers TO anon;

ALTER TABLE public.asia_legacy_upload_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asia_upload_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_known_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_typecode_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products_raw_history_p2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products_raw_history_p2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products_raw_history_p2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products_raw_history_p2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products_raw_history_p2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_sub_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xbz_upload_mapping ENABLE ROW LEVEL SECURITY;
;
