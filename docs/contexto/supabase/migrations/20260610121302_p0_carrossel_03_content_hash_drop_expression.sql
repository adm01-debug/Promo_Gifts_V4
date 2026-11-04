-- content_hash era GENERATED ALWAYS (hash cheio de raw_data) — impossibilitava
-- hash canônico com exclusão de campos voláteis (expressão gerada não pode ler
-- supplier_settings). Converte para coluna comum mantida por fn_spr_before_write,
-- que já calcula sha256(raw_data sem chaves '_%' e sem hash_excluded_fields).
ALTER TABLE public.supplier_products_raw
  ALTER COLUMN content_hash DROP EXPRESSION;

COMMENT ON COLUMN public.supplier_products_raw.content_hash IS
  'sha256 canônico do payload: raw_data sem chaves de metadado (prefixo _) e sem supplier_settings.hash_excluded_fields. Mantido por fn_spr_before_write (BEFORE INSERT/UPDATE). NÃO é mais coluna gerada.';
