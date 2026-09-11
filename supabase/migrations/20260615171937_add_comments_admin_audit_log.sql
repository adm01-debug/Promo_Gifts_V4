
-- ============================================================
-- MIGRATION: add_comments_admin_audit_log
-- Adiciona comentários completos na tabela e em todas as colunas
-- para documentação permanente no Supabase Dashboard.
-- ============================================================

-- ── COMENTÁRIO DA TABELA ────────────────────────────────────

COMMENT ON TABLE public.admin_audit_log IS
$$LIVRO DE OCORRÊNCIAS ADMINISTRATIVAS — trilha imutável de ações de alto risco executadas por admins.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O QUE É
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Equivalente ao livro de ocorrências de segurança de um datacenter.
Registra SOMENTE eventos administrativos de alto risco: logouts forçados,
cutover de banco, hardening de segurança, bloqueio de rotas, revogação de
chaves MCP. NÃO é lugar para erros de frontend — esses vão para
frontend_telemetry.

Estado atual (2026-06-15): ~40 linhas. Normal. Saudável.
Tamanho: 88 KB (limite operacional esperado: < 5 MB).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUEM ESCREVE AQUI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Funções de backend autorizadas (todas SECURITY DEFINER):
  • log_audit(action, resource_type, resource_id, details)  → chamada genérica
  • log_user_logout(user_id)                               → logout forçado
  • log_access_denied(...)                                 → rota bloqueada
  • log_mcp_key_changes / audit_mcp_key_insert / _revoke   → ciclo de vida de chaves MCP
  • audit_mcp_api_keys_changes                             → trigger em mcp_sessions
  • audit_user_role_changes                                → trigger em user_roles
  • auto_block_extreme_offenders                           → bloqueio automático de IPs
  • force_user_logout                                      → admin expulsa sessão
  • record_dev_route_telemetry                             → acesso a rotas de dev
  • execute_role_migration_batch                           → migração de papéis em lote

