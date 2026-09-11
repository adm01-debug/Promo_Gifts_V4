
-- Forçar reload do schema cache do PostgREST
-- Necessário para que a função atualizada seja reconhecida
NOTIFY pgrst, 'reload schema';
;
