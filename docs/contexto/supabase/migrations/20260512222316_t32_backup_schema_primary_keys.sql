-- T32: Add primary keys to 12 backup schema tables lacking them
-- Strategy:
--   • Tables with existing id column → promote to PK
--   • Tables with natural unique key → use it
--   • Tables with no unique column → add bigserial surrogate id

-- ── Tables with existing id column ──────────────────────────────────────────

ALTER TABLE backup._backup_20260425_tabela_preco_gravacao_oficial_faixa
  ADD CONSTRAINT backup_tabela_preco_faixa_pkey PRIMARY KEY (id);

ALTER TABLE backup._backup_collection_products_b2b_20260511
  ADD CONSTRAINT backup_collection_products_b2b_pkey PRIMARY KEY (id);

ALTER TABLE backup._backup_collections_b2b_20260511
  ADD CONSTRAINT backup_collections_b2b_pkey PRIMARY KEY (id);

ALTER TABLE backup._backup_storage_buckets_20260511_d11
  ADD CONSTRAINT backup_storage_buckets_d11_pkey PRIMARY KEY (id);

ALTER TABLE backup._backup_system_settings_legacy_20260511
  ADD CONSTRAINT backup_system_settings_legacy_pkey PRIMARY KEY (id);

ALTER TABLE backup._backup_unif_setup_fatmin_20260425
  ADD CONSTRAINT backup_unif_setup_fatmin_pkey PRIMARY KEY (id);

ALTER TABLE backup._backup_unif_setup_fatmin_faixa_20260425
  ADD CONSTRAINT backup_unif_setup_fatmin_faixa_pkey PRIMARY KEY (id);

-- ── Natural key ─────────────────────────────────────────────────────────────

ALTER TABLE backup._backup_20260425_tecnicas_gravacao
  ADD CONSTRAINT backup_tecnicas_gravacao_pkey PRIMARY KEY (codigo);

-- ── Surrogate id (no unique natural key) ────────────────────────────────────

ALTER TABLE backup._backup_collections_policies_b2b_20260511
  ADD COLUMN id bigserial PRIMARY KEY;

ALTER TABLE backup._backup_functions_d12
  ADD COLUMN id bigserial PRIMARY KEY;

ALTER TABLE backup._backup_storage_policies_20260511_d11
  ADD COLUMN id bigserial PRIMARY KEY;

ALTER TABLE backup._backup_unif_funcoes_20260425
  ADD COLUMN id bigserial PRIMARY KEY;
