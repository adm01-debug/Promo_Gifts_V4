-- Adiciona 'api_oficial' ao CHECK constraint de source_channel
-- e também 'hg_products' e 'wc_store' que são usados pelo workflow ASIA
ALTER TABLE supplier_products_raw
  DROP CONSTRAINT chk_spr_source_channel;

ALTER TABLE supplier_products_raw
  ADD CONSTRAINT chk_spr_source_channel CHECK (
    source_channel = ANY (ARRAY[
      'n8n'::text,
      'file_upload'::text,
      'file_upload_retry'::text,
      'file_upload_fix'::text,
      'manual'::text,
      'api_direct'::text,
      'bitrix'::text,
      'mysql_sync'::text,
      'legacy'::text,
      'api_clientes'::text,
      'api_ruiz'::text,
      'api_carrinho'::text,
      'site_scraping'::text,
      'api_xml'::text,
      'api_rest'::text,
      'n8n_workflow'::text,
      'edge_function'::text,
      'api_oficial'::text,
      'hg_products'::text,
      'wc_store'::text
    ])
  );;
