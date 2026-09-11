
-- ============================================================
-- PEÇA 5: Hardening de ip_whitelist e city_whitelist
-- Objetivo: índices de performance, updated_at com trigger,
--           constraints de qualidade e comentários completos.
-- ============================================================

-- ----------------------------------------------------------
-- 5A: ip_whitelist — índice parcial para lookup ativo
-- (fn_check_login_allowed filtra WHERE is_active = true)
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_active_ip
  ON public.ip_whitelist (ip_address)
  WHERE is_active = true;

-- ----------------------------------------------------------
-- 5B: city_whitelist — índice parcial para lookup ativo
-- (fn_check_login_allowed filtra WHERE upper(city_name) = upper(p_city))
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_city_whitelist_active_city
  ON public.city_whitelist (upper(city_name))
  WHERE is_active = true;

-- ----------------------------------------------------------
-- 5C: updated_at em ip_whitelist
-- ----------------------------------------------------------
ALTER TABLE public.ip_whitelist
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER trg_ip_whitelist_updated_at
  BEFORE UPDATE ON public.ip_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ----------------------------------------------------------
-- 5D: updated_at em city_whitelist
-- ----------------------------------------------------------
ALTER TABLE public.city_whitelist
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER trg_city_whitelist_updated_at
  BEFORE UPDATE ON public.city_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ----------------------------------------------------------
-- 5E: Comentários em ip_whitelist
-- ----------------------------------------------------------
COMMENT ON TABLE public.ip_whitelist IS
'Lista de IPs autorizados para acesso ao sistema.
Consumida por fn_check_login_allowed() quando
access_security_settings.ip_whitelist_enabled = true.

REGRA: se esta tabela estiver VAZIA e o flag estiver ativo,
fn_check_login_allowed aplica FAIL OPEN (nao bloqueia ninguem)
para evitar lockout acidental de todos os usuarios.

Populate com os IPs fixos dos usuarios admin/dev antes
de ativar ip_whitelist_enabled = true na tabela
access_security_settings.

Indice parcial: idx_ip_whitelist_active_ip (is_active=true).
UNIQUE constraint em ip_address (ja existia).';

COMMENT ON COLUMN public.ip_whitelist.ip_address IS
'Endereco IP autorizado. Texto livre — suporta IPv4 e IPv6.
UNIQUE (um IP por linha). Exemplos: 189.28.10.5, 2001:db8::1.
Nao suporta notacao CIDR nativamente — um registro por IP.';

COMMENT ON COLUMN public.ip_whitelist.label IS
'Descricao legivel do IP. Ex: "Escritorio SP", "VPN Corporativa".
Ajuda o admin a identificar o IP no painel sem decorar numeros.';

COMMENT ON COLUMN public.ip_whitelist.is_active IS
'Flag de ativacao. false = IP ignorado pelo enforcement
(sem precisar remover o registro). Default: true.';

COMMENT ON COLUMN public.ip_whitelist.updated_at IS
'Atualizado automaticamente pelo trigger trg_ip_whitelist_updated_at.
Adicionado em 2026-06-15 (Peca 5 do enforcement de seguranca).';

-- ----------------------------------------------------------
-- 5F: Comentários em city_whitelist
-- ----------------------------------------------------------
COMMENT ON TABLE public.city_whitelist IS
'Lista de cidades autorizadas para acesso ao sistema.
Consumida por fn_check_login_allowed() quando
access_security_settings.city_whitelist_enabled = true.

DEPENDENCIA: requer resolucao de IP -> cidade antes de
chamar fn_check_login_allowed (p_city). Sem servico de
geolocalizacao (ex: ip-api.com), este controle fica inativo
mesmo com city_whitelist_enabled = true.

REGRA: tabela vazia + flag ativo = FAIL OPEN (nao bloqueia).
Comparacao case-insensitive: upper(city_name) = upper(p_city).

UNIQUE em (city_name, state, country_code) — ja existia.
Indice parcial: idx_city_whitelist_active_city.';

COMMENT ON COLUMN public.city_whitelist.city_name IS
'Nome da cidade autorizada. Comparacao case-insensitive
via upper() no indice e na fn_check_login_allowed.
Ex: "Sao Paulo", "Campinas", "Rio de Janeiro".';

COMMENT ON COLUMN public.city_whitelist.state IS
'UF do estado (opcional). Ex: SP, RJ, MG.
Usado apenas para identificacao — a comparacao em
fn_check_login_allowed usa so city_name.';

COMMENT ON COLUMN public.city_whitelist.country_code IS
'Codigo ISO 3166-1 alpha-2. Default: BR.
Permite futuro suporte multi-pais sem schema change.';

COMMENT ON COLUMN public.city_whitelist.is_active IS
'Flag de ativacao. false = cidade ignorada pelo enforcement.';

COMMENT ON COLUMN public.city_whitelist.updated_at IS
'Atualizado automaticamente pelo trigger trg_city_whitelist_updated_at.
Adicionado em 2026-06-15 (Peca 5 do enforcement de seguranca).';
;
