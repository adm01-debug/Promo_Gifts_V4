-- Adiciona 6 colunas nullable (WP-only) a produtos_site_padronizacao.
-- XBZ: site_data nao tem essas chaves -> ficam null -> sem impacto.
ALTER TABLE public.produtos_site_padronizacao
  ADD COLUMN IF NOT EXISTS brand         text,
  ADD COLUMN IF NOT EXISTS moq           integer,
  ADD COLUMN IF NOT EXISTS min_quantity  integer,
  ADD COLUMN IF NOT EXISTS regular_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS sale_price    numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_on_sale    boolean;

COMMENT ON COLUMN public.produtos_site_padronizacao.brand         IS 'Marca do produto (WP brands taxonomy). XBZ: null.';
COMMENT ON COLUMN public.produtos_site_padronizacao.moq           IS 'Multiplo minimo de venda (WP add_to_cart.multiple_of). XBZ: null.';
COMMENT ON COLUMN public.produtos_site_padronizacao.min_quantity  IS 'Quantidade minima de pedido (WP add_to_cart.minimum). XBZ: null.';
COMMENT ON COLUMN public.produtos_site_padronizacao.regular_price IS 'Preco normal/lista sem promocao (WP prices.regular_price). XBZ: null.';
COMMENT ON COLUMN public.produtos_site_padronizacao.sale_price    IS 'Preco promocional (WP prices.sale_price). XBZ: null.';
COMMENT ON COLUMN public.produtos_site_padronizacao.is_on_sale    IS 'Produto em promocao (WP on_sale). XBZ: null.';

