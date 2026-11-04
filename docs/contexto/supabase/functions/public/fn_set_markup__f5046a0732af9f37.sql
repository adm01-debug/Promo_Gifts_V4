CREATE OR REPLACE FUNCTION public.fn_set_markup(p_nivel text, p_id uuid, p_markup numeric, p_descricao text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_existing_id uuid;
    v_result      jsonb;
BEGIN
    -- Validar nível
    IF p_nivel NOT IN ('supplier','category','product') THEN
        RETURN jsonb_build_object('success', false,
            'error', 'nivel_invalido',
            'dica',  'Use: supplier | category | product');
    END IF;

    IF p_markup < 0 OR p_markup > 10000 THEN
        RETURN jsonb_build_object('success', false,
            'error', 'markup_fora_do_intervalo',
            'dica',  'Informe markup entre 0 e 10000 (ex: 115 = 115%)');
    END IF;

    -- Verificar se já existe regra para esse alvo
    SELECT id INTO v_existing_id
    FROM markup_configurations
    WHERE is_active = true
      AND CASE p_nivel
            WHEN 'supplier' THEN supplier_id = p_id AND category_id IS NULL AND product_id IS NULL
            WHEN 'category' THEN category_id = p_id AND product_id IS NULL
            WHEN 'product'  THEN product_id  = p_id
          END
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Atualizar existente
        UPDATE markup_configurations
        SET markup_percent = p_markup,
            description    = COALESCE(p_descricao, description),
            updated_at     = now()
        WHERE id = v_existing_id;

        v_result := jsonb_build_object(
            'success', true, 'operacao', 'UPDATE',
            'nivel', p_nivel, 'id_alvo', p_id,
            'markup_percent', p_markup
        );
    ELSE
        -- Inserir nova regra
        INSERT INTO markup_configurations
            (supplier_id, category_id, product_id, markup_percent, description, is_active)
        VALUES (
            CASE WHEN p_nivel = 'supplier' THEN p_id ELSE NULL END,
            CASE WHEN p_nivel = 'category' THEN p_id ELSE NULL END,
            CASE WHEN p_nivel = 'product'  THEN p_id ELSE NULL END,
            p_markup,
            COALESCE(p_descricao, p_nivel || ' markup ' || p_markup || '%'),
            true
        );

        v_result := jsonb_build_object(
            'success', true, 'operacao', 'INSERT',
            'nivel', p_nivel, 'id_alvo', p_id,
            'markup_percent', p_markup
        );
    END IF;

    RETURN v_result;
END;
$function$
