
-- ============================================================
-- MIGRATION: comment_access_security_settings_gap_documentation
-- Objetivo : Documentar propósito, estado atual e gap de
--            implementação da tabela access_security_settings.
-- Data     : 2026-06-15
-- ============================================================

-- ----------------------------------------------------------
-- 1. COMENTÁRIO NA TABELA
-- ----------------------------------------------------------
COMMENT ON TABLE public.access_security_settings IS
'Singleton de configuracao de seguranca do sistema (sempre 1 linha).
Criada em 2026-05-24, provavelmente pelo Lovable ao montar o
painel admin de seguranca.

PROPOSITO: armazenar os parametros globais que controlam:
  • bloqueio por IP (ip_whitelist_enabled + tabela ip_whitelist)
  • bloqueio por cidade (city_whitelist_enabled + tabela city_whitelist)
  • bloqueio de localizacoes desconhecidas (block_unknown_locations)
  • lockout por tentativas falhas (max_failed_attempts + lockout_duration_minutes)
  • modo strict (strict_access_mode)

ESTADO ATUAL (2026-06-15): FEATURE INCOMPLETA
  • Frontend consegue ler e gravar esta tabela via RLS (admin/dev).
  • NENHUMA funcao Postgres le esses flags e age sobre eles.
  • Ou seja: mesmo que ip_whitelist_enabled = true, NADA e bloqueado.
  • A tabela e um cockpit sem motor.

ECOSSISTEMA RELACIONADO (tabelas irmas):
  • ip_whitelist             (0 linhas) — lista de IPs permitidos
  • city_whitelist           (0 linhas) — lista de cidades permitidas
  • access_blocked_log       (0 linhas) — log de acessos bloqueados
  • login_attempts           (1.240 linhas) — UNICA tabela ativa do ecosistema
  • auth_login_attempts      (0 linhas) — duplicata inativa de login_attempts
  • ip_access_control        (1 linha)  — controle adicional de IP
  • device_login_notifications (0 linhas)
  • security_settings        (0 linhas) — alternativa key-value, vazia
  • mcp_access_violations    (0 linhas)

PROXIMO PASSO: implementar fn_enforce_security_settings() e
fn_check_login_allowed(p_ip, p_user_id, p_city) que leiam
esta tabela e apliquem os bloqueios. Ver comentario de roadmap
nas colunas abaixo.

NAO ARQUIVAR / NAO DROPAR — tabela de feature incompleta, nao abandonada.';

-- ----------------------------------------------------------
-- 2. COMENTÁRIOS NAS COLUNAS
-- ----------------------------------------------------------
COMMENT ON COLUMN public.access_security_settings.id IS
'PK UUID singleton. Deve existir sempre exatamente 1 linha.
Sem significado de negocio — chave tecnica.';

COMMENT ON COLUMN public.access_security_settings.ip_whitelist_enabled IS
'Flag que DEVERIA ativar o bloqueio de IPs nao listados em ip_whitelist.
HOJE: lido pelo frontend (painel admin) mas NAO aplicado por nenhuma funcao.
ENFORCEMENT PENDENTE: fn_check_login_allowed() deve consultar este flag
e, se true, rejeitar IPs ausentes de ip_whitelist.';

COMMENT ON COLUMN public.access_security_settings.city_whitelist_enabled IS
'Flag que DEVERIA ativar o bloqueio de cidades nao listadas em city_whitelist.
HOJE: lido pelo frontend mas NAO aplicado por nenhuma funcao.
ENFORCEMENT PENDENTE: requer resolucao de IP → cidade (servico de geolocalizacao)
antes de consultar city_whitelist.';

COMMENT ON COLUMN public.access_security_settings.block_unknown_locations IS
'Flag que DEVERIA bloquear acessos de IPs sem localizacao identificavel.
HOJE: sem enforcement.
DEPENDENCIA: servico de geolocalizacao (ex: ip-api.com, MaxMind).';

COMMENT ON COLUMN public.access_security_settings.max_failed_attempts IS
'Numero maximo de tentativas de login falhas antes do lockout.
Default: 5. Valor atual: 5.
HOJE: login_attempts tem 1.240 linhas mas nada le este limite
e bloqueia o usuario apos atingi-lo.
ENFORCEMENT PENDENTE: fn_check_login_allowed() deve contar tentativas
recentes em login_attempts e bloquear se >= max_failed_attempts.';

COMMENT ON COLUMN public.access_security_settings.lockout_duration_minutes IS
'Duracao do lockout em minutos apos atingir max_failed_attempts.
Default schema: 15. Valor atual: 30 (ajustado manualmente na criacao).
HOJE: sem enforcement — nenhuma funcao le este valor e aplica cooldown.';

COMMENT ON COLUMN public.access_security_settings.strict_access_mode IS
'Modo estrito: quando true, DEVERIA exigir que o acesso passe por
TODOS os controles ativos simultaneamente (IP + cidade + lockout).
Quando false: cada controle seria independente.
HOJE: sem enforcement, sem definicao formal do comportamento exato.';

COMMENT ON COLUMN public.access_security_settings.created_at IS
'Timestamp de criacao do registro singleton. Valor: 2026-05-24.';

COMMENT ON COLUMN public.access_security_settings.updated_at IS
'Timestamp da ultima atualizacao. Igual a created_at — nunca foi
alterada desde a criacao. Sem trigger de auto-update.
PENDENCIA: adicionar trigger set_updated_at() para manter o campo
sincronizado automaticamente a cada UPDATE.';
;