-- Estende fn_site_to_silver_all para popular os 6 novos campos do site_data canonico.
-- A logica de leitura e identica para qualquer fornecedor; XBZ retorna null nos 6.
CREATE OR REPLACE FUNCTION public.fn_site_to_silver_all(
  p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid,
  p_limit    integer DEFAULT NULL::integer
)
RETURNS jsonb LANGUAGE plpgsql
AS $function$
DECLARE v_affected int; v_total int;
BEGIN
  INSERT INTO public.produtos_site_padronizacao AS t (
    raw_id, supplier_id, supplier_reference, source_url, source_hash, scraper_version,
    name, description, usage_instructions, supplier_internal_id, availability, disclaimer,
    weight_g, height_cm, width_cm, depth_cm, diameter_cm, circumference_cm,
    engraving_text, engraving_length_cm, engraving_width_cm, engraving_location,
    datasheet_pdf_url, has_video, video_platform, video_embed_id, video_embed_url,
    video_watch_url, video_channel_url, has_view_360, view_360_icon_url,
    primary_image_url, images, colors, categories, related_references,
    brand, moq, min_quantity, regular_price, sale_price, is_on_sale,
    status, standardized_at, updated_at
  )
  SELECT
    s.raw_id, s.supplier_id, s.codigo,
    s.site_data->>'url', s.site_hash, s.site_data#>>'{_meta,scraper_version}',
    public.fn_sanitize_text(s.site_data->>'nome'),
    public.fn_sanitize_text(s.site_data->>'descricao'),
    public.fn_sanitize_text(s.site_data->>'modo_de_uso'),
    s.site_data->>'id_interno_site',
    public.fn_sanitize_text(s.site_data->>'disponibilidade_site'),
    public.fn_sanitize_text(s.site_data->>'disclaimer'),
    (s.site_data->>'peso_g')::int,
    (s.site_data#>>'{dimensoes,altura_cm}')::numeric,
    (s.site_data#>>'{dimensoes,largura_cm}')::numeric,
    (s.site_data#>>'{dimensoes,profundidade_cm}')::numeric,
    (s.site_data#>>'{dimensoes,diametro_cm}')::numeric,
    (s.site_data#>>'{dimensoes,circunferencia_cm}')::numeric,
    public.fn_sanitize_text(s.site_data#>>'{gravacao,medida_texto}'),
    (s.site_data#>>'{gravacao,comprimento_cm}')::numeric,
    (s.site_data#>>'{gravacao,largura_cm}')::numeric,
    public.fn_sanitize_text(s.site_data#>>'{gravacao,local}'),
    s.site_data->>'ficha_tecnica_pdf',
    (s.site_data#>>'{video,indicador}')::boolean,
    s.site_data#>>'{video,plataforma}',  s.site_data#>>'{video,embed_id}',
    s.site_data#>>'{video,embed_url}',   s.site_data#>>'{video,watch_url}',
    s.site_data#>>'{video,canal}',
    (s.site_data#>>'{view_360,indicador}')::boolean, s.site_data#>>'{view_360,icone}',
    (SELECT img->>'url_origem'
       FROM jsonb_array_elements(COALESCE(s.site_data->'imagens','[]'::jsonb)) img
      WHERE img->>'tipo'='principal' ORDER BY (img->>'ordem')::int LIMIT 1),
    s.site_data->'imagens', s.site_data->'cores',
    s.site_data->'categorias', s.site_data->'relacionados',
    -- Campos WP-exclusive: null para XBZ (chaves ausentes no site_data XBZ)
    NULLIF(s.site_data->>'marca', ''),
    NULLIF(s.site_data->>'moq', '')::integer,
    NULLIF(s.site_data->>'qtd_minima', '')::integer,
    NULLIF(s.site_data->>'preco_normal', '')::numeric,
    NULLIF(s.site_data->>'preco_promo', '')::numeric,
    (s.site_data->>'em_promocao')::boolean,
    'standardized'::public.produtos_padronizacao_status, now(), now()
  FROM (
    SELECT DISTINCT ON (r.supplier_id, r.site_data->>'codigo')
      r.id AS raw_id, r.supplier_id, r.site_data->>'codigo' AS codigo,
      r.site_data, r.site_hash
    FROM public.supplier_products_raw r
    WHERE r.supplier_id = p_supplier
      AND r.site_status = 'processed'
      AND r.site_data IS NOT NULL
      AND r.site_data->>'codigo' IS NOT NULL
    ORDER BY r.supplier_id, r.site_data->>'codigo', r.id
    LIMIT COALESCE(p_limit, 1000000000)
  ) s
  ON CONFLICT (supplier_id, supplier_reference) DO UPDATE SET
    raw_id=EXCLUDED.raw_id, source_url=EXCLUDED.source_url,
    source_hash=EXCLUDED.source_hash, scraper_version=EXCLUDED.scraper_version,
    name=EXCLUDED.name, description=EXCLUDED.description,
    usage_instructions=EXCLUDED.usage_instructions,
    supplier_internal_id=EXCLUDED.supplier_internal_id,
    availability=EXCLUDED.availability, disclaimer=EXCLUDED.disclaimer,
    weight_g=EXCLUDED.weight_g, height_cm=EXCLUDED.height_cm,
    width_cm=EXCLUDED.width_cm, depth_cm=EXCLUDED.depth_cm,
    diameter_cm=EXCLUDED.diameter_cm, circumference_cm=EXCLUDED.circumference_cm,
    engraving_text=EXCLUDED.engraving_text,
    engraving_length_cm=EXCLUDED.engraving_length_cm,
    engraving_width_cm=EXCLUDED.engraving_width_cm,
    engraving_location=EXCLUDED.engraving_location,
    datasheet_pdf_url=EXCLUDED.datasheet_pdf_url,
    has_video=EXCLUDED.has_video, video_platform=EXCLUDED.video_platform,
    video_embed_id=EXCLUDED.video_embed_id, video_embed_url=EXCLUDED.video_embed_url,
    video_watch_url=EXCLUDED.video_watch_url, video_channel_url=EXCLUDED.video_channel_url,
    has_view_360=EXCLUDED.has_view_360, view_360_icon_url=EXCLUDED.view_360_icon_url,
    primary_image_url=EXCLUDED.primary_image_url,
    images=EXCLUDED.images, colors=EXCLUDED.colors,
    categories=EXCLUDED.categories, related_references=EXCLUDED.related_references,
    -- Fill-only nos 6 novos: COALESCE preserva valor existente se novo for null
    brand=COALESCE(EXCLUDED.brand, t.brand),
    moq=COALESCE(EXCLUDED.moq, t.moq),
    min_quantity=COALESCE(EXCLUDED.min_quantity, t.min_quantity),
    regular_price=COALESCE(EXCLUDED.regular_price, t.regular_price),
    sale_price=COALESCE(EXCLUDED.sale_price, t.sale_price),
    is_on_sale=COALESCE(EXCLUDED.is_on_sale, t.is_on_sale),
    status='standardized'::public.produtos_padronizacao_status,
    standardized_at=now(), updated_at=now()
  WHERE t.source_hash IS DISTINCT FROM EXCLUDED.source_hash;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  SELECT count(DISTINCT r.site_data->>'codigo') INTO v_total
  FROM public.supplier_products_raw r
  WHERE r.supplier_id=p_supplier AND r.site_status='processed' AND r.site_data IS NOT NULL;

  RETURN jsonb_build_object('afetados', v_affected, 'total_candidatos', v_total,
                            'normalizacao', 'fn_sanitize_text', 'rodado_em', now());
END $function$;;
