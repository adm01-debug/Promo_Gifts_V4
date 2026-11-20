# Regras de negócio — docs/pendencias

Fonte: `docs/AUDITORIA_PLANEJADO_NAO_EXECUTADO_2026-10-11.md` (decisões do PO registradas)

1. **Rotas públicas descontinuadas (RP-030)**: decisão PO 07/05/2026 — não restaurar rotas públicas por suposição; links mortos devem ser removidos (feito na #2547).
2. **quote_comments (decisão PO 20/11)**: vendedor e gerente comentam/respondem dentro do orçamento. Tabela + RLS + 4 policies + trigger. Raiz com respostas não exclui (RESTRICT). Exclusão física documentada.
3. **P06**: `v_products_public` e `v_system_health_dashboard` ficam SECURITY DEFINER (quebrariam catálogo/health no anon).
4. **Kit Maker**: personalização SEM preço calculado NÃO pode entrar como zero no total (KM2-117/119/146); revalidação de `sale_price`/`active` no servidor (KM2-133/135/139).
5. **Frete**: `maxWeight` da caixa precisa ser preenchido; `weight_g = 0` = peso desconhecido (KM2-099/138).
6. **Dados simulados**: selos/BI com `Math.random` não podem ser apresentados como reais (RP-021/042-044) — origem explícita ou remoção.
7. **LGPD**: `anonymize-user` existe; precisa de fluxo real (CD-058).
8. **Pacotes de aprovação #1/#2**: correções críticas de acesso escritas em setembro, pendentes de aplicação (A08 §10.2, A06 DB-068, A11 AQ-018).
