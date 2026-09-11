
-- ══════════════════════════════════════════════════════════════════
-- VIEW: vw_product_novelties_active
-- Novidades ativas com dados do produto (Gold join) — G-09
-- Substitui o filtro repetitivo em todas as queries do sistema
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.vw_product_novelties_active AS
SELECT
    -- Colunas de product_novelties
    pn.id                   AS novelty_id,
    pn.product_id,
    pn.supplier_id,
    pn.supplier_code,
    pn.supplier_product_code,
    pn.source,
    pn.detected_at,
    pn.expires_at,
    pn.is_active,
    pn.is_highlighted,
    pn.notes,
    pn.created_at           AS novelty_created_at,
    pn.updated_at           AS novelty_updated_at,

    -- Dados essenciais do produto (Gold)
    p.name                  AS product_name,
    p.sku                   AS product_sku,
    p.supplier_reference,
    p.primary_image_url,
    p.sale_price,
    p.cost_price,
    p.stock_quantity,
    p.is_active             AS product_active,
    p.is_stockout,
    p.created_at            AS product_created_at,

    -- Dias restantes até expirar (NULL = não expira)
    CASE
        WHEN pn.expires_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (pn.expires_at - now()))::int
    END AS days_remaining,

    -- Flag de urgência para dashboard (< 7 dias para expirar)
    CASE
        WHEN pn.expires_at IS NOT NULL
             AND pn.expires_at - now() < INTERVAL '7 days'
        THEN true
        ELSE false
    END AS expiring_soon

FROM public.product_novelties pn
JOIN public.products p ON p.id = pn.product_id
WHERE pn.is_active = true
  AND (pn.expires_at IS NULL OR pn.expires_at > now())
  AND p.is_active = true;

COMMENT ON VIEW public.vw_product_novelties_active IS
    'Novidades ativas com JOIN em products (Gold). '
    'Filtros já aplicados: is_active=true, expires_at não vencido, produto ativo. '
    'Ordenar por is_highlighted DESC, detected_at DESC para home. '
    'Campo days_remaining: NULL = permanente. expiring_soon = TRUE quando < 7 dias.';

-- GRANTs na view
GRANT SELECT ON public.vw_product_novelties_active TO anon, authenticated, service_role;

-- ── View auxiliar: destaques para a home (máx. 4) ───────────────
CREATE OR REPLACE VIEW public.vw_novelties_home_highlights AS
SELECT
    novelty_id, product_id, product_name, product_sku,
    primary_image_url, sale_price, detected_at,
    days_remaining, supplier_code, source
FROM public.vw_product_novelties_active
WHERE is_highlighted = true
ORDER BY detected_at DESC
LIMIT 4;

COMMENT ON VIEW public.vw_novelties_home_highlights IS
    'Top 4 novidades destacadas para o banner da home (is_highlighted=true). '
    'Curadoria manual: definir is_highlighted=true em product_novelties.';

GRANT SELECT ON public.vw_novelties_home_highlights TO anon, authenticated, service_role;
;
