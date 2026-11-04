-- Recriar views Asia (lote 2: 4 views restantes)
CREATE OR REPLACE VIEW public.vw_asia_products_errors AS
SELECT supplier_reference,
    raw_data ->> 'nome'::text AS nome_produto,
    process_errors, processed, processed_at, created_at
FROM supplier_products_raw spr
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND process_errors IS NOT NULL
ORDER BY updated_at DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_low_stock AS
SELECT supplier_reference,
    raw_data ->> 'nome'::text AS nome_produto,
    parse_asia_price(raw_data) AS preco,
    parse_asia_stock(raw_data) AS estoque_atual,
    parse_asia_categories(raw_data) AS categorias,
    updated_at
FROM supplier_products_raw spr
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND parse_asia_stock(raw_data) > 0 AND parse_asia_stock(raw_data) < 100
ORDER BY (parse_asia_stock(raw_data));

CREATE OR REPLACE VIEW public.vw_asia_products_pending AS
SELECT supplier_reference,
    raw_data ->> 'nome'::text AS nome_produto,
    parse_asia_price(raw_data) AS preco,
    parse_asia_stock(raw_data) AS estoque,
    parse_asia_categories(raw_data) AS categorias,
    imported_at, created_at,
    EXTRACT(epoch FROM now() - imported_at) / 3600::numeric AS horas_desde_import
FROM supplier_products_raw spr
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND processed = false
ORDER BY imported_at DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_promo AS
SELECT supplier_reference,
    raw_data ->> 'nome'::text AS nome_produto,
    parse_asia_price(raw_data) AS preco,
    parse_asia_stock(raw_data) AS estoque,
    parse_asia_categories(raw_data) AS categorias,
    updated_at
FROM supplier_products_raw spr
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND ((raw_data ->> 'promocao'::text)::integer) = 1
ORDER BY (parse_asia_price(raw_data));
