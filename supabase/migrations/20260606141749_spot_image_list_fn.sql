
CREATE OR REPLACE FUNCTION public.fn_spot_image_list(
  p_csv  text,
  p_base text DEFAULT 'https://www.spotgifts.com.br/fotos/produtos/'
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    to_jsonb(
      ARRAY(
        SELECT p_base || btrim(e)
        FROM unnest(string_to_array(p_csv, ',')) AS e
        WHERE btrim(e) <> ''
      )
    ),
    '[]'::jsonb
  );
$$;

COMMENT ON FUNCTION public.fn_spot_image_list(text, text) IS
'Converte o campo AllImageList (CSV de nomes de arquivo) em jsonb array de URLs absolutas
 usando o base URL da SPOT. IMMUTABLE — usada pelo DE>PARA (supplier_field_mappings)
 para as regras product_variants.images e variant_supplier_sources.supplier_images.
 Criada em 2026-06-06 (GAP-1 da análise exaustiva DE>PARA).';
;
