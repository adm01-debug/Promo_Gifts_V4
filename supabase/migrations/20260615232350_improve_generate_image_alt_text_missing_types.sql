
-- ============================================================
-- FIX 6: generate_image_alt_text — mapeamento incompleto de tipos
-- Preservando assinatura exata: (text, text DEFAULT 'main', text DEFAULT NULL, int DEFAULT 1)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_image_alt_text(
  p_product_name  TEXT,
  p_image_type    TEXT    DEFAULT 'main',
  p_color_name    TEXT    DEFAULT NULL,
  p_display_order INTEGER DEFAULT 1
)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_alt_text  TEXT;
  v_type_desc TEXT;
BEGIN
  IF p_product_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Mapeamento completo dos 18 tipos definidos em image_types
  -- (antes: 7 tipos mapeados; resto caia em ELSE 'Imagem' — SEO pobre)
  v_type_desc := CASE LOWER(COALESCE(p_image_type, 'main'))
    WHEN 'main'             THEN 'Imagem Principal'
    WHEN 'product'          THEN 'Foto do Produto'
    WHEN 'gallery'          THEN 'Foto'
    WHEN 'set'              THEN 'Todas as Cores'
    WHEN 'ambient'          THEN 'Imagem Ambiente'
    WHEN 'logo'             THEN 'Área de Gravação'
    WHEN 'detail'           THEN 'Detalhe'
    WHEN 'box'              THEN 'Embalagem'
    WHEN 'pouch'            THEN 'Estojo'
    WHEN 'bag'              THEN 'Sacola'
    WHEN 'component'        THEN 'Componente'
    WHEN 'location'         THEN 'Localização de Gravação'
    WHEN 'area'             THEN 'Área de Gravação'
    WHEN 'mockup'           THEN 'Mockup Personalizado'
    WHEN 'thumbnail'        THEN 'Miniatura'
    WHEN 'vitrine_pessoa'   THEN 'Vitrine com Pessoa'
    WHEN 'vitrine_ambiente' THEN 'Vitrine Ambiente'
    -- Legados mantidos por compatibilidade
    WHEN 'lifestyle'        THEN 'Foto de Uso'
    WHEN '360'              THEN 'Visão 360°'
    WHEN 'video_thumb'      THEN 'Capa do Vídeo'
    ELSE 'Imagem'
  END;

  v_alt_text := p_product_name || ' - ' || v_type_desc;

  -- Cor: não aplicar em tipos que representam o produto inteiro (não uma cor específica)
  IF p_color_name IS NOT NULL AND LENGTH(TRIM(p_color_name)) > 0
     AND LOWER(COALESCE(p_image_type, '')) NOT IN ('set', 'box', 'pouch', 'bag', 'area', 'location')
  THEN
    v_alt_text := v_alt_text || ' cor ' || p_color_name;
  END IF;

  -- Número de ordem (não aplicar em tipos sem variação de ordem)
  IF LOWER(COALESCE(p_image_type, 'main'))
       NOT IN ('main', 'logo', 'box', 'set', 'area', 'location', 'thumbnail')
     AND p_display_order > 1
  THEN
    v_alt_text := v_alt_text || ' ' || p_display_order;
  END IF;

  v_alt_text := v_alt_text || ' - Brinde Promocional';

  RETURN v_alt_text;
END;
$$;

COMMENT ON FUNCTION generate_image_alt_text(TEXT, TEXT, TEXT, INTEGER) IS
  'Gera alt text SEO para imagens de produto.
   UPDATED 2026-06-15: mapeamento completo de todos os 18 tipos de image_types.
   Antes: tipos não mapeados (component, location, area, set, ambient, etc.) geravam Imagem genérica.';
;
