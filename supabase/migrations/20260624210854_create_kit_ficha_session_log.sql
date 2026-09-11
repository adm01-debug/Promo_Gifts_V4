CREATE TABLE IF NOT EXISTS public.kit_ficha_session_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_sku text NOT NULL,
  acao text NOT NULL,                 -- 'decompose_inplace' | 'create_from_ficha'
  componentes_afetados int,
  is_kit_flipped boolean DEFAULT false,
  internal_code_usado text,
  executado_em timestamptz DEFAULT now(),
  revert_sql text
);
COMMENT ON TABLE public.kit_ficha_session_log IS
  'Auditoria da sessao de decomposicao/criacao de kits via ficha tecnica XBZ (medidas reais buscadas do Postgres). Base para revert reversivel.';;
