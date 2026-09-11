-- Fecha a porta de fornecedor duplicado por CNPJ dentro da mesma organização.
-- NULLS NOT DISTINCT (PG17): dois suppliers órfãos de org com mesmo CNPJ também
-- colidem (validado em simulação: categorias I/J/K, 75/75).
-- Guard rail: aborta a migração se existir duplicata pré-existente.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.suppliers
    WHERE cnpj IS NOT NULL
    GROUP BY organization_id, cnpj
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ABORT: duplicatas (organization_id, cnpj) pre-existentes impedem o indice unico';
  END IF;
END $$;

CREATE UNIQUE INDEX suppliers_cnpj_org_uniq
  ON public.suppliers (organization_id, cnpj)
  NULLS NOT DISTINCT
  WHERE cnpj IS NOT NULL;;
