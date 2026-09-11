
-- ══════════════════════════════════════════════════════════════
-- M1: COMMENT oficial na coluna products.name
-- Documenta: tipo, regras, triggers que tocam o campo,
-- origem por fornecedor e restrições de escrita
-- ══════════════════════════════════════════════════════════════
COMMENT ON COLUMN public.products.name IS
'Nome comercial do produto exibido no catálogo e na busca.
Tipo: text irrestrito · NOT NULL · sem default · posição ordinal 2.
Constraint: chk_products_name_not_empty (length(TRIM(name)) > 0).
Origem por fornecedor: XBZ→NomeProduto (avg 24 chars) · Spot→Name (avg 52 chars, max 183) · Asia→nome · Só Marcas→nome.
Higiene automática: trg_limpar_nome_produto (BEFORE INS/UPD) chama fn_display_product_name() apenas para Spot (UUID bcfc0d02-...) — preserva siglas (USB, LED, ABS, PVC, RPET…) e formata em Title Case.
Downstream do name (cascata de 8 triggers): slug · meta_title · meta_description · og_title · og_description · canonical_url · search_vector (Peso A) · capacity_ml · dimensions · weight_g · meta_keywords · category_id · materials.
Proteção manual: trg_aa_capture_manual_edits adiciona "name" a locked_fields quando write_source ≠ pipeline. 33% dos produtos têm name bloqueado.
NÃO confundir com product_variants.name que é UPPER(name) via fn_normalize_product_name (design intencional para variantes).
7 índices cobrem esta coluna: 1 GIN trigram (ilike/similarity) + 6 btree compostos (ordenação, paginação, filtros).';
;
