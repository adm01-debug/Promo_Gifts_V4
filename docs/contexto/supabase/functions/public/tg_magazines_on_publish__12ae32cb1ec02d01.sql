CREATE OR REPLACE FUNCTION public.tg_magazines_on_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  candidate_token TEXT;
  attempt INT := 0;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
    IF NEW.public_token IS NULL THEN
      LOOP
        candidate_token := encode(extensions.gen_random_bytes(24), 'hex');
        attempt := attempt + 1;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.magazines WHERE public_token = candidate_token)
          OR attempt >= 5; -- FIX M3: retry até 5x em colisão (na prática, nunca deve exceder 1)
      END LOOP;
      NEW.public_token := candidate_token;
    END IF;
  END IF;

  IF NEW.status = 'archived' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'archived') THEN
    NEW.archived_at := now();
  END IF;

  IF NEW.status = 'draft' AND TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    NEW.public_token := NULL;
  END IF;

  RETURN NEW;
END;
$function$
