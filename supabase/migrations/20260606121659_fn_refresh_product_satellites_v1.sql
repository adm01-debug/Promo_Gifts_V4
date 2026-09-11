create or replace function public.fn_refresh_product_satellites(p_product_id uuid default null)
returns void
language plpgsql
as $$
begin
  insert into public.product_seo as t
    (product_id, meta_title, meta_description, meta_keywords, schema_json, canonical_url,
     robots_meta, seo_score, seo_last_audit_at, seo_issues, og_title, og_description, og_image_url)
  select p.id, p.meta_title, p.meta_description, p.meta_keywords, p.schema_json, p.canonical_url,
         p.robots_meta, p.seo_score, p.seo_last_audit_at, p.seo_issues, p.og_title, p.og_description, p.og_image_url
  from public.products p
  where p_product_id is null or p.id = p_product_id
  on conflict (product_id) do update set
    meta_title=excluded.meta_title, meta_description=excluded.meta_description, meta_keywords=excluded.meta_keywords,
    schema_json=excluded.schema_json, canonical_url=excluded.canonical_url, robots_meta=excluded.robots_meta,
    seo_score=excluded.seo_score, seo_last_audit_at=excluded.seo_last_audit_at, seo_issues=excluded.seo_issues,
    og_title=excluded.og_title, og_description=excluded.og_description, og_image_url=excluded.og_image_url;

  insert into public.product_ai as t
    (product_id, ai_summary, key_benefits, use_cases, target_audience, ai_title, ai_description,
     ai_version, ai_generated_at, ai_model)
  select p.id, p.ai_summary, p.key_benefits, p.use_cases, p.target_audience, p.ai_title, p.ai_description,
         p.ai_version, p.ai_generated_at, p.ai_model
  from public.products p
  where p_product_id is null or p.id = p_product_id
  on conflict (product_id) do update set
    ai_summary=excluded.ai_summary, key_benefits=excluded.key_benefits, use_cases=excluded.use_cases,
    target_audience=excluded.target_audience, ai_title=excluded.ai_title, ai_description=excluded.ai_description,
    ai_version=excluded.ai_version, ai_generated_at=excluded.ai_generated_at, ai_model=excluded.ai_model;

  insert into public.product_packaging as t
    (product_id, box_length_mm, box_width_mm, box_height_mm, box_weight_kg, box_length_cm, box_width_cm,
     box_height_cm, box_volume_cm3, box_quantity, box_inner_quantity, packing_type, repacking_type,
     packaging_material, packaging_color, packaging_finish, packaging_context, has_inner_cradle, cradle_material,
     packing_classification, repacking_classification, has_commercial_packaging, has_optional_packaging,
     optional_packaging_ref, description_packaging_info, box_image, has_gift_box)
  select p.id, p.box_length_mm, p.box_width_mm, p.box_height_mm, p.box_weight_kg, p.box_length_cm, p.box_width_cm,
         p.box_height_cm, p.box_volume_cm3, p.box_quantity, p.box_inner_quantity, p.packing_type, p.repacking_type,
         p.packaging_material, p.packaging_color, p.packaging_finish, p.packaging_context, p.has_inner_cradle, p.cradle_material,
         p.packing_classification, p.repacking_classification, p.has_commercial_packaging, p.has_optional_packaging,
         p.optional_packaging_ref, p.description_packaging_info, p.box_image, p.has_gift_box
  from public.products p
  where p_product_id is null or p.id = p_product_id
  on conflict (product_id) do update set
    box_length_mm=excluded.box_length_mm, box_width_mm=excluded.box_width_mm, box_height_mm=excluded.box_height_mm,
    box_weight_kg=excluded.box_weight_kg, box_length_cm=excluded.box_length_cm, box_width_cm=excluded.box_width_cm,
    box_height_cm=excluded.box_height_cm, box_volume_cm3=excluded.box_volume_cm3, box_quantity=excluded.box_quantity,
    box_inner_quantity=excluded.box_inner_quantity, packing_type=excluded.packing_type, repacking_type=excluded.repacking_type,
    packaging_material=excluded.packaging_material, packaging_color=excluded.packaging_color, packaging_finish=excluded.packaging_finish,
    packaging_context=excluded.packaging_context, has_inner_cradle=excluded.has_inner_cradle, cradle_material=excluded.cradle_material,
    packing_classification=excluded.packing_classification, repacking_classification=excluded.repacking_classification,
    has_commercial_packaging=excluded.has_commercial_packaging, has_optional_packaging=excluded.has_optional_packaging,
    optional_packaging_ref=excluded.optional_packaging_ref, description_packaging_info=excluded.description_packaging_info,
    box_image=excluded.box_image, has_gift_box=excluded.has_gift_box;
end;
$$;

comment on function public.fn_refresh_product_satellites(uuid)
  is 'Re-sincroniza os satelites (product_seo/ai/packaging) a partir de products. NULL = todos; ou um product_id. Chamar pos-promote/bulk.';;
