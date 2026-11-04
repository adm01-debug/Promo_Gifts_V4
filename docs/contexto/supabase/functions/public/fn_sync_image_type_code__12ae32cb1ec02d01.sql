CREATE OR REPLACE FUNCTION public.fn_sync_image_type_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_id   uuid;
BEGIN

  -- ================================================================
  -- INSERT: OLD é NULL — branch explícito evita dependência implícita
  -- Prioridade: image_type varchar > image_type_id (callers legados passam só varchar)
  -- ================================================================
  IF TG_OP = 'INSERT' THEN
    -- Caso feliz: trg_auto_classify_image já garantiu consistência → early exit
    SELECT id, code INTO v_id, v_code FROM image_types WHERE id = NEW.image_type_id;
    IF v_id IS NOT NULL AND v_code = NEW.image_type THEN
      RETURN NEW;
    END IF;

    -- Incoerentes: derivar image_type_id do varchar (varchar = intenção do caller)
    SELECT id, code INTO v_id, v_code
    FROM image_types WHERE lower(code) = lower(NEW.image_type);
    IF v_id IS NOT NULL THEN
      NEW.image_type_id := v_id;
      NEW.image_type    := v_code;  -- canonicalizar casing
    ELSIF v_code IS NOT NULL THEN
      -- image_type inválido mas image_type_id é válido → usar FK como fallback
      NEW.image_type := v_code;
    END IF;

    RETURN NEW;
  END IF;

  -- ================================================================
  -- UPDATE: OLD existe — sync bidirecional (comportamento original mantido)
  -- ================================================================
  IF NEW.image_type_id IS DISTINCT FROM OLD.image_type_id THEN
    -- FK mudou → derivar varchar do FK
    SELECT code INTO v_code FROM image_types WHERE id = NEW.image_type_id;
    IF v_code IS NOT NULL THEN
      NEW.image_type := v_code;
    END IF;

  ELSIF NEW.image_type IS DISTINCT FROM OLD.image_type THEN
    -- VARCHAR mudou → derivar FK do varchar (com canonicalização de casing)
    SELECT id, code INTO v_id, v_code
    FROM image_types WHERE lower(code) = lower(NEW.image_type);
    IF v_id IS NOT NULL THEN
      NEW.image_type_id := v_id;
      NEW.image_type    := v_code;
    ELSE
      -- image_type inválido no UPDATE → reverter para o que o FK diz
      SELECT code INTO v_code FROM image_types WHERE id = NEW.image_type_id;
      IF v_code IS NOT NULL THEN
        NEW.image_type := v_code;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
