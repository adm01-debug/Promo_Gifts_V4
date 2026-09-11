
-- BUG-NOTIF-SEARCH-VECTOR FIX (2026-06-23)
-- notificationService.ts usa textSearch('search_vector', ...) mas a coluna não existia.
-- Impacto: toda busca no painel de notificações retornava HTTP 400 do PostgREST.
-- Solução: GENERATED ALWAYS AS STORED (sem trigger; mantido automaticamente pelo PG).

ALTER TABLE public.workspace_notifications
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese', 
        coalesce(title, '') || ' ' || coalesce(message, '')
      )
    ) STORED;

-- Índice GIN para textSearch de alta performance
CREATE INDEX IF NOT EXISTS idx_workspace_notifications_search_vector
  ON public.workspace_notifications
  USING GIN (search_vector);

COMMENT ON COLUMN public.workspace_notifications.search_vector IS
  'tsvector gerado automaticamente de title + message. Mantido via GENERATED ALWAYS AS STORED. Criado em 2026-06-23 (BUG-NOTIF-SEARCH-VECTOR).';
;
