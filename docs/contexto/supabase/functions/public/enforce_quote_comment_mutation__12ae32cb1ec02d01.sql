CREATE OR REPLACE FUNCTION public.enforce_quote_comment_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  parent_parent_id uuid;
BEGIN
  NEW.content := pg_catalog.btrim(NEW.content, E' \t\n\r\v\f' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := pg_catalog.statement_timestamp();
    NEW.updated_at := NEW.created_at;
    NEW.is_edited := false;
    IF NEW.parent_id IS NOT NULL THEN
      SELECT c.parent_id INTO parent_parent_id
      FROM public.quote_comments c
      WHERE c.id = NEW.parent_id AND c.quote_id = NEW.quote_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent comment is not visible in this quote'
          USING ERRCODE = '23503', CONSTRAINT = 'quote_comments_parent_quote_fkey';
      END IF;
      IF parent_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Replies must reference a root comment'
          USING ERRCODE = '23514', CONSTRAINT = 'quote_comments_root_parent_check';
      END IF;
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Comment identity, author, quote and thread cannot be changed'
        USING ERRCODE = '23514', CONSTRAINT = 'quote_comments_immutable_fields_check';
    END IF;
    NEW.updated_at := pg_catalog.statement_timestamp();
    NEW.is_edited := OLD.is_edited OR (NEW.content IS DISTINCT FROM OLD.content);
  END IF;
  RETURN NEW;
END;
$function$
