CREATE OR REPLACE FUNCTION public.fn_sync_novelty_expires_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- INSERT: se novelty_expires_at foi fornecido, propagar para is_new_expires_at
  IF TG_OP = 'INSERT' THEN
    IF NEW.novelty_expires_at IS NOT NULL AND NEW.is_new_expires_at IS NULL THEN
      NEW.is_new_expires_at := NEW.novelty_expires_at;
    ELSIF NEW.is_new_expires_at IS NOT NULL AND NEW.novelty_expires_at IS NULL THEN
      NEW.novelty_expires_at := NEW.is_new_expires_at;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: sincronização bidirecional
  IF TG_OP = 'UPDATE' THEN
    -- Se novelty_expires_at mudou, propaga para is_new_expires_at
    IF NEW.novelty_expires_at IS DISTINCT FROM OLD.novelty_expires_at THEN
      NEW.is_new_expires_at := NEW.novelty_expires_at;
    END IF;
    -- Se is_new_expires_at mudou E novelty não mudou → propaga inverso
    IF NEW.is_new_expires_at IS DISTINCT FROM OLD.is_new_expires_at
       AND NEW.novelty_expires_at IS NOT DISTINCT FROM OLD.novelty_expires_at THEN
      NEW.novelty_expires_at := NEW.is_new_expires_at;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$
