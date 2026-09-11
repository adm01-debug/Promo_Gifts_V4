
-- Adicionar v_products_public_test à allowlist antes do novo baseline
-- (é view de teste — não deve ser monitorada como objeto de produção)
INSERT INTO public.schema_signature_drift_allowlist (table_name, column_name, reason, added_by)
VALUES ('v_products_public_test', NULL,
  'View de teste criada pelo Lovable para staging de novos campos. Não é objeto de produção.',
  'claude-baseline-audit-20260627')
ON CONFLICT DO NOTHING;

-- Verificar resultado
SELECT table_name, reason FROM schema_signature_drift_allowlist;
;
