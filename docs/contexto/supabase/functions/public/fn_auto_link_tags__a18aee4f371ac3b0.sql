CREATE OR REPLACE FUNCTION public.fn_auto_link_tags(p_product_id uuid, p_supplier_id uuid DEFAULT 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_raw_keywords TEXT;
    v_keyword TEXT;
    v_keywords TEXT[];
    v_tag_id UUID;
    v_linked_count INTEGER := 0;
BEGIN
    -- 1. Buscar Keywords do raw_data
    SELECT raw_data->>'KeyWords'
    INTO v_raw_keywords
    FROM supplier_products_raw
    WHERE product_id = p_product_id
      AND supplier_id = p_supplier_id
    LIMIT 1;
    
    IF v_raw_keywords IS NULL OR v_raw_keywords = '' THEN
        RETURN 0;
    END IF;
    
    -- 2. Separar keywords (vírgula)
    v_keywords := string_to_array(v_raw_keywords, ',');
    
    -- 3. Para cada keyword, tentar encontrar tag correspondente
    FOREACH v_keyword IN ARRAY v_keywords
    LOOP
        v_keyword := TRIM(v_keyword);
        
        IF v_keyword = '' THEN
            CONTINUE;
        END IF;
        
        -- Buscar tag pelo nome (case insensitive)
        SELECT id INTO v_tag_id
        FROM tags
        WHERE LOWER(name) = LOWER(v_keyword)
           OR LOWER(slug) = LOWER(REPLACE(v_keyword, ' ', '-'))
        LIMIT 1;
        
        -- Se encontrou, vincular
        IF v_tag_id IS NOT NULL THEN
            INSERT INTO product_tags (
                product_id,
                tag_id,
                created_at
            )
            VALUES (
                p_product_id,
                v_tag_id,
                NOW()
            )
            ON CONFLICT (product_id, tag_id) DO NOTHING;
            
            IF FOUND THEN
                v_linked_count := v_linked_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_linked_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro vinculando tags do produto %: %', p_product_id, SQLERRM;
    RETURN 0;
END;
$function$
