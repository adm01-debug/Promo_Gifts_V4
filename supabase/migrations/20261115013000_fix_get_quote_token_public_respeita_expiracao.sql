-- Rollback: supabase/rollbacks/20261115013000_rollback.sql
-- Achado do diagnóstico de segurança do banco em 2026-11-15 (get_advisors + leitura
-- das definições em pg_proc do canônico doufsxqlfjyuvxuezpln):
--
-- `public.get_quote_token_public(_token text)` é SECURITY DEFINER, executável por `anon`
-- (via /rest/v1/rpc/get_quote_token_public) e filtra APENAS por `token = _token`. Não
-- verifica `expires_at`. Resultado: um link de aprovação de orçamento já EXPIRADO continua
-- devolvendo os dados do token — entre eles `client_name` e `signer_name`.
--
-- A assimetria é o que denuncia o defeito: a função irmã `public.submit_quote_response`,
-- criada para o mesmo fluxo e também SECURITY DEFINER/anon, já filtra corretamente
-- (`status = 'active' AND (expires_at IS NULL OR expires_at > now()) AND responded_at IS NULL`).
-- Ou seja: com um link expirado NÃO se pode mais responder, mas ainda se pode LER. Uma das
-- duas está errada, e é a de leitura.
--
-- Dimensão real do risco, medida antes de escrever esta migration (não presumida):
--   - `select count(*) from public.quote_approval_tokens` = 0. A tabela está VAZIA: nenhum
--     dado de cliente está exposto hoje.
--   - A coluna `token` tem default `encode(gen_random_bytes(32), 'hex')` = 64 caracteres hex,
--     256 bits de entropia. Não é adivinhável nem enumerável; só quem recebeu o link acessa.
--   - A função já NÃO devolve os campos mais sensíveis da tabela: `client_email`,
--     `signer_document` (CPF/CNPJ), `signer_ip`, `signer_user_agent` e `signature_hash`
--     ficam fora do jsonb_build_object. Isso permanece intacto aqui.
--   - O fluxo nunca foi ligado: `grep -rn` em `src/` e `supabase/functions/` acha as duas
--     funções apenas em `src/integrations/supabase/types.ts` (arquivo gerado). Nenhum
--     componente, hook, rota ou edge function as chama — `QuoteApprovalCard.tsx` não faz
--     nenhuma chamada ao banco.
-- Portanto: defeito real, severidade baixa, corrigido antes do primeiro uso em produção.
--
-- Por que o filtro NÃO inclui `status`, embora a função irmã inclua:
--   `submit_quote_response` exige `status = 'active'` porque responder duas vezes não pode.
--   Leitura é diferente: depois de aprovar, `status` passa a 'responded' e o cliente precisa
--   continuar vendo o que aprovou ao reabrir o link. Exigir 'active' aqui quebraria essa tela
--   quando o fluxo for ligado. Não há CHECK constraint em `status` (confirmado em
--   pg_constraint: só pkey, unique(token) e a FK de seller_id), então também não invento um
--   status de revogação que o schema ainda não tem.
-- Diff mínimo: acrescenta uma condição de expiração, nada mais.

CREATE OR REPLACE FUNCTION public.get_quote_token_public(_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'id',             qat.id,
    'quote_id',       qat.quote_id,
    'token',          qat.token,
    'status',         qat.status,
    'expires_at',     qat.expires_at,
    'client_name',    qat.client_name,
    'viewed_at',      qat.viewed_at,
    'responded_at',   qat.responded_at,
    'response',       qat.response,
    'response_notes', qat.response_notes,
    'created_at',     qat.created_at,
    'signer_name',    qat.signer_name,
    'signed_at',      qat.signed_at
  )
  FROM public.quote_approval_tokens qat
  WHERE qat.token = _token
    -- GUARD: link expirado deixa de devolver dados. Espelha a condição de expiração que
    -- public.submit_quote_response já aplica. `expires_at IS NULL` segue aceito porque a
    -- coluna é nullable e o default (now() + 30 days) só vale para linhas novas.
    AND (qat.expires_at IS NULL OR qat.expires_at > now())
  LIMIT 1;
$function$;
