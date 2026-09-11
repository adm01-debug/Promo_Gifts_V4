
-- MELHORIA 2: Habilitar RLS nas tabelas cf_recon (defesa em profundidade)
-- Ambas as tabelas são internas — acesso apenas via service_role

ALTER TABLE cf_recon.cf_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_recon.cf_ghost_check_queue ENABLE ROW LEVEL SECURITY;

-- Garantir que anon/authenticated não têm acesso direto
REVOKE ALL PRIVILEGES ON cf_recon.cf_image FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON cf_recon.cf_ghost_check_queue FROM anon, authenticated;

-- Garantir que service_role tem acesso completo
GRANT ALL PRIVILEGES ON cf_recon.cf_image TO service_role;
GRANT ALL PRIVILEGES ON cf_recon.cf_ghost_check_queue TO service_role;

-- Política implícita: sem políticas = ninguém acessa (exceto service_role via bypass)
-- Não criar políticas SELECT para anon/authenticated nessas tabelas internas
;
