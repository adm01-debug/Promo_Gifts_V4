-- Reviewed rollback only. Dropping this new resource removes all comments and replies.
-- Do not apply without a verified backup and explicit approval of that data loss.
DROP TABLE IF EXISTS public.quote_comments;
DROP FUNCTION IF EXISTS public.enforce_quote_comment_mutation();
