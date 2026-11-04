-- MELHORIA 2/4: higiene de grants em discount_approval_audit (append-only de verdade).
-- O default do Supabase concedeu INSERT/UPDATE/DELETE/REFERENCES/TRIGGER a authenticated e anon.
-- A intenção original era SELECT-only p/ authenticated; escrita SOMENTE via trigger SECURITY DEFINER
-- fn_audit_discount_approval. Defesa-em-profundidade junto da RLS (WITH CHECK false / USING false).
-- Validado via dry-run: trigger definer segue criando auditoria; SELECT escopado intacto; escrita direta -> 42501.
-- anti-regressão (Lovable/Supabase defaults): NÃO reconceder escrita a authenticated/anon nesta tabela. fix_version=20260625_m2
REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.discount_approval_audit FROM authenticated;
REVOKE ALL ON public.discount_approval_audit FROM anon;
