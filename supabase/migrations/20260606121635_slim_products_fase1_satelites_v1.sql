-- FASE 1 (ADITIVA) do slim down de products: satelites por dominio.
-- products permanece intacto e como fonte de escrita ate a Fase 3.

-- 1) SEO
create table public.product_seo as
select id as product_id,
       meta_title, meta_description, meta_keywords,
       schema_json, canonical_url, robots_meta,
       seo_score, seo_last_audit_at, seo_issues,
       og_title, og_description, og_image_url
from public.products;
alter table public.product_seo add constraint product_seo_pkey primary key (product_id);
alter table public.product_seo add constraint product_seo_fk
  foreign key (product_id) references public.products(id) on delete cascade;
comment on table public.product_seo is
  'Satelite SEO de products (Fase 1 slim down, aditivo). Fonte de escrita ainda e products; sincronizar via fn_refresh_product_satellites. Remocao das colunas em products = Fase 3.';

-- 2) Conteudo gerado por IA
create table public.product_ai as
select id as product_id,
       ai_summary, key_benefits, use_cases, target_audience,
       ai_title, ai_description, ai_version, ai_generated_at, ai_model
from public.products;
alter table public.product_ai add constraint product_ai_pkey primary key (product_id);
alter table public.product_ai add constraint product_ai_fk
  foreign key (product_id) references public.products(id) on delete cascade;
comment on table public.product_ai is
  'Satelite de conteudo IA de products (Fase 1 slim down, aditivo).';

-- 3) Embalagem / logistica
create table public.product_packaging as
select id as product_id,
       box_length_mm, box_width_mm, box_height_mm, box_weight_kg,
       box_length_cm, box_width_cm, box_height_cm, box_volume_cm3,
       box_quantity, box_inner_quantity,
       packing_type, repacking_type,
       packaging_material, packaging_color, packaging_finish, packaging_context,
       has_inner_cradle, cradle_material,
       packing_classification, repacking_classification,
       has_commercial_packaging, has_optional_packaging, optional_packaging_ref,
       description_packaging_info, box_image, has_gift_box
from public.products;
alter table public.product_packaging add constraint product_packaging_pkey primary key (product_id);
alter table public.product_packaging add constraint product_packaging_fk
  foreign key (product_id) references public.products(id) on delete cascade;
comment on table public.product_packaging is
  'Satelite de embalagem/logistica de products (Fase 1 slim down, aditivo).';;
