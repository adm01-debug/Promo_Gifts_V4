CREATE OR REPLACE FUNCTION public.magazine_page_order_remove_items_v2(p_page_order jsonb, p_item_ids uuid[])
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(p_page_order) IS DISTINCT FROM 'object'
      OR jsonb_typeof(p_page_order->'pages') IS DISTINCT FROM 'array'
      THEN p_page_order
    ELSE jsonb_set(
      p_page_order,
      '{pages}',
      COALESCE((
        SELECT jsonb_agg(
          CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
            THEN jsonb_set(
              page.value,
              '{itemIds}',
              COALESCE((
                SELECT jsonb_agg(item.value ORDER BY item.ordinality)
                FROM jsonb_array_elements(page.value->'itemIds')
                  WITH ORDINALITY item(value, ordinality)
                WHERE NOT ((item.value #>> '{}')::UUID = ANY (p_item_ids))
              ), '[]'::JSONB),
              FALSE
            )
            ELSE page.value END
          ORDER BY page.ordinality
        )
        FROM jsonb_array_elements(p_page_order->'pages')
          WITH ORDINALITY page(value, ordinality)
      ), '[]'::JSONB),
      FALSE
    )
  END
$function$
