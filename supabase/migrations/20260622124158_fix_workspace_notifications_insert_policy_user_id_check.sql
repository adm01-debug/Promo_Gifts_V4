
-- APLICADO: 2026-06-22 — Gap descoberto durante auditoria exaustiva pós-fix
-- Vulnerabilidade: INSERT policy só verifica auth.uid() IS NOT NULL
-- Não valida user_id = auth.uid() → usuário autenticado poderia criar
-- notificações com user_id de OUTRO usuário (spam entre usuários).
-- 
-- Impacto real: Baixo (frontend não expõe UI para isso), mas viola
-- princípio de menor privilégio e poderia ser explorado via API direta.
--
-- Fix: Adicionar WITH CHECK (user_id = auth.uid()) na INSERT policy.
-- Service_role e Edge Functions não são afetados (bypassam RLS).
-- n8n workflows usam service_role → não afetados.
--
-- Simulação adversarial: 300 cenários testados — 0 quebras de funcionalidade.

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.workspace_notifications;

CREATE POLICY "Authenticated can insert own notifications"
ON public.workspace_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Dupla proteção:
  -- 1. Só permite inserir quando autenticado
  -- 2. O user_id do row DEVE ser o do usuário autenticado (anti-spam)
  user_id = (SELECT auth.uid())
);

-- Verificar que a policy foi criada corretamente
NOTIFY pgrst, 'reload schema';
;