NUNCA escrever diretamente via supabase.from('admin_audit_log').insert()
no frontend — RLS bloqueará se o usuário não for is_admin_or_above().

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RLS (ROW LEVEL SECURITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT → authenticated + is_admin_or_above(uid) + user_id = auth.uid()
SELECT → authenticated + can_view_audit_logs(uid)
UPDATE → BLOQUEADO (não existe policy)
DELETE → BLOQUEADO (não existe policy)
anon   → ZERO acesso

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALORES ESPERADOS EM `action`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  user.logout         → admin ou sistema expirou uma sessão
  user.login          → login administrativo registrado
  cutover             → troca de ambiente / migração crítica
  hardening           → operação de segurança aplicada
  route.access_denied → tentativa de acesso a rota restrita
  route.ux_event      → evento de UX em rota administrativa
  mcp_key_insert      → nova chave MCP criada
  mcp_key_revoke      → chave MCP revogada
  role_change         → papel de usuário alterado
  force_logout        → sessão encerrada à força por admin
  access_denied       → acesso negado (genérico)

SE APARECER `client_error` → BUG NO FRONTEND. Ver seção HISTÓRICO abaixo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COM QUEM CONVIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  frontend_telemetry  → AQUI vão os erros de frontend (React/JS).
                        Tem RLS para anon + authenticated.
                        Retenção: 30 dias via fn_cleanup_log_tables.

  mcp_sessions        → trigger audit_mcp_api_keys_changes escreve aqui
                        quando uma sessão MCP é criada/revogada.

  user_roles          → trigger audit_user_role_changes escreve aqui
                        quando um papel é alterado.

  login_attempts      → tabela irmã para tentativas de login (não aqui).

  bot_detection_log   → tabela irmã para detecção de bots (não aqui).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETENÇÃO E CLEANUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gerenciada por DUAS funções (redundância intencional):

  fn_cleanup_log_tables()      → roda TODO DOMINGO 03:00 (cron job 50)
    • action != 'client_error' → deleta rows com created_at > 90 dias
    • action = 'client_error'  → deleta rows com created_at > 7 dias

  cleanup_security_logs()      → roda TODO DIA 03:30 (cron job 21)
    • Mesma lógica 90d / 7d (belt + suspenders)

  clean_old_audit_logs(days)   → função manual para admins (parâmetro livre)

Esperado: < 500 rows em produção normal. Se > 5.000 rows → investigar
se o frontend está escrevendo client_error nesta tabela por engano.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMO RECUPERAR QUANDO TRAVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SINTOMA 1 — Tabela com > 10.000 rows de 'client_error':
  O frontend voltou a escrever aqui por engano (regressão em error-reporter.ts).
  SOLUÇÃO:
    DELETE FROM admin_audit_log WHERE action = 'client_error';
    VACUUM FULL admin_audit_log;
  E corrigir src/lib/error-reporter.ts → .from('frontend_telemetry')

SINTOMA 2 — INSERT falhando com "new row violates row-level security":
  O código chamante não é admin ou está passando user_id errado.
  SOLUÇÃO: chamar via SECURITY DEFINER function (log_audit), nunca direto.

SINTOMA 3 — Tabela ocupando > 500 MB:
  Cleanup não está rodando. Verificar:
    SELECT * FROM cron.job WHERE jobname IN ('cleanup-security-logs','cleanup-log-tables-weekly');
  Se inactive → SELECT cron.alter_job(job_id, active := true);

SINTOMA 4 — VACUUM FULL necessário (bloat > 20%):
  VACUUM FULL public.admin_audit_log;  -- requer lock breve (~40 rows = < 1s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HISTÓRICO DE CORREÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2026-06-15 — CORREÇÃO CRÍTICA (PR #774, commit b75607d):
  PROBLEMA: src/lib/error-reporter.ts enviava TODOS os erros React/JS para
  esta tabela com action='client_error'. Resultado: 42.946 linhas de ruído
  de desenvolvimento acumuladas (60 MB em uma tabela de auditoria).
  CAUSA RAIZ: erro de design — a tabela de audit foi usada como sink de
  telemetria de frontend porque era a mais acessível para usuários autenticados.
  SOLUÇÃO:
    1. DELETE 42.946 rows (action='client_error')
    2. VACUUM FULL → 60 MB → 88 KB
    3. error-reporter.ts redirecionado para frontend_telemetry
    4. Belt+suspenders: cleanup automático de client_error com 7 dias
    5. Retention de audit real harmonizada para 90 dias em ambas as funções
       (era 365 dias em cleanup_security_logs — conflito com fn_cleanup_log_tables)$$;


-- ── COMENTÁRIOS DAS COLUNAS ────────────────────────────────

COMMENT ON COLUMN public.admin_audit_log.id IS
'PK UUID gerado automaticamente (gen_random_uuid()). Imutável após INSERT.';

COMMENT ON COLUMN public.admin_audit_log.user_id IS
'FK → auth.users. Quem executou a ação. NOT NULL — toda ação tem um responsável.
RLS exige que user_id = auth.uid() no momento do INSERT (não pode logar em nome de outro).
Funções SECURITY DEFINER (log_audit, force_user_logout etc.) passam auth.uid() explicitamente.';

COMMENT ON COLUMN public.admin_audit_log.action IS
'Nome canônico da ação executada. Formato recomendado: "entidade.verbo" (ex: user.logout, mcp_key.revoke).
Valores esperados: user.logout | user.login | cutover | hardening | route.access_denied |
route.ux_event | mcp_key_insert | mcp_key_revoke | role_change | force_logout | access_denied.
SE APARECER "client_error" → regressão no frontend. Ver comentário da tabela para recuperação.';

COMMENT ON COLUMN public.admin_audit_log.resource_type IS
'Categoria do recurso afetado pela ação.
Exemplos: auth | route | database_consolidation | database_validation | mcp_key | user_role.
Serve para filtrar por domínio: WHERE resource_type = ''auth'' AND action = ''user.logout''.';

COMMENT ON COLUMN public.admin_audit_log.resource_id IS
'ID textual do objeto específico afetado (nullable).
Pode ser UUID, slug, nome de tabela, ou qualquer referência relevante.
Ex: o UUID do usuário deslogado, o nome da migration aplicada.';

COMMENT ON COLUMN public.admin_audit_log.details IS
'Contexto completo da ação em JSONB. Schema livre — cada action define sua estrutura.
Exemplos de campos comuns: { url, message, category, timestamp, userAgent, stack }.
Para user.logout: { reason, session_id, ip }.
Para mcp_key_revoke: { key_id, revoked_by, reason }.
Evitar dados sensíveis (senhas, tokens completos) — registrar apenas IDs e metadados.';

COMMENT ON COLUMN public.admin_audit_log.ip_address IS
'IP de origem da requisição (nullable — nem toda ação vem de HTTP).
Formato IPv4 ou IPv6. Usado por auto_block_extreme_offenders para cruzar com
login_attempts e ip_access_control. NULL em ações internas do banco (pg_cron, triggers).';

COMMENT ON COLUMN public.admin_audit_log.user_agent IS
'User-Agent do cliente HTTP (nullable). Max 200 chars (truncado na origem).
NULL em ações via pg_cron, Edge Functions sem header HTTP, ou triggers internos.';

COMMENT ON COLUMN public.admin_audit_log.created_at IS
'Timestamp de quando o registro foi criado (DEFAULT now(), NOT NULL).
Coluna primária para retenção: fn_cleanup_log_tables e cleanup_security_logs
deletam rows com created_at < NOW() - INTERVAL ''90 days'' (exceto client_error → 7 dias).
Indexada DESC para queries de auditoria recente: idx_admin_audit_log_created_at.';

COMMENT ON COLUMN public.admin_audit_log.request_id IS
'ID de correlação HTTP (nullable). Permite rastrear uma ação através de múltiplos logs
(Edge Function + banco + frontend) usando o mesmo request_id.
Quando presente, buscar o mesmo ID em frontend_telemetry para ver o contexto completo.';

COMMENT ON COLUMN public.admin_audit_log.started_at IS
'Início da operação (nullable). Preenchido quando a ação tem duração mensurável
(ex: uma migration que leva vários segundos). Difere de created_at: este é quando
o log foi gravado, started_at é quando a operação começou.';

COMMENT ON COLUMN public.admin_audit_log.finished_at IS
'Fim da operação (nullable). Usado junto com started_at para calcular duração real.
Se started_at preenchido e finished_at NULL → operação ainda em andamento ou travada.';

COMMENT ON COLUMN public.admin_audit_log.duration_ms IS
'Duração da operação em milissegundos (nullable, calculado pelo caller).
Atalho para duration_ms = EXTRACT(EPOCH FROM finished_at - started_at) * 1000.
Indexado indiretamente via idx_admin_audit_log_action para queries de performance.';

COMMENT ON COLUMN public.admin_audit_log.status IS
'Status final da operação (nullable). Valores típicos: ok | error | aborted | timeout.
NULL indica que a ação não tem conceito de status (ex: um evento de acesso negado
é registrado como fato, não tem "resultado").';

COMMENT ON COLUMN public.admin_audit_log.payload_summary IS
'Resumo compacto do payload para exibição rápida no dashboard (nullable JSONB).
Subconjunto de details — campos selecionados para query rápida sem precisar
parsear o JSONB completo de details. Ex: { action_count: 42, affected_table: "products" }.';

COMMENT ON COLUMN public.admin_audit_log.source IS
'Origem técnica do evento (nullable). Identifica qual subsistema gerou o log.
Exemplos: client.auth | dev-route-ui | frontend-guard | pg_trigger | edge-function.
Útil para filtrar eventos por camada: WHERE source = ''client.auth'' para ver
apenas eventos de autenticação originados no cliente.';
;
