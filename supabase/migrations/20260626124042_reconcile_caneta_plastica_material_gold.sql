-- RECONCILIAÇÃO INTRA-OURO: produto ativo 'Caneta plástica' (cfdde88e) estava sem material no Ouro
-- relacional, apesar de evidencia convergente: Prata materials=["Plástico"] + nome "plástica".
-- Tipo canonico alvo: "Plástico Genérico" (e0a1a83e). Padrao canonico: part='corpo', percentage=100.
-- Append-only; sync trigger atualiza products.materials jsonb. Reversivel via log abaixo.
-- NAO e promocao em massa Prata->Ouro (strings crus da Prata sao nao-canonicos, 74% nao casam) —
-- e correcao pontual do unico produto ATIVO com fonte de material conhecida ausente no Ouro.

CREATE TABLE IF NOT EXISTS public.material_reconcile_log_20260626 (
  id bigserial PRIMARY KEY,
  product_id uuid NOT NULL,
  material_id uuid NOT NULL,
  motivo text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.material_reconcile_log_20260626(product_id, material_id, motivo)
SELECT 'cfdde88e-70fc-4e79-9b4c-73209b9253e4'::uuid, 'e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid,
       'Prata materials=[Plastico] + nome Caneta plastica -> Plastico Generico; produto ativo sem material no Ouro'
WHERE NOT EXISTS (
  SELECT 1 FROM product_materials
  WHERE product_id='cfdde88e-70fc-4e79-9b4c-73209b9253e4'::uuid
    AND material_id='e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid
);

INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, is_active)
SELECT mt.organization_id, 'cfdde88e-70fc-4e79-9b4c-73209b9253e4'::uuid, 'e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid, 'corpo', 100.00, true
FROM material_types mt
WHERE mt.id='e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid
ON CONFLICT (product_id, material_id) DO NOTHING;;
