-- Bootstrap the public relations that were originally created out-of-band and
-- are required by 20260512000000_bootstrap_missing_application_schemas.sql.
-- This migration is intentionally idempotent: on the canonical database all
-- relations already exist, while a clean Supabase Preview needs them before
-- the analytics/classification views are created.
-- Rollback: supabase/rollbacks/20260511235959_rollback.sql (documentary no-op;
-- these are canonical application relations and must not be dropped).

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 1 NOT NULL;

DO $bootstrap$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND conname = 'categories_level_check'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_level_check CHECK (level >= 1 AND level <= 10);
  END IF;
END
$bootstrap$;

CREATE TABLE IF NOT EXISTS public.material_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name varchar(200) NOT NULL,
  slug varchar(200) NOT NULL,
  description text,
  sort_order integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT check_sort_order_positive_mg CHECK (sort_order >= 0),
  CONSTRAINT material_groups_organization_id_name_key UNIQUE (organization_id, name),
  CONSTRAINT material_groups_organization_id_slug_key UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.material_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.material_groups(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL,
  description text,
  properties jsonb DEFAULT '{}'::jsonb,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT material_types_organization_id_slug_key UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.product_materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.material_types(id) ON DELETE CASCADE,
  part varchar(100),
  percentage numeric(5,2),
  notes text,
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT product_materials_percentage_check
    CHECK (percentage IS NULL OR percentage BETWEEN 0 AND 100),
  CONSTRAINT product_materials_product_material_unique UNIQUE (product_id, material_id),
  CONSTRAINT product_materials_organization_id_product_id_material_id_pa_key
    UNIQUE (organization_id, product_id, material_id, part)
);

