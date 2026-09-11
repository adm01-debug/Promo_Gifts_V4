
-- DROP + recreate — única forma de adicionar/reordenar colunas em views
DROP VIEW IF EXISTS public.vw_novelties_home_highlights;

CREATE VIEW public.vw_novelties_home_highlights AS
SELECT
    novelty_id,
    product_id,
    product_name,
    product_sku,
    supplier_reference,
    primary_image_url,
    sale_price,
    detected_at,
    expires_at,
    days_remaining,
    expiring_soon,
    supplier_code,
    source,
    is_highlighted
FROM public.vw_product_novelties_active
WHERE is_highlighted = true
ORDER BY detected_at DESC
LIMIT 4;

COMMENT ON VIEW public.vw_novelties_home_highlights IS
    'Top 4 novidades com is_highlighted=true para o banner da home. '
    'Curadoria manual via product_novelties.is_highlighted=true. '
    'Ordenado por detected_at DESC.';

GRANT SELECT ON public.vw_novelties_home_highlights TO anon, authenticated, service_role;
;
