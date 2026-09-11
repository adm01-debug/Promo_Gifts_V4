-- ============================================================================
-- FIX (review Codex P2 #1, regressão real): o guard anterior, ao disparar em
-- UPDATE OF image_type, REVERTIA o texto a partir da FK — mas a UI do admin
-- (useProductImageGallery.updateExternalImageMeta) altera o TIPO setando só
-- image_type (texto), sem image_type_id. Isso fazia o save "ter sucesso" mas
-- não mudar a classificação (perda silenciosa).
--
-- Correção: torna fn_sync_image_type_code BIDIRECIONAL e mantém os dois campos
-- coerentes honrando a intenção:
--   - se image_type_id mudou      -> texto segue o id (FK explícita vence)
--   - se só o texto image_type mudou -> mapeia o texto de volta p/ o id (adota o
--     novo tipo). Texto inválido (sem code correspondente) é revertido p/ a FK
--     atual (sem drift, sem aceitar tipo inexistente).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_image_type_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_id   uuid;
BEGIN
  IF NEW.image_type_id IS DISTINCT FROM OLD.image_type_id THEN
    -- id alterado explicitamente: texto segue a FK
    SELECT code INTO v_code FROM image_types WHERE id = NEW.image_type_id;
    IF v_code IS NOT NULL THEN
      NEW.image_type := v_code;
    END IF;
  ELSIF NEW.image_type IS DISTINCT FROM OLD.image_type THEN
    -- só o texto mudou (ex.: UI do admin): mapeia de volta para o id
    SELECT id INTO v_id FROM image_types WHERE code = NEW.image_type;
    IF v_id IS NOT NULL THEN
      NEW.image_type_id := v_id;        -- adota o novo tipo (honra a mudança)
    ELSE
      -- texto sem code válido: mantém consistência com a FK atual
      SELECT code INTO v_code FROM image_types WHERE id = NEW.image_type_id;
      IF v_code IS NOT NULL THEN
        NEW.image_type := v_code;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;;
