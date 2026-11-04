CREATE OR REPLACE FUNCTION public.get_copywriting_config(p_category_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_config JSONB;
    v_current_id UUID := p_category_id;
    v_parent_id UUID;
    v_iterations INTEGER := 0;
BEGIN
    -- Loop para buscar config na categoria ou ancestrais (máx 10 níveis)
    WHILE v_current_id IS NOT NULL AND v_iterations < 10 LOOP
        v_iterations := v_iterations + 1;
        
        -- Buscar config da categoria atual
        SELECT jsonb_build_object(
            'category_id', ccc.category_id,
            'category_name', c.name,
            'personas', ccc.personas,
            'ocasioes', ccc.ocasioes,
            'keywords_seo', ccc.keywords_seo,
            'tom_voz', ccc.tom_voz,
            'ctas', ccc.ctas,
            'storytelling_template', ccc.storytelling_template,
            'diferenciais', ccc.diferenciais,
            'beneficios_emocionais', ccc.beneficios_emocionais,
            'objecoes_comuns', ccc.objecoes_comuns,
            'unidade_peso', ccc.unidade_peso,
            'unidade_capacidade', ccc.unidade_capacidade,
            'unidade_dimensao', ccc.unidade_dimensao,
            'config_extra', ccc.config_extra,
            'inherited_from', CASE WHEN ccc.category_id = p_category_id THEN NULL ELSE c.name END
        )
        INTO v_config
        FROM category_copywriting_config ccc
        JOIN categories c ON ccc.category_id = c.id
        WHERE ccc.category_id = v_current_id
          AND ccc.is_active = TRUE;
        
        -- Se encontrou, retorna
        IF v_config IS NOT NULL THEN
            RETURN v_config;
        END IF;
        
        -- Buscar categoria pai
        SELECT parent_id INTO v_parent_id
        FROM categories
        WHERE id = v_current_id;
        
        v_current_id := v_parent_id;
    END LOOP;
    
    -- Retornar config padrão se não encontrou
    RETURN jsonb_build_object(
        'category_id', p_category_id,
        'category_name', NULL,
        'personas', ARRAY['Marketing', 'RH', 'Compras', 'Eventos'],
        'ocasioes', ARRAY['eventos corporativos', 'campanhas promocionais', 'brindes para clientes'],
        'keywords_seo', ARRAY['brinde personalizado', 'brinde corporativo', 'brinde promocional'],
        'tom_voz', 'profissional',
        'ctas', ARRAY['Solicite um orçamento personalizado!', 'Peça uma amostra!'],
        'storytelling_template', 'Imagine sua marca presente no dia a dia dos seus clientes e colaboradores.',
        'diferenciais', ARRAY['personalização', 'qualidade', 'entrega'],
        'beneficios_emocionais', ARRAY['valorização', 'reconhecimento', 'lembrança de marca'],
        'objecoes_comuns', ARRAY['prazo de entrega', 'quantidade mínima', 'área de gravação'],
        'unidade_peso', 'g',
        'unidade_capacidade', 'ml',
        'unidade_dimensao', 'mm',
        'config_extra', '{}',
        'is_default', true
    );
END;
$function$
