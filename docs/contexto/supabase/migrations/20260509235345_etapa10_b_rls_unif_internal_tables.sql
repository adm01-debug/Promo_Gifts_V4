-- Habilitar RLS dev-only nas 2 tabelas internas de unificação
ALTER TABLE public._unif_pending_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._unif_settings_arquivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "_unif_pending_log_dev_only"
  ON public._unif_pending_log FOR ALL TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "_unif_settings_arquivo_dev_only"
  ON public._unif_settings_arquivo FOR ALL TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

COMMENT ON TABLE public._unif_pending_log IS
  'Tabela interna de log de unificação (decisões pendentes). RLS: dev only.';
COMMENT ON TABLE public._unif_settings_arquivo IS
  'Tabela interna de settings arquivadas. RLS: dev only.';
