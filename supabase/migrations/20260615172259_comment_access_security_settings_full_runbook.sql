
-- ============================================================
-- MIGRATION: comment_access_security_settings_full_runbook
-- Runbook completo para qualquer dev ou bot que abrir essa
-- tabela no Dashboard. Cobre: o que é, como funciona, com
-- quem convive, como recuperar quando trava, e o histórico
-- de bugs corrigidos.
-- Data: 2026-06-15
-- ============================================================

COMMENT ON TABLE public.access_security_settings IS
$doc$
╔══════════════════════════════════════════════════════════════════╗
║          PAINEL DE CONTROLE DE SEGURANÇA DE ACESSO              ║
╚══════════════════════════════════════════════════════════════════╝

SINGLETON: sempre exatamente 1 linha. Nunca inserir uma segunda.
ID fixo: c433f9b2-0176-4b92-b70c-20c85b66b590

━━━ O QUE É ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tabela de configuração global que define as regras de bloqueio de
login. Criada em 2026-05-24 (Lovable admin panel). Todos os flags
iniciam em FALSE — os controles existem mas precisam ser ativados
conscientemente.

━━━ COMO FUNCIONA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O frontend chama a Edge Function ANTES do supabase.auth.signIn():

  POST /functions/v1/check-login
    → fn_check_login_allowed(email, ip, cidade, user_agent)
        → lê ESTA TABELA (singleton)
        → [1] ip_whitelist_enabled?  → checa ip_whitelist
        → [2] city_whitelist_enabled? → checa city_whitelist
        → [3] sempre: conta falhas em login_attempts
               se >= max_failed_attempts dentro da janela
               de lockout_duration_minutes → bloqueia
        → registra bloqueios em access_blocked_log
    → retorna { allowed, reason, blocked_until, check_details }

━━━ COM QUEM CONVIVE (ecossistema completo) ━━━━━━━━━━━━━━━━━━━━━
  FUNÇÃO PRINCIPAL
    fn_check_login_allowed(text,text,text,text) — SECURITY DEFINER
    Lê esta tabela. Grants: authenticated + service_role.

  EDGE FUNCTION
    check-login (verify_jwt=false) — ponto de entrada do frontend.

  TABELAS FILHAS (populadas pelo admin antes de ativar os flags)
    ip_whitelist      → IPs autorizados (flag ip_whitelist_enabled)
    city_whitelist    → Cidades autorizadas (flag city_whitelist_enabled)

  TABELA DE HISTÓRICO
    login_attempts    → 1.240+ registros. Fonte da contagem de falhas.
                        Consultada por: fn_check_login_allowed,
                        check_login_rate_limit, check_auth_throttling,
                        detect_geo_violations, auto_block_extreme_offenders.

  TABELA DE LOG
    access_blocked_log → registra cada acesso bloqueado com motivo,
                         IP (ou 'unknown'), cidade e user-agent.

  ARQUIVADAS (não mais ativas)
    archive.auth_login_attempts → era a tabela de tentativas do
      sistema legado. Migrada para login_attempts em 2026-06-15.

━━━ COMO RECUPERAR QUANDO TRAVA (RUNBOOK) ━━━━━━━━━━━━━━━━━━━━━━

  CENÁRIO 1 — Usuário legítimo bloqueado por excesso de falhas:
    -- Ver quando o bloqueio expira:
    SELECT email, block_reason, created_at,
           created_at + INTERVAL '30 min' AS expira_em
    FROM access_blocked_log
    WHERE email = 'usuario@empresa.com'
    ORDER BY created_at DESC LIMIT 5;

    -- Limpar manualmente as tentativas falhas para desbloquear já:
    DELETE FROM login_attempts
    WHERE email = 'usuario@empresa.com'
      AND success = false;

  CENÁRIO 2 — IP legítimo bloqueado (whitelist ativa):
    -- Adicionar o IP na whitelist:
    INSERT INTO ip_whitelist (ip_address, label, is_active)
    VALUES ('200.x.x.x', 'IP do fulano', true);

    -- Ou desativar temporariamente a whitelist:
    UPDATE access_security_settings
    SET ip_whitelist_enabled = false;

  CENÁRIO 3 — Lockout acidental de TODOS os usuários
    (flag ativado com whitelist vazia):
    -- FAIL OPEN está implementado: whitelist vazia + flag ativo
    -- = não bloqueia ninguém. Mas se algo errar:
    UPDATE access_security_settings
    SET ip_whitelist_enabled   = false,
        city_whitelist_enabled  = false;

  CENÁRIO 4 — Aumentar tolerância de falhas emergencialmente:
    UPDATE access_security_settings
    SET max_failed_attempts      = 20,
        lockout_duration_minutes = 5;
    -- Lembrar de restaurar depois:
    -- SET max_failed_attempts = 5, lockout_duration_minutes = 30;

  CENÁRIO 5 — Ver tentativas recentes de um usuário:
    SELECT email, ip_address, success, failure_reason, created_at
    FROM login_attempts
    WHERE email = 'usuario@empresa.com'
    ORDER BY created_at DESC LIMIT 20;

