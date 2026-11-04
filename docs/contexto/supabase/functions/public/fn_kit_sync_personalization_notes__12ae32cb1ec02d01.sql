CREATE OR REPLACE FUNCTION public.fn_kit_sync_personalization_notes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar notas de personalização para componentes com print_areas e sem notas
  WITH notas_calculadas AS (
    SELECT 
      pkc.id AS comp_id,
      STRING_AGG(
        kpa.location_name 
        || ': ' || ROUND(kpa.max_width, 0)::text || ' × ' || ROUND(kpa.max_height, 0)::text || ' mm'
        || CASE WHEN kpa.is_curved THEN ' (curvo)' ELSE '' END
        || ' | ' || COALESCE(tpg.grupo_tecnica, 'Gravação')
        || CASE WHEN tpg.max_cores IS NOT NULL AND tpg.max_cores > 0 
                THEN ' | Máx ' || tpg.max_cores || ' cor(es)' ELSE '' END
        || CASE WHEN tpg.codigo_tabela IS NOT NULL 
                THEN ' [' || tpg.codigo_tabela || ']' ELSE '' END,
        E'\n' ORDER BY kpa.location_order, kpa.location_name
      ) AS nota_texto
    FROM product_kit_components pkc
    JOIN kit_component_print_areas kpa ON kpa.kit_component_id = pkc.id
    LEFT JOIN tabela_preco_gravacao_oficial tpg ON tpg.id = kpa.tabela_preco_id
    WHERE pkc.personalization_notes IS NULL
      AND kpa.location_name IS NOT NULL
    GROUP BY pkc.id
  )
  UPDATE product_kit_components pkc
  SET 
    personalization_notes = nc.nota_texto,
    updated_at = NOW()
  FROM notas_calculadas nc
  WHERE pkc.id = nc.comp_id
    AND nc.nota_texto IS NOT NULL;
END;
$function$
