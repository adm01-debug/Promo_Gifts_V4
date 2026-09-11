
CREATE OR REPLACE FUNCTION public.fn_derive_parent_ref(
  p_supplier_id  uuid,
  p_variant_ref  text,
  p_raw          jsonb
) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_variant_ref IS NULL OR TRIM(p_variant_ref) = '' THEN
    RETURN NULL;
  END IF;

  -- Spot | Stricker
  IF p_supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0' THEN
    RETURN COALESCE(NULLIF(TRIM(p_raw->>'ProdReference'), ''), p_variant_ref);
  END IF;

  -- XBZ Brindes
  IF p_supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' THEN
    RETURN COALESCE(NULLIF(TRIM(p_raw->>'CodigoAmigavel'), ''),
                   regexp_replace(p_variant_ref, '-[^-]*$', ''));
  END IF;

  -- Asia Import: usa raw_data->>'referencia' quando está presente E é diferente da variante.
  -- Esse campo foi corrigido na migration asia_bronze_fix_referencia_pai (antes era == var).
  -- Fallback: heurística sufixo-P para registros legados/descontinuados sem o campo.
  IF p_supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118' THEN
    IF p_raw IS NOT NULL
       AND NULLIF(TRIM(p_raw->>'referencia'), '') IS NOT NULL
       AND (p_raw->>'referencia') IS DISTINCT FROM p_variant_ref THEN
      RETURN TRIM(p_raw->>'referencia');
    END IF;
    -- fallback heurístico
    IF position('-' IN p_variant_ref) > 0 THEN
      RETURN regexp_replace(p_variant_ref, '-[^-]*$', '');
    ELSE
      RETURN p_variant_ref || 'P';
    END IF;
  END IF;

  -- Só Marcas: 1:1
  IF p_supplier_id = '841cd690-210a-422a-908c-7676828db272' THEN
    RETURN p_variant_ref;
  END IF;

  -- Demais: corte no último hífen
  IF position('-' IN p_variant_ref) > 0 THEN
    RETURN regexp_replace(p_variant_ref, '-[^-]*$', '');
  END IF;
  RETURN p_variant_ref;
END;
$$;

COMMENT ON FUNCTION public.fn_derive_parent_ref(uuid, text, jsonb) IS
  'Deriva referência do produto-pai. Asia: usa raw_data->>''referencia'' (corrigido em
   asia_bronze_fix_referencia_pai) com fallback heurístico sufixo-P. XBZ: CodigoAmigavel.
   Spot: ProdReference. Só Marcas: 1:1. Demais: corte-hífen.';
;
