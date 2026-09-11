-- fix_version: 2026-06-26 cost-leak-xbz-admin-view
-- ANTI-REGRESSAO (bot Lovable): vw_xbz_produtos_sem_imagem é view ADMINISTRATIVA de diagnóstico (produtos XBZ sem imagem).
-- Expõe p.cost_price cru e roda como OWNER (security_invoker OFF) => anon NAO pode ter SELECT.
-- Hoje está vazia, mas o vazamento é LATENTE. Se a view for recriada, RE-APLICAR este REVOKE.
REVOKE SELECT ON public.vw_xbz_produtos_sem_imagem FROM anon;

-- auto-validação: aborta a migração (rollback) se o estado final estiver errado
DO $$
BEGIN
  IF has_table_privilege('anon','public.vw_xbz_produtos_sem_imagem','SELECT') THEN
    RAISE EXCEPTION 'FALHA: anon ainda tem SELECT na view administrativa';
  END IF;
  IF NOT has_table_privilege('authenticated','public.vw_xbz_produtos_sem_imagem','SELECT') THEN
    RAISE EXCEPTION 'FALHA: authenticated perdeu SELECT indevidamente';
  END IF;
  IF NOT has_table_privilege('service_role','public.vw_xbz_produtos_sem_imagem','SELECT') THEN
    RAISE EXCEPTION 'FALHA: service_role perdeu SELECT indevidamente';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';;
