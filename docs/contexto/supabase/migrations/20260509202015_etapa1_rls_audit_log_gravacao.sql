-- ============================================================
-- Etapa 1 do plano de unificação: RLS em audit_log_gravacao
-- Banco: doufsxqlfjyuvxuezpln (Gestão de Produtos)
-- Aprovado: 2026-05-09
-- Padrão: idêntico a audit_log, system_changelog, *_log existentes
-- Reversível: SIM (vide bloco de rollback no fim do arquivo de doc)
-- ============================================================

-- 1. Revogar privilégios destrutivos não cobertos por RLS no Postgres
REVOKE TRUNCATE, DELETE, UPDATE ON public.audit_log_gravacao 
  FROM anon, authenticated;

-- 2. Habilitar RLS (sem FORCE — postgres precisa bypassar p/ triggers SECURITY DEFINER)
ALTER TABLE public.audit_log_gravacao ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT: vendedores autenticados podem ler (4 usuários internos)
CREATE POLICY audit_log_gravacao_read_authenticated 
  ON public.audit_log_gravacao
  FOR SELECT 
  TO authenticated
  USING (true);

-- 4. Policy INSERT: apenas service_role pela API REST
--    (triggers internos com SECURITY DEFINER bypassam RLS de qualquer jeito)
CREATE POLICY audit_log_gravacao_insert_service 
  ON public.audit_log_gravacao
  FOR INSERT 
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE public.audit_log_gravacao IS 
  'Audit log de mudanças em tabela_preco_gravacao_oficial e _faixa. RLS ativada em 2026-05-09 (Etapa 1 plano unificação). Triggers SECDEF bypassam RLS p/ INSERT.';
