-- Limpar SELECT policies antigas que são subconjuntos das novas _public_read
-- Todas são PERMISSIVE. A nova USING(true) já cobre 100% dos casos.

-- tecnicas_gravacao: auth_read_tecnicas_gravacao (authenticated only) < tecnicas_gravacao_public_read (anon+auth)
DROP POLICY IF EXISTS auth_read_tecnicas_gravacao ON tecnicas_gravacao;

-- tabela_preco_gravacao_oficial_faixa: _authenticated_read < _public_read
DROP POLICY IF EXISTS tabela_preco_gravacao_oficial_faixa_authenticated_read ON tabela_preco_gravacao_oficial_faixa;

-- ramo_atividade: ra_select_authenticated (auth only) < ramo_atividade_public_read (anon+auth)
DROP POLICY IF EXISTS ra_select_authenticated ON ramo_atividade;

-- material_types: mt_select (auth.uid() filtered) < material_types_public_read (true)
DROP POLICY IF EXISTS mt_select ON material_types;

-- product_kit_components: _select (user_is_org_member) < _public_read (true)
DROP POLICY IF EXISTS product_kit_components_select ON product_kit_components;
