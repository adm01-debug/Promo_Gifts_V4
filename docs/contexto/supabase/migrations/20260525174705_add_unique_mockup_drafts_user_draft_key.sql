ALTER TABLE public.mockup_drafts
  ADD CONSTRAINT mockup_drafts_user_id_draft_key_key UNIQUE (user_id, draft_key);
