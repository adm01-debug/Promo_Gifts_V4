-- ============================================================================
-- MELHORIA 2 — DECISÃO ARQUITETURAL SOBRE DUAL-WRITE DE SATÉLITES (Gold)
-- Data: 2026-06-26 | Validado ao vivo contra projeto doufsxqlfjyuvxuezpln
-- ----------------------------------------------------------------------------
-- VEREDITO: a normalização God-Table -> satélites está ENCERRADA por decisão.
--   • product_seo / product_ai  -> eram CÓPIAS PURAS não-lidas: ABANDONADAS e
--     já DROPADAS. products permanece a fonte da verdade (SoT) p/ SEO e IA.
--   • supplier_price_tiers       -> SATÉLITE VIVO (lido por get_variant_price). MANTER.
--   • product_packaging          -> FONTE SILVER lida por fn_promote_packaging_to_gold
--                                   para popular products. MANTER.
--   • product_physical           -> buffer write-only (não lido por nenhuma view/função/FK).
--     Mantido por trigger trg_sync_product_physical (products -> physical via fn_sync).
--     v_products_public serve dimensões a partir de products (NÃO de product_physical).
--     >>> NÃO DROPAR <<< enquanto as funções de promoção (fn_promote_padronizacao,
--     fn_site_promote_to_gold, fn_asia_site_promote_to_gold) gravarem nela: o bot
--     Lovable pode regenerar essas funções e um DROP causaria HALT do cron de
--     promoção (*/10) com "relation does not exist". Remoção só em mudança coordenada
--     que primeiro limpe os writers + a fonte do bot.
-- ============================================================================

COMMENT ON TABLE public.product_physical IS
'[ARQ 2026-06-26] Satélite physical (buffer WRITE-ONLY; não lido por view/função/FK). '
'SoT = products; v_products_public lê dimensões de products. Mantido por trigger '
'trg_sync_product_physical (fn_sync_product_physical_from_products, COALESCE products>physical). '
'NÃO DROPAR enquanto fn_promote_padronizacao/fn_site_promote_to_gold/fn_asia_site_promote_to_gold '
'gravarem aqui (risco de HALT do cron de promoção sob regeneração do bot Lovable).';

COMMENT ON TABLE public.product_packaging IS
'[ARQ 2026-06-26] Fonte SILVER de embalagem. LIDA por fn_promote_packaging_to_gold para '
'popular products (has_optional_packaging, packing_classification, etc). Satélite vivo — MANTER.';

COMMENT ON TABLE public.supplier_price_tiers IS
'[ARQ 2026-06-26] Satélite de precificação VIVO. LIDO por get_variant_price. MANTER. '
'Decomposição de cost_price_1..5 do variant_supplier_sources.';;
