-- Helper: divide lista por regex [.,]\s+ (ponto OU vírgula + espaço), conserta mojibake, limpa vazios.
CREATE OR REPLACE FUNCTION public.fn_spot_split_list(p text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','extensions' AS $$
  SELECT to_jsonb(COALESCE(array_agg(btrim(e)) FILTER (WHERE btrim(e) <> ''), ARRAY[]::text[]))
  FROM unnest(regexp_split_to_array(public.fn_fix_mojibake(COALESCE(p,'')), '[.,]\s+')) e;
$$;

-- Corretor SPOT-isolado: re-deriva produtos_padronizacao.materials a partir do Bronze (Materials),
-- usando o split por regex. NÃO toca outros fornecedores nem a função compartilhada.
CREATE OR REPLACE FUNCTION public.fn_spot_fix_materials(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);
  UPDATE public.produtos_padronizacao pp
  SET materials = public.fn_spot_split_list(spr.raw_data->>'Materials'), updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE pp.raw_id = spr.id
    AND pp.supplier_id = p_supplier_id
    AND nullif(btrim(spr.raw_data->>'Materials'),'') IS NOT NULL
    AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
