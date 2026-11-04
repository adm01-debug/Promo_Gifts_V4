-- Funções que referenciam tabelas inexistentes (quebradas) - drop seguro
DROP FUNCTION IF EXISTS calcular_preco_personalizacao(text, integer, integer);
DROP FUNCTION IF EXISTS fn_calcular_preco_personalizacao_v2(uuid, integer, integer, numeric, uuid);
DROP FUNCTION IF EXISTS fn_get_preco_personalizacao_v2(uuid, integer, uuid);
DROP FUNCTION IF EXISTS fn_get_preco_por_peca_personalizacao(varchar, integer, integer, uuid);
DROP FUNCTION IF EXISTS buscar_preco_por_variante(uuid);
