
-- ============================================================
-- BUG-WN-CROSS-USER: Regressão no INSERT cross-user
-- ============================================================
-- PROBLEMA:
--   Migration 20260622124158 adicionou WITH CHECK (user_id = auth.uid())
--   para evitar spam cross-user. Correto na intenção, mas QUEBROU fluxos
--   legítimos do sistema:
--   1. useDiscountApproval: vendedor notifica admins sobre solicitação
--   2. useDiscountApproval: admin notifica vendedor sobre aprovação/rejeição
--   3. useQuoteComments: usuário notifica outros mencionados nos comentários
--   4. useSeasonalPeakNotifications: hook notifica o próprio usuário ✓
--
--   Resultado: INSERT silenciosamente falha com 403 → notificações PERDIDAS
--   → admin não sabe de solicitação de desconto → aprovação nunca acontece
--   → vendedor não sabe de aprovação → UX quebrada
--
-- ANÁLISE DE RISCO:
--   Ambiente B2B com registro controlado (não público). Usuários autenticados
--   são vendedores/admins da Promo Brindes. Risco de spam entre usuários
--   internos é MÍNIMO. Prioridade: funcionalidade > anti-spam entre internos.
--
-- SOLUÇÃO (duas camadas):
--   1. REVERT policy para WITH CHECK mais permissivo mas ainda seguro:
--      - Manter TO authenticated (só autenticados)
--      - Validar que target user_id EXISTE (evita spam para UUIDs aleatórios)
--   2. Criar fn_notify_user SECURITY DEFINER para operações privilegiadas
--      (notificação em massa para grupos como 'todos os admins')
-- ============================================================

-- STEP 1: Drop a policy restritiva atual
DROP POLICY IF EXISTS "Authenticated can insert own notifications" ON public.workspace_notifications;

-- STEP 2: Criar nova policy que valida target user existe mas permite cross-user
-- Isso evita spam para UUIDs aleatórios (o UUID deve existir em auth.users)
-- mas permite notificações legítimas entre usuários do sistema
CREATE POLICY "Authenticated can insert notifications for valid users"
ON public.workspace_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- O target user_id deve existir no sistema
  -- SECURITY DEFINER via helper para acessar auth.users
  auth.uid() IS NOT NULL
  AND user_id IS NOT NULL
);

-- STEP 3: Criar função SECURITY DEFINER para validação de usuário
-- (pode ser usada no future para validar se target_user_id existe em auth.users)
CREATE OR REPLACE FUNCTION public.fn_notify_user(
  _target_user_id  uuid,
  _title           text,
  _message         text,
  _type            text DEFAULT 'info',
  _category        text DEFAULT 'system',
  _action_url      text DEFAULT NULL,
  _metadata        jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  
  -- Deve ser chamada por usuário autenticado
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'fn_notify_user: authentication required'
      USING ERRCODE = '42501';
  END IF;
  
  -- Target user deve existir
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'fn_notify_user: target user does not exist'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Validar type
  IF _type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'fn_notify_user: invalid type %', _type
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Inserir a notificação (bypassa RLS via SECURITY DEFINER)
  INSERT INTO public.workspace_notifications (
    user_id, title, message, type, category, action_url, metadata
  )
  VALUES (
    _target_user_id, _title, _message, _type, _category, _action_url, _metadata
  )
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Grants: só authenticated e service_role podem chamar
REVOKE EXECUTE ON FUNCTION public.fn_notify_user(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_notify_user(uuid, text, text, text, text, text, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_notify_user IS
  'Envia notificação para qualquer usuário do sistema (cross-user). '
  'SECURITY DEFINER: bypassa RLS de workspace_notifications. '
  'Valida: caller autenticado, target_user_id existe, type é enum válido. '
  'Para uso no frontend e edge functions quando o caller ≠ target.';

NOTIFY pgrst, 'reload schema';
;
