CREATE OR REPLACE FUNCTION public.fn_xbz_batch_to_silver(p_batch_size integer DEFAULT 500)
 RETURNS TABLE(processed integer, errors integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- DEPRECADA 2026-06 — ver fn_xbz_to_silver para documentação completa.
  -- Chamava fn_xbz_to_silver em loop; ambas operam sobre silver_products (DROPADA).
  -- Pipeline canônico XBZ:
  --   • API  → fn_standardize_supplier('d6718a29-...', batch_size)
  --   • SITE → fn_xbz_site_tick() — orquestrador completo (cron */2 min)
  RAISE WARNING '[fn_xbz_batch_to_silver] DEPRECADA 2026-06 — use fn_standardize_supplier(XBZ_ID, %) (API) ou fn_xbz_site_tick() (site).', p_batch_size;
  RETURN QUERY SELECT 0::int AS processed, 0::int AS errors;
END $function$
