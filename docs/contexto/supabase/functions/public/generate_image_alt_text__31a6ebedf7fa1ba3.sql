CREATE OR REPLACE FUNCTION public.generate_image_alt_text(p_product_name text, p_image_type text DEFAULT 'main'::text, p_color_name text DEFAULT NULL::text, p_display_order integer DEFAULT 1)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
