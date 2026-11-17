-- Restore scoped quote comments and one-level threads after explicit owner review.
-- Production application: db-apply-migration.yml only, after the requested owner review.
-- transaction: required
-- Status: prepared for review; not applied to production.
-- Rollback: supabase/rollbacks/20261110022404_rollback.sql
-- Guard: no existing comments table/function is replaced or silently reshaped.

-- soft-delete-exempt: REVIEW REQUIRED. Restore the original deleteComment CRUD contract with intentional hard DELETE.
-- The new RLS permits deletion only by the comment author while the quote is visible to that author.
-- ON DELETE RESTRICT protects parent comments with replies. Quote deletion cascades comments as documented.
-- This is a specific outside-list exception proposed for owner review before E15 production application.

CREATE TABLE public.quote_comments (
  id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  quote_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT quote_comments_pkey PRIMARY KEY (id),
  CONSTRAINT quote_comments_id_quote_id_key UNIQUE (id, quote_id),
  CONSTRAINT quote_comments_quote_id_fkey FOREIGN KEY (quote_id)
    REFERENCES public.quotes(id) ON DELETE CASCADE,
  CONSTRAINT quote_comments_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT quote_comments_parent_quote_fkey FOREIGN KEY (parent_id, quote_id)
    REFERENCES public.quote_comments(id, quote_id) ON DELETE RESTRICT,
  CONSTRAINT quote_comments_content_length_check
    CHECK (pg_catalog.char_length(pg_catalog.btrim(content)) BETWEEN 1 AND 5000),
  CONSTRAINT quote_comments_not_self_parent_check CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX quote_comments_quote_created_id_idx
  ON public.quote_comments (quote_id, created_at, id);
CREATE INDEX quote_comments_parent_quote_idx
  ON public.quote_comments (parent_id, quote_id) WHERE parent_id IS NOT NULL;
CREATE INDEX quote_comments_user_id_idx ON public.quote_comments (user_id);

ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_comments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.quote_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_comments TO authenticated;

-- The inner SELECT runs as the caller: the existing quotes RLS remains the
-- source of truth for organization membership, seller, creator and assignee.
CREATE POLICY quote_comments_select_visible_quote
  ON public.quote_comments FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_comments.quote_id)
  );

CREATE POLICY quote_comments_insert_own_visible_quote
  ON public.quote_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_comments.quote_id)
  );

CREATE POLICY quote_comments_update_own_visible_quote
  ON public.quote_comments FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_comments.quote_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_comments.quote_id)
  );

CREATE POLICY quote_comments_delete_own_visible_quote
  ON public.quote_comments FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_comments.quote_id)
  );

CREATE FUNCTION public.enforce_quote_comment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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
$function$;

REVOKE ALL ON FUNCTION public.enforce_quote_comment_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER quote_comments_enforce_mutation
BEFORE INSERT OR UPDATE ON public.quote_comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_comment_mutation();

COMMENT ON TABLE public.quote_comments IS
  'Quote-scoped internal comments. Visibility inherits quotes RLS; mutations require authorship. Root comments with replies cannot be deleted.';
