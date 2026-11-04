CREATE OR REPLACE FUNCTION public.magazine_validate_page_order_v2(p_magazine_id uuid, p_page_order jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pages JSONB;
BEGIN
  IF p_page_order IS NULL OR p_page_order = 'null'::JSONB THEN
    RETURN TRUE;
  END IF;

  IF jsonb_typeof(p_page_order) = 'array' THEN
    IF jsonb_array_length(p_page_order) > 200 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_page_order) AS entry(value)
      WHERE jsonb_typeof(value) IS DISTINCT FROM 'number'
         OR (value #>> '{}') !~ '^[0-9]+$'
         OR (value #>> '{}')::NUMERIC > 200
    ) OR (SELECT count(*) FROM jsonb_array_elements(p_page_order)) <>
         (SELECT count(DISTINCT value) FROM jsonb_array_elements(p_page_order) entry(value)) THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  IF jsonb_typeof(p_page_order) IS DISTINCT FROM 'object'
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_page_order) AS envelope(key)
       WHERE key <> ALL (ARRAY['version', 'pages'])
     )
     OR jsonb_typeof(p_page_order->'version') IS DISTINCT FROM 'number'
     OR (p_page_order->>'version')::NUMERIC IS DISTINCT FROM 2
     OR jsonb_typeof(p_page_order->'pages') IS DISTINCT FROM 'array' THEN
    RETURN FALSE;
  END IF;

  v_pages := p_page_order->'pages';
  IF jsonb_array_length(v_pages) NOT BETWEEN 2 AND 200
     OR v_pages->0->>'kind' IS DISTINCT FROM 'cover'
     OR NOT COALESCE(v_pages->-1->>'kind' = ANY (ARRAY['contact', 'back-cover']), FALSE)
     OR (SELECT count(*) FROM jsonb_array_elements(v_pages) p(value)
         WHERE value->>'kind' = 'cover') <> 1
     OR (SELECT count(*) FROM jsonb_array_elements(v_pages) p(value)
         WHERE value->>'kind' IN ('contact', 'back-cover')) <> 1
     OR (SELECT count(*) FROM jsonb_array_elements(v_pages)) <>
        (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_pages) p(value)) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_pages) AS page(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(
           CASE WHEN jsonb_typeof(value) = 'object' THEN value ELSE '{}'::JSONB END
         ) AS field(key)
         WHERE key <> ALL (ARRAY['id', 'kind', 'title', 'body', 'itemIds'])
       )
       OR jsonb_typeof(value->'id') IS DISTINCT FROM 'string'
       OR char_length(BTRIM(value->>'id')) NOT BETWEEN 1 AND 120
       OR jsonb_typeof(value->'kind') IS DISTINCT FROM 'string'
       OR NOT COALESCE(value->>'kind' = ANY (
         ARRAY['cover', 'institutional', 'section', 'products', 'contact', 'back-cover']
       ), FALSE)
       OR (value ? 'title' AND (
         jsonb_typeof(value->'title') IS DISTINCT FROM 'string'
         OR char_length(value->>'title') > 120
       ))
       OR (value ? 'body' AND (
         jsonb_typeof(value->'body') IS DISTINCT FROM 'string'
         OR char_length(value->>'body') > 800
       ))
       OR (value ? 'itemIds' AND value->>'kind' IS DISTINCT FROM 'products')
       OR (value ? 'itemIds' AND jsonb_typeof(value->'itemIds') IS DISTINCT FROM 'array')
       OR (value ? 'itemIds' AND jsonb_typeof(value->'itemIds') = 'array'
           AND jsonb_array_length(value->'itemIds') > 500)
  ) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
    WHERE jsonb_typeof(item.value) IS DISTINCT FROM 'string'
       OR (item.value #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RETURN FALSE;
  END IF;

  IF (
    SELECT count(*) FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
  ) > 500 OR (
    SELECT count(*) FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
  ) <> (
    SELECT count(DISTINCT item.value) FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
  ) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.magazine_items mi
      WHERE mi.magazine_id = p_magazine_id
        AND mi.id = (item.value #>> '{}')::UUID
    )
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN FALSE;
END;
$function$
