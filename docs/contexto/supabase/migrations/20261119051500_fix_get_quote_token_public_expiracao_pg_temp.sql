-- Rollback: supabase/rollbacks/20261119051500_rollback.sql
--
-- SUPERA a migration 20261115013000_fix_get_quote_token_public_respeita_expiracao.sql,
-- que ficou MERGEADA E NUNCA APLICADA desde 2026-11-15. O motivo foi medido, não
-- suposto: ao despachá-la pelo `db-apply-migration.yml` (run 44461492894, 2026-11-19),
-- o preflight read-only reprovou com
--
--   [preflight-migration-apply] failed: 1 problema(s): SECURITY DEFINER sem "pg_temp"
--   no SET search_path em função "public.get_quote_token_public"
--
-- (regra E066, scripts/preflight-migration-apply.mjs:356-362). Ela usa
-- `SET search_path TO ''`, e a guarda exige `pg_temp` explícito no valor do SET.
-- Nada foi aplicado pela metade: o ledger segue sem a versão 20261115013000 e, antes
-- desta migration, `pg_get_functiondef` em produção ainda trazia o WHERE antigo.
--
-- A guarda está certa, e é esse o ponto da correção: `search_path = ''` NÃO desliga a
-- busca implícita em `pg_temp` para relações — o PostgreSQL a consulta primeiro, a menos
-- que `pg_temp` seja nomeado explicitamente, e aí vale a posição em que foi nomeado.
-- Numa função SECURITY DEFINER isso é vetor de shadowing. Aqui `pg_temp` passa a ser
-- nomeado por último, depois de `pg_catalog`.
--
-- O DEFEITO corrigido é o mesmo de 20261115013000, e continua real em produção hoje:
-- `public.get_quote_token_public(_token text)` é SECURITY DEFINER, executável por `anon`
-- via /rest/v1/rpc/, e filtra APENAS por `token = _token` — um link de aprovação de
-- orçamento já EXPIRADO segue devolvendo os dados do token, entre eles `client_name` e
-- `signer_name`. A função irmã `public.submit_quote_response`, do mesmo fluxo e também
-- SECURITY DEFINER/anon, já filtra expiração: com link vencido não se pode mais
-- responder, mas ainda se pode LER. A de leitura é a errada.
--
-- Dimensão do risco, medida contra o banco canônico antes desta migration:
--   - `select count(*) from public.quote_approval_tokens` = 0 — a tabela está vazia,
--     nenhum dado de cliente está exposto hoje; o vazamento começaria no 1º token emitido.
--   - `token` tem default `encode(gen_random_bytes(32),'hex')` = 256 bits: não é
--     enumerável, só o portador do link alcança.
--   - Os campos mais sensíveis da tabela (`client_email`, `signer_document`, `signer_ip`,
--     `signer_user_agent`, `signature_hash`) já ficam fora do jsonb_build_object, e
--     continuam fora aqui.
--
-- Por que o filtro NÃO inclui `status`, embora a função irmã inclua: `submit_quote_response`
-- exige `status = 'active'` porque responder duas vezes não pode. Leitura é diferente —
-- depois de aprovar, `status` vira 'responded' e o cliente precisa continuar vendo o que
-- aprovou ao reabrir o link. Exigir 'active' aqui quebraria essa tela.
--
-- Diff mínimo sobre a definição viva: uma condição de expiração e o search_path com pg_temp.

CREATE OR REPLACE FUNCTION public.get_quote_token_public(_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
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
    -- GUARD: link expirado deixa de devolver dados. Espelha a condição que
    -- public.submit_quote_response já aplica. `expires_at IS NULL` segue aceito porque a
    -- coluna é nullable e o default (now() + 30 days) só vale para linhas novas.
    AND (qat.expires_at IS NULL OR qat.expires_at > pg_catalog.now())
  LIMIT 1;
$function$
