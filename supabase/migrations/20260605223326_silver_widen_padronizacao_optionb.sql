-- Opção B: alargar o Silver para carregar campos ricos até o Gold.
-- PARENT: flags, taxonomia, imagem de caixa, arrays.
ALTER TABLE public.produtos_padronizacao
  ADD COLUMN IF NOT EXISTS product_type           text,
  ADD COLUMN IF NOT EXISTS origin_country          varchar,
  ADD COLUMN IF NOT EXISTS combined_sizes          varchar,
  ADD COLUMN IF NOT EXISTS box_image               text,
  ADD COLUMN IF NOT EXISTS is_textil               boolean,
  ADD COLUMN IF NOT EXISTS is_stockout             boolean,
  ADD COLUMN IF NOT EXISTS is_online_exclusive     boolean,
  ADD COLUMN IF NOT EXISTS is_new                  boolean,
  ADD COLUMN IF NOT EXISTS has_colors              boolean,
  ADD COLUMN IF NOT EXISTS has_sizes               boolean,
  ADD COLUMN IF NOT EXISTS allows_personalization  boolean,
  ADD COLUMN IF NOT EXISTS tags                    jsonb,
  ADD COLUMN IF NOT EXISTS materials               jsonb,
  ADD COLUMN IF NOT EXISTS meta_keywords           text[];

-- VARIANTE: 5 faixas, reposição (1..3), multiplicador, imagens/vídeo do fornecedor.
ALTER TABLE public.produtos_padronizacao_variantes
  ADD COLUMN IF NOT EXISTS cost_price_1       numeric,
  ADD COLUMN IF NOT EXISTS cost_price_2       numeric,
  ADD COLUMN IF NOT EXISTS cost_price_3       numeric,
  ADD COLUMN IF NOT EXISTS cost_price_4       numeric,
  ADD COLUMN IF NOT EXISTS cost_price_5       numeric,
  ADD COLUMN IF NOT EXISTS min_qty_1          integer,
  ADD COLUMN IF NOT EXISTS min_qty_2          integer,
  ADD COLUMN IF NOT EXISTS min_qty_3          integer,
  ADD COLUMN IF NOT EXISTS min_qty_4          integer,
  ADD COLUMN IF NOT EXISTS min_qty_5          integer,
  ADD COLUMN IF NOT EXISTS next_quantity_1    integer,
  ADD COLUMN IF NOT EXISTS next_quantity_2    integer,
  ADD COLUMN IF NOT EXISTS next_quantity_3    integer,
  ADD COLUMN IF NOT EXISTS next_date_1        date,
  ADD COLUMN IF NOT EXISTS next_date_2        date,
  ADD COLUMN IF NOT EXISTS next_date_3        date,
  ADD COLUMN IF NOT EXISTS sale_multiplier    integer,
  ADD COLUMN IF NOT EXISTS supplier_thumbnail text,
  ADD COLUMN IF NOT EXISTS supplier_images    jsonb,
  ADD COLUMN IF NOT EXISTS supplier_videos    jsonb;;
