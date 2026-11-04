CREATE OR REPLACE FUNCTION public.generate_product_jsonld(p_product_id uuid, p_base_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product RECORD;
  v_category_name TEXT;
  v_images JSONB;
  v_faqs JSONB;
  v_schema JSONB;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT name INTO v_category_name FROM categories
  WHERE id = COALESCE(v_product.main_category_id, v_product.category_id);

  SELECT COALESCE(jsonb_agg(url_cdn ORDER BY display_order),'[]'::jsonb) INTO v_images
  FROM product_images WHERE product_id=p_product_id AND is_active=true AND url_cdn IS NOT NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    '@type','Question','name',question,
    'acceptedAnswer',jsonb_build_object('@type','Answer','text',answer)
  ) ORDER BY display_order),'[]'::jsonb)
  INTO v_faqs FROM product_faqs WHERE product_id=p_product_id AND is_active=true;

  v_schema := jsonb_build_object(
    '@context','https://schema.org','@type','Product',
    'name',v_product.name,
    'description',COALESCE(v_product.description,v_product.short_description,v_product.name),
    'image',v_images,
    'brand',jsonb_build_object('@type','Brand','name',COALESCE(v_product.brand,'Promo Brindes')),
    'category',v_category_name,
    'url',p_base_url||'/produto/'||COALESCE(v_product.slug,v_product.id::TEXT),
    'offers',jsonb_build_object(
      '@type','Offer','priceCurrency','BRL',
      'price',COALESCE(v_product.sale_price,v_product.cost_price,0),
      'availability',CASE WHEN COALESCE(v_product.stock_quantity,0)>0
        THEN 'https://schema.org/InStock' ELSE 'https://schema.org/OutOfStock' END,
      'seller',jsonb_build_object('@type','Organization','name','Promo Brindes')
    )
  );

  -- SKU (existe em products)
  IF v_product.sku IS NOT NULL THEN
    v_schema := v_schema || jsonb_build_object('sku', v_product.sku);
  END IF;
  -- NOTA: gtin/ean não existem em products — removidos

  IF jsonb_array_length(v_faqs) > 0 THEN
    v_schema := v_schema || jsonb_build_object('mainEntity', v_faqs);
  END IF;

  RETURN v_schema;
END;
$function$