━━━ BUGS CORRIGIDOS E POR QUÊ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BUG #1 — 2026-06-15 (descoberto em teste exaustivo)
    PROBLEMA: fn_check_login_allowed chamada sem p_ip_address (NULL)
      causava INSERT silencioso falho em access_blocked_log porque
      a coluna ip_address é NOT NULL nessa tabela.
      Resultado: bloqueios ocorriam mas NÃO eram registrados no log.
    CORREÇÃO: COALESCE(p_ip_address, 'unknown') antes de qualquer
      INSERT em access_blocked_log. Aplicado na v2 da função
      (migration: fix_fn_check_login_allowed_ip_address_coalesce).

  BUG #2 — 2026-05-24 (estado original da tabela)
    PROBLEMA: tabela existia mas NENHUMA função a lia ou aplicava
      seus valores. Era um "cockpit sem motor".
    CORREÇÃO: implementação completa do enforcement em 2026-06-15:
      fn_check_login_allowed + Edge Function check-login + hardening
      das tabelas ip_whitelist e city_whitelist.

━━━ ESTADO PADRÃO SEGURO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ip_whitelist_enabled     = false  → ativar só após popular ip_whitelist
  city_whitelist_enabled   = false  → ativar só após popular city_whitelist
  block_unknown_locations  = false  → requer serviço de geolocalização
  max_failed_attempts      = 5      → 5 tentativas antes do lockout
  lockout_duration_minutes = 30     → 30 minutos de bloqueio
  strict_access_mode       = false  → controles independentes (OR)

━━━ TRIGGER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  trg_access_security_settings_updated_at (BEFORE UPDATE)
  Usa fn_set_updated_at(). Adicionado em 2026-06-15.
$doc$;

-- ──────────────────────────────────────────────────────────────
-- COMENTÁRIOS NAS COLUNAS
-- ──────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.access_security_settings.id IS
$doc$
PK UUID da linha singleton.
Valor fixo: c433f9b2-0176-4b92-b70c-20c85b66b590
NUNCA inserir uma segunda linha. Se precisar resetar:
  UPDATE access_security_settings SET <campo> = <valor> WHERE id = 'c433f9b2-...';
$doc$;

COMMENT ON COLUMN public.access_security_settings.ip_whitelist_enabled IS
$doc$
Liga/desliga o bloqueio de IPs nao autorizados.

Quando TRUE:
  fn_check_login_allowed verifica se o IP esta em ip_whitelist (is_active=true).
  Se nao estiver → login bloqueado com reason='ip_not_whitelisted'.
  Se ip_whitelist estiver VAZIA → FAIL OPEN (nao bloqueia ninguem).

ANTES DE ATIVAR: popular a tabela ip_whitelist com os IPs autorizados.
Ativar com whitelist vazia e fail-open = inofensivo, mas inutil.

Relacionado com: ip_whitelist, access_blocked_log
$doc$;

COMMENT ON COLUMN public.access_security_settings.city_whitelist_enabled IS
$doc$
Liga/desliga o bloqueio de cidades nao autorizadas.

Quando TRUE:
  fn_check_login_allowed compara upper(p_city) com upper(city_whitelist.city_name).
  Se cidade nao estiver na lista → reason='city_not_whitelisted'.
  Se city_whitelist estiver VAZIA → FAIL OPEN.

DEPENDENCIA CRITICA: o chamador (Edge Function check-login) precisa
resolver IP → cidade via servico de geolocalizacao (ex: ip-api.com)
e passar p_city. Sem isso, p_city = NULL e o check e ignorado.

