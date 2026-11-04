-- Issue #339 — Colunas de personalização ausentes (persistência silenciosa)
-- Todas as operações são aditivas, nullable ou com default, e idempotentes.

-- 1) product_component_locations — imagem da área + área máxima
alter table public.product_component_locations
  add column if not exists area_image_url text,
  add column if not exists max_area_cm2 numeric;

-- 2) product_component_location_techniques — técnica padrão
alter table public.product_component_location_techniques
  add column if not exists is_default boolean not null default false;

-- 3) product_group_locations — imagem da área (grupo já tem max_area_cm2)
alter table public.product_group_locations
  add column if not exists area_image_url text;

-- 4) product_group_components — flag de personalizável
alter table public.product_group_components
  add column if not exists is_personalizable boolean not null default true;

-- 5) product_group_location_techniques — técnica padrão
alter table public.product_group_location_techniques
  add column if not exists is_default boolean not null default false;