CREATE TABLE IF NOT EXISTS public.product_category_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT product_category_assignments_product_id_category_id_key
    UNIQUE (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  color_id uuid REFERENCES public.color_variations(id) ON DELETE SET NULL,
  cloudflare_image_id varchar(100) NOT NULL UNIQUE,
  url_cdn text NOT NULL,
  filename varchar(255),
  file_size_bytes bigint,
  width_px integer,
  height_px integer,
  format varchar(20),
  image_type varchar(30) DEFAULT 'gallery' NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  applies_to_color boolean DEFAULT false,
  source_supplier varchar(50),
  url_original text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  image_type_id uuid DEFAULT '1590e144-e3f8-41e6-98f9-f4a25bae496d'::uuid NOT NULL,
  supplier_code varchar(50),
  alt_text text,
  title_text text,
  caption text,
  is_og_image boolean DEFAULT false,
  organization_id uuid DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid NOT NULL
    REFERENCES public.organizations(id),
  cf_sync_status text DEFAULT 'pending' NOT NULL,
  cf_uploaded_at timestamptz,
  cf_verified_at timestamptz,
  cf_check_attempts smallint DEFAULT 0 NOT NULL,
  cf_last_error text,
  cf_id_scheme text GENERATED ALWAYS AS (
    CASE
      WHEN cloudflare_image_id::text ~ '^xbz_site_' THEN 'hash_legacy'
      WHEN cloudflare_image_id::text ~ '-dup-|-leg-|--ref|-legacy$' THEN 'synthetic'
      WHEN cloudflare_image_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' THEN 'uuid'
      WHEN cloudflare_image_id::text ~ '-(main|gal-[0-9]+)$' THEN 'main_gal'
      WHEN cloudflare_image_id::text ~ '-d[0-9]+$' THEN 'detail_dn'
      WHEN cloudflare_image_id::text ~ '-[0-9]{4,}-[0-9]{9,}$|d[0-9]+-[0-9]{9,}$' THEN 'slug_ts'
      WHEN cloudflare_image_id::text ~ '_[0-9]' THEN 'legacy_cor'
      ELSE 'seq'
    END
  ) STORED,
  content_hash text,
  canonical_image_id uuid REFERENCES public.product_images(id) ON DELETE SET NULL,
  is_shared boolean DEFAULT false NOT NULL,
  r2_bucket text,
  r2_object_key text,
  last_modified_source text,
  deleted_at timestamptz,
  deleted_reason text,
  blurhash text,
  requires_signed_url boolean DEFAULT false NOT NULL,
  aspect_ratio numeric GENERATED ALWAYS AS (
    CASE
      WHEN height_px IS NOT NULL AND height_px > 0 AND width_px IS NOT NULL
        THEN round(width_px::numeric / height_px::numeric, 4)
      ELSE NULL::numeric
    END
  ) STORED,
  cf_last_checked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.supplier_branches (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT supplier_branches_pkey PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  branch_name varchar(100) NOT NULL,
  branch_code varchar(20),
  cnpj varchar(18),
  inscricao_estadual varchar(20),
  state_uf varchar(2) NOT NULL,
  city varchar(100),
  address text,
  tax_regime varchar(30) DEFAULT 'lucro_presumido',
  icms_internal_rate numeric(5,2),
  icms_interstate_rate numeric(5,2),
  default_cfop_internal varchar(4),
  default_cfop_interstate varchar(4),
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  default_cst varchar(3),
  default_pis_rate numeric(5,4),
  default_cofins_rate numeric(5,4),
  default_csosn varchar(4),
  default_cest varchar(7),
  default_operation_nature varchar(100),
  CONSTRAINT supplier_branches_supplier_id_branch_code_key UNIQUE (supplier_id, branch_code)
);

CREATE TABLE IF NOT EXISTS public.variant_supplier_sources (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT variant_stocks_pkey PRIMARY KEY,
  organization_id uuid NOT NULL,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  source varchar(50) DEFAULT 'manual',
  last_synced_at timestamptz,
  sync_status varchar(50) DEFAULT 'synced',
  sync_error text,
  updated_at timestamptz DEFAULT now(),
  next_quantity_1 integer,
  next_date_1 date,
  next_quantity_2 integer,
  next_date_2 date,
  next_quantity_3 integer,
  next_date_3 date,
  supplier_sku varchar(100),
  supplier_color_code varchar(50),
  supplier_color_name varchar(100),
  cost_price numeric(10,4),
  list_price numeric(10,4),
  cost_price_1 numeric(10,4),
  min_qty_1 integer,
  cost_price_2 numeric(10,4),
  min_qty_2 integer,
  cost_price_3 numeric(10,4),
  min_qty_3 integer,
  cost_price_4 numeric(10,4),
  min_qty_4 integer,
  cost_price_5 numeric(10,4),
  min_qty_5 integer,
  lead_time_days integer,
  min_order_qty integer DEFAULT 1,
  pack_quantity integer DEFAULT 1,
  sale_multiplier integer DEFAULT 1,
  is_preferred boolean DEFAULT false,
  priority integer DEFAULT 99,
  is_active boolean DEFAULT true,
  supplier_images jsonb DEFAULT '[]'::jsonb,
  supplier_videos jsonb DEFAULT '[]'::jsonb,
  supplier_thumbnail varchar(500),
  removed_from_api boolean DEFAULT false,
  removed_at timestamptz,
  raw_data jsonb,
  stock_main_warehouse integer DEFAULT 0 NOT NULL,
  stock_other_warehouses integer DEFAULT 0 NOT NULL,
  supplier_availability_status varchar(20),
  supplier_ipi_rate numeric(5,2),
  supplier_branch_id uuid REFERENCES public.supplier_branches(id),
  icms_rate numeric(5,2),
  pis_rate numeric(5,4),
  cofins_rate numeric(5,4),
  cfop varchar(4),
  csosn varchar(4),
  cest varchar(7),
  cst varchar(3),
  operation_nature varchar(100),
  price_updated_at timestamptz,
  next_quantity_4 integer,
  next_quantity_5 integer,
  next_quantity_6 integer,
  next_date_4 date,
  next_date_5 date,
  next_date_6 date,
  your_price numeric,
  CONSTRAINT variant_stocks_organization_id_variant_id_supplier_id_key
    UNIQUE (organization_id, variant_id, supplier_id),
  CONSTRAINT chk_vss_priority_positive CHECK (priority IS NULL OR priority > 0),
  CONSTRAINT chk_vss_quantity_positive CHECK (quantity IS NULL OR quantity >= 0),
  CONSTRAINT variant_stocks_quantity_check CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS public.stock_daily_summary (
  id bigint GENERATED ALWAYS AS IDENTITY
    (SEQUENCE NAME public.stock_daily_summary_id_seq) PRIMARY KEY,
  variant_supplier_source_id uuid NOT NULL
    REFERENCES public.variant_supplier_sources(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  supplier_branch_id uuid REFERENCES public.supplier_branches(id),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  stock_open integer,
  stock_close integer,
  stock_min integer,
  stock_max integer,
  net_change integer,
  units_depleted integer DEFAULT 0,
  units_restocked integer DEFAULT 0,
  restock_detected boolean DEFAULT false,
  restock_quantity integer DEFAULT 0,
  restock_count smallint DEFAULT 0,
  cost_price_open numeric(12,4),
  cost_price_close numeric(12,4),
  price_changed boolean DEFAULT false,
  sync_count smallint DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  restock_zero_to_positive boolean DEFAULT false NOT NULL
);

ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_supplier_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_daily_summary ENABLE ROW LEVEL SECURITY;
