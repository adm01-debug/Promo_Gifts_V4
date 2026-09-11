
-- MELHORIA 4: 88 Brindes — pipeline inativo há 99 dias, 21 produtos todos inativos
-- Ação: desativar auto_sync para eliminar o alerta SUPPLIER_SYNC_STALE falso
-- (pipeline pode ser reativado manualmente quando a integração for reconfigurada)

UPDATE public.supplier_settings
SET 
  auto_sync_enabled = false
WHERE supplier_id = 'c3345743-aedf-4b31-a761-978b0d4aa79e';  -- 88 Brindes

-- Também atualizar o last_full_sync_at para refletir que não há sync ativo
-- (prevenindo alertas de SUPPLIER_SYNC_STALE para um pipeline conscientemente desligado)
UPDATE public.suppliers
SET last_full_sync_at = NULL
WHERE id = 'c3345743-aedf-4b31-a761-978b0d4aa79e';

-- Registrar motivo na tabela de configuração se houver campo de notes
-- (verificar se existe coluna notes/description em supplier_settings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='supplier_settings' AND column_name='notes'
  ) THEN
    UPDATE public.supplier_settings
    SET notes = 'Pipeline desativado em 2026-06-23 — último sync em 2026-03-16 (99 dias). 21 produtos todos inativos, sem imagens. Reativar quando pipeline 88Brindes for reconfigurado.'
    WHERE supplier_id = 'c3345743-aedf-4b31-a761-978b0d4aa79e';
  END IF;
END $$;
;