ANTES DE ATIVAR: popular city_whitelist + garantir que o frontend
esteja enviando o campo "city" para a Edge Function check-login.

Relacionado com: city_whitelist, access_blocked_log
$doc$;

COMMENT ON COLUMN public.access_security_settings.block_unknown_locations IS
$doc$
Bloqueia acessos de IPs sem localizacao identificavel.

STATUS ATUAL: flag existe mas logica de enforcement NAO implementada.
fn_check_login_allowed nao checa este flag (feature futura).

Para implementar: quando o servico de geolocalizacao falhar ou
retornar localizacao vazia, fn_check_login_allowed deve consultar
este flag e bloquear se TRUE.

Nao ativar ate o enforcement estar implementado.
$doc$;

COMMENT ON COLUMN public.access_security_settings.max_failed_attempts IS
$doc$
Numero maximo de tentativas de login falhas antes do lockout.

VALOR ATUAL: 5
DEFAULT SCHEMA: 5
MINIMO SEGURO (guard interno): 1 — fn_check_login_allowed usa
  GREATEST(COALESCE(max_failed_attempts, 5), 1) para evitar que
  zero ou NULL bloqueie todo mundo.

JANELA DE CONTAGEM: falhas dentro dos ultimos lockout_duration_minutes
  E posteriores ao ultimo login bem-sucedido do usuario.

AJUSTE EMERGENCIAL (mais tolerante):
  UPDATE access_security_settings SET max_failed_attempts = 20;
RESTAURAR:
  UPDATE access_security_settings SET max_failed_attempts = 5;

Relacionado com: login_attempts (coluna success=false)
$doc$;

COMMENT ON COLUMN public.access_security_settings.lockout_duration_minutes IS
$doc$
Duracao do lockout em minutos E janela de contagem de falhas.

VALOR ATUAL: 30 (ajustado manualmente na criacao — default schema era 15)
MINIMO SEGURO (guard interno): 1 — fn_check_login_allowed usa
  GREATEST(COALESCE(lockout_duration_minutes, 30), 1).

DUPLO PAPEL:
  1. Define por quantos minutos o usuario fica bloqueado apos atingir
     max_failed_attempts (blocked_until = ultima_falha + X minutos).
  2. Define a janela retroativa de contagem de falhas
     (so conta falhas dos ultimos X minutos).

EXEMPLO com valores atuais (5 falhas / 30 min):
  Usuario erra senha 5x em 29 minutos → bloqueado por 30 min.
  Usuario erra senha 5x ao longo de 31 minutos → NAO bloqueia
  (as primeiras falhas saem da janela).

COMO VER blocked_until de um usuario:
  SELECT * FROM fn_check_login_allowed('email@empresa.com');

Relacionado com: login_attempts, access_blocked_log
$doc$;

COMMENT ON COLUMN public.access_security_settings.strict_access_mode IS
$doc$
Define como os controles de whitelist interagem entre si.

FALSE (atual): cada controle e independente. Se ip_whitelist_enabled
  e city_whitelist_enabled estiverem ambos ativos, o usuario precisa
  passar EM AMBOS para ser liberado.
  (na implementacao atual: ip e verificado primeiro, city depois —
  se ip falhar, city nem e checado)

TRUE (futuro): comportamento explicitamente AND entre todos os
  controles ativos. Reservado para implementacao futura de
  logica mais granular.

STATUS ATUAL: flag presente mas sem comportamento diferenciado
na fn_check_login_allowed. Comportamento atual ja e AND implicito.
$doc$;

COMMENT ON COLUMN public.access_security_settings.created_at IS
$doc$
Timestamp de criacao do singleton. Valor: 2026-05-24 22:01:50 UTC.
Nunca muda. Apenas referencia historica.
$doc$;

COMMENT ON COLUMN public.access_security_settings.updated_at IS
$doc$
Timestamp da ultima atualizacao dos valores de configuracao.
Atualizado automaticamente pelo trigger:
  trg_access_security_settings_updated_at (BEFORE UPDATE)
  → fn_set_updated_at()

Util para auditar quando alguem mudou as configuracoes de seguranca.
Para ver quem mudou, cruzar com admin_audit_log (se implementado).
$doc$;
;
