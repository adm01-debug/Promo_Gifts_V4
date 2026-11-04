CREATE OR REPLACE FUNCTION public.fn_recalcular_markup(p_nivel text, p_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_atualizados int;
BEGIN
    IF p_nivel NOT IN ('supplier','category','product','all') THEN
        RETURN jsonb_build_object('success', false, 'error', 'nivel_invalido');
    END IF;

    -- Informa pipeline para não travar locked_fields
    PERFORM set_config('app.write_source', 'pipeline', true);

    -- Atualiza sale_price diretamente com a mesma hierarquia do trigger
    -- Mais confiável que +/- delta pois não depende de detectar mudança
    UPDATE products p
    SET sale_price = ROUND(
        p.cost_price * (
            1 + COALESCE(
                -- 1. produto específico
                (SELECT mc.markup_percent
                 FROM markup_configurations mc
                 WHERE mc.is_active = true
                   AND (mc.product_id  IS NULL OR mc.product_id  = p.id)
                   AND (mc.category_id IS NULL OR mc.category_id = p.category_id)
                   AND (mc.supplier_id IS NULL OR mc.supplier_id = p.supplier_id)
                 ORDER BY
                   (CASE WHEN mc.product_id  IS NOT NULL THEN 1000 ELSE 0 END) +
                   (CASE WHEN mc.category_id IS NOT NULL THEN 100  ELSE 0 END) +
                   (CASE WHEN mc.supplier_id IS NOT NULL THEN 10   ELSE 0 END) DESC
                 LIMIT 1),
                -- 2. fallback: default_markup_percent do fornecedor
                (SELECT s.default_markup_percent
                 FROM suppliers s
                 WHERE s.id = p.supplier_id AND s.active = true),
                -- 3. fallback final
                115.0
            ) / 100.0
        ), 2
    )
    WHERE p.cost_price IS NOT NULL
      AND p.cost_price > 0
      AND CASE p_nivel
            WHEN 'supplier' THEN p.supplier_id = p_id
            WHEN 'category' THEN p.category_id = p_id
            WHEN 'product'  THEN p.id = p_id
            WHEN 'all'      THEN true
            ELSE false
          END;

    GET DIAGNOSTICS v_atualizados = ROW_COUNT;

    RETURN jsonb_build_object(
        'success',      true,
        'nivel',        p_nivel,
        'id_alvo',      p_id,
        'recalculados', v_atualizados
    );
END;
$function$
