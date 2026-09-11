-- BUG #4 FIX: Configure parent_key_source for 88 Brindes, Asia Import, Só Marcas
-- CLEANUP: Remove test/junk rows (correct deletion order)
-- BUG #2 FIX: Register repo migration versions in schema_migrations

-- BUG #4: supplier_settings
INSERT INTO supplier_settings (supplier_id, parent_key_source, variant_name_template, sku_prefix)
VALUES ('c3345743-aedf-4b31-a761-978b0d4aa79e', 'ref_produto', '{product_name} | {color_name}', NULL)
ON CONFLICT (supplier_id) DO UPDATE SET
  parent_key_source = EXCLUDED.parent_key_source,
  variant_name_template = EXCLUDED.variant_name_template,
  updated_at = now();

UPDATE supplier_settings SET
  parent_key_source = 'referencia',
  variant_name_template = '{product_name} | {color_name}',
  updated_at = now()
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118';

INSERT INTO supplier_settings (supplier_id, parent_key_source, variant_name_template, sku_prefix)
VALUES ('841cd690-210a-422a-908c-7676828db272', 'codigo', '{product_name}', NULL)
ON CONFLICT (supplier_id) DO UPDATE SET
  parent_key_source = EXCLUDED.parent_key_source,
  variant_name_template = EXCLUDED.variant_name_template,
  updated_at = now();

-- CLEANUP: correct FK order
DELETE FROM produtos_padronizacao
WHERE id IN (
  '65b46917-289e-4706-866f-75d91dd28461',
  'cb1c2ce0-89a1-4e6c-af26-cdcaa3898be4',
  'ee9bdae0-232c-4804-b984-51dceda108a0'
);

DELETE FROM product_variants
WHERE product_id IN (
  'a92bd9ac-fa78-49c0-bdd5-cfd6517a4111',
  '742f2ee6-ae78-47f6-add1-dce6b973bb76'
);

DELETE FROM products
WHERE id IN (
  'a92bd9ac-fa78-49c0-bdd5-cfd6517a4111',
  '742f2ee6-ae78-47f6-add1-dce6b973bb76'
);

DELETE FROM supplier_products_raw
WHERE id IN (
  '00af777d-203c-428f-a4db-dfd33dad5c80',
  '1cbc9b30-df30-4300-8798-91c9524b5e6c',
  'c5efb5c7-6aa0-4438-86ab-65aea2d50ea3',
  '293434b5-8e96-47d5-8121-0c20d42a7791'
);

-- BUG #2: Register repo migration versions
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260604220000', 'fix_spot_name_cleaning'),
  ('20260604221000', 'fix_raw_v2_race_and_batch_spam')
ON CONFLICT (version) DO NOTHING;;
