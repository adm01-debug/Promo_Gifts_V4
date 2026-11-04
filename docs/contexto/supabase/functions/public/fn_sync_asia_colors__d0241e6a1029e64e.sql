CREATE OR REPLACE FUNCTION public.fn_sync_asia_colors(p_cores jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_org_id      uuid;
  v_inseridos   int  := 0;
  v_atualizados int  := 0;
  v_cor         jsonb;
  v_row_count   int;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM supplier_colors WHERE supplier_id = v_supplier_id LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id não encontrado para Asia Import';
  END IF;

  FOR v_cor IN SELECT * FROM jsonb_array_elements(p_cores)
  LOOP
    BEGIN
      INSERT INTO supplier_colors (
        supplier_id, organization_id, name, code,
        hex_code, api_color_id, image_url, source,
        is_active, is_available, api_raw_data, updated_at
      ) VALUES (
        v_supplier_id, v_org_id,
        v_cor->>'name',
        v_cor->>'slug',
        NULLIF(trim(v_cor->>'color'), ''),
        v_cor->>'id',
        NULLIF(trim(v_cor->>'photo'), ''),
        'api_hg_atributes',
        true, true, v_cor, now()
      )
      ON CONFLICT (organization_id, supplier_id, name)
      DO UPDATE SET
        code         = EXCLUDED.code,
        hex_code     = COALESCE(EXCLUDED.hex_code, supplier_colors.hex_code),
        api_color_id = COALESCE(EXCLUDED.api_color_id, supplier_colors.api_color_id),
        image_url    = COALESCE(EXCLUDED.image_url, supplier_colors.image_url),
        source       = 'api_hg_atributes',
        api_raw_data = EXCLUDED.api_raw_data,
        is_active    = true,
        updated_at   = now();

      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      -- v_row_count = 1 sempre (INSERT ou UPDATE)
      -- Usa xmax para distinguir: não disponível aqui, usa contagem simples
      v_atualizados := v_atualizados + v_row_count;

    EXCEPTION WHEN OTHERS THEN
      NULL; -- continua com as demais cores
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processadas', v_atualizados,
    'total_input', jsonb_array_length(p_cores)
  );
END;
$function$
