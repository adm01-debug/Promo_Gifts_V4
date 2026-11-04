-- Onda 19: Precisão explícita em 21 colunas numeric (audit gap 5.4)

-- 0. DROP dependências bloqueadoras
DROP VIEW IF EXISTS public.v_audit_paradoxos_gravacao;
DROP TRIGGER IF EXISTS trg_quotes_calc_real_values ON public.quotes;
DROP TRIGGER IF EXISTS trg_kit_print_area_normalizar_eixos ON public.kit_component_print_areas;

-- 1. PERCENTUAIS (8 colunas)
ALTER TABLE public.quotes
  ALTER COLUMN discount_percent           TYPE numeric(5,2),
  ALTER COLUMN negotiation_markup_percent TYPE numeric(5,2),
  ALTER COLUMN real_discount_percent      TYPE numeric(5,2);

ALTER TABLE public.seller_discount_limits
  ALTER COLUMN max_discount_percent     TYPE numeric(5,2),
  ALTER COLUMN approval_required_above  TYPE numeric(5,2);

ALTER TABLE public.tabela_preco_gravacao_oficial
  ALTER COLUMN markup_percent TYPE numeric(5,2);

ALTER TABLE public.supplier_technique_mappings
  ALTER COLUMN confidence TYPE numeric(3,2);

ALTER TABLE public.variant_supplier_sources
  ALTER COLUMN supplier_ipi_rate TYPE numeric(5,2);

-- 2. DINHEIRO (8 colunas)
ALTER TABLE public.quotes
  ALTER COLUMN real_subtotal TYPE numeric(10,2);

ALTER TABLE public.quote_item_personalizations
  ALTER COLUMN unit_cost  TYPE numeric(10,2),
  ALTER COLUMN setup_cost TYPE numeric(10,2),
  ALTER COLUMN total_cost TYPE numeric(10,2);

ALTER TABLE public.kit_variants
  ALTER COLUMN total_price TYPE numeric(12,2);

ALTER TABLE public.seller_cart_items
  ALTER COLUMN product_price TYPE numeric(10,2);

ALTER TABLE public.collection_items
  ALTER COLUMN price_at_save TYPE numeric(12,2);

ALTER TABLE public.collection_items_trash
  ALTER COLUMN price_at_save TYPE numeric(12,2);

-- 3. DIMENSÕES (5 colunas)
ALTER TABLE public.quote_item_personalizations
  ALTER COLUMN area_cm2  TYPE numeric(8,2),
  ALTER COLUMN height_cm TYPE numeric(8,2),
  ALTER COLUMN width_cm  TYPE numeric(8,2);

ALTER TABLE public.kit_component_print_areas
  ALTER COLUMN max_height TYPE numeric(8,2),
  ALTER COLUMN max_width  TYPE numeric(8,2);

-- 4. RECREATE triggers (definições idênticas às originais)
CREATE TRIGGER trg_quotes_calc_real_values
  BEFORE INSERT OR UPDATE OF subtotal, discount_amount, negotiation_markup_percent
  ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_quotes_calc_real_values();

CREATE TRIGGER trg_kit_print_area_normalizar_eixos
  BEFORE INSERT OR UPDATE OF max_width, max_height
  ON public.kit_component_print_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_kit_print_area_normalizar_eixos();

-- 5. RECREATE view (definição idêntica à original)
CREATE OR REPLACE VIEW public.v_audit_paradoxos_gravacao AS
WITH faixas_ord AS (
  SELECT t.id,
    t.codigo_tabela,
    t.nome,
    t.grupo_tecnica,
    t.custo_setup,
    t.markup_percent,
    f.quantidade_minima,
    f.quantidade_maxima,
    f.preco_unitario,
    lag(f.preco_unitario) OVER (
      PARTITION BY t.id,
        (COALESCE(f.largura_min, 0::numeric)),
        (COALESCE(f.largura_max, 0::numeric)),
        (COALESCE(f.altura_min, 0::numeric)),
        (COALESCE(f.altura_max, 0::numeric))
      ORDER BY f.quantidade_minima
    ) AS preco_anterior,
    lag(f.quantidade_maxima) OVER (
      PARTITION BY t.id,
        (COALESCE(f.largura_min, 0::numeric)),
        (COALESCE(f.largura_max, 0::numeric)),
        (COALESCE(f.altura_min, 0::numeric)),
        (COALESCE(f.altura_max, 0::numeric))
      ORDER BY f.quantidade_minima
    ) AS qty_max_anterior
  FROM public.tabela_preco_gravacao_oficial t
  JOIN public.tabela_preco_gravacao_oficial_faixa f
    ON f.tabela_preco_gravacao_id = t.id
  WHERE t.ativo = true
)
SELECT
  codigo_tabela,
  nome,
  grupo_tecnica,
  qty_max_anterior AS qty_pico_ant,
  preco_anterior,
  round(GREATEST(qty_max_anterior::numeric * preco_anterior, custo_setup) * (1::numeric + markup_percent / 100::numeric), 2) AS venda_no_pico,
  quantidade_minima AS qty_inicio,
  preco_unitario AS preco_atual,
  round(GREATEST(quantidade_minima::numeric * preco_unitario, custo_setup) * (1::numeric + markup_percent / 100::numeric), 2) AS venda_inicio,
  round(GREATEST(quantidade_minima::numeric * preco_unitario, custo_setup) - GREATEST(qty_max_anterior::numeric * preco_anterior, custo_setup), 2) AS economia_cliente_se_subir_faixa,
  CASE
    WHEN preco_anterior IS NULL THEN 'primeira_faixa'::text
    WHEN qty_max_anterior IS NULL THEN 'sem_pico_anterior'::text
    WHEN GREATEST(quantidade_minima::numeric * preco_unitario, custo_setup) < GREATEST(qty_max_anterior::numeric * preco_anterior, custo_setup) THEN 'PARADOXO_NATURAL'::text
    ELSE 'OK'::text
  END AS status_natural
FROM faixas_ord
WHERE preco_anterior IS NOT NULL AND qty_max_anterior IS NOT NULL
ORDER BY codigo_tabela, quantidade_minima;
