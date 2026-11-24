# Auditoria das PRs fechadas sem merge (2026-11-24)

As 23 PRs de agente fechadas **sem merge** foram conferidas contra `main`
(`a66bde92d`) para provar que nenhum trabalho ficou órfão. Regra do dono: só se
encerra PR/branch com certeza byte a byte do destino do código.

## Método

1. `gh pr diff <n>` → patch em `/tmp/pgv_audit/pr<n>.patch` (23 arquivos, 721 KB).
2. `git apply -R --check` contra `origin/main`:
   - aplica ao contrário → o conteúdo está **literalmente** na main (`=main`).
   - aplica para frente → o patch **não** está na main (checar se foi superado).
   - conflito → comparar linha a linha.
3. Para os conflitantes: cada linha `+` do patch foi procurada na versão da main
   do mesmo arquivo (`git show origin/main:<arquivo>`), normalizando espaços.
   Resultado por arquivo: `OK` / `PARCIAL` / `AUSENTE`.
4. Para os parciais, verificação de símbolo: a funcionalidade existe na main com
   outro nome de arquivo/função?

## Resultado

### A. Conteúdo idêntico na main (5)

| PR | Assunto |
| --- | --- |
| #3891 | recibo de migration no ledger |
| #3657 | consolidação de docs |
| #3655 | recibo curto |
| #3654 | recibo |
| #3652 | recibo |

`git apply -R --check` passa limpo nas cinco. Nada a recuperar.

### B. Trabalho recuperado na main sob outro nome (8)

| PR | Onde o trabalho vive hoje | Evidência |
| --- | --- | --- |
| #3788 | restauração de rascunho de orçamento | `src/components/quotes/QuoteDraftRecovery.tsx:13` cita a UI que a PR trazia; `src/hooks/quotes/restoredDraftBase.ts:13` cita `mergeRestoredBase` da #3788 |
| #3651 | análise de cor por área no mockup | `src/hooks/simulation/useLogoColorAnalysisByArea.ts:35` (`clearForArea`), usado em `src/hooks/mockup/useMockupGenerator.ts:128` e citado em `src/pages/mockups/MockupGenerator.tsx:340` |
| #3720 | P06 `security_invoker` | `supabase/migrations/20261117073000_p06_security_invoker_v_product_properties_public.sql` e `20261118172500_security_invoker_views_p06_parcial.sql` |
| #3968 | view `v_compras_catalogo` | `supabase/migrations/20261121163000_v_compras_catalogo.sql` |
| #3969 | views de preço de compras | `supabase/migrations/20261122100000_compras_views_canonicas.sql` (as duas views estão no contrato `.security/public-views-columns.json`) |
| #4003 | evidência do mapeamento de custo | `docs/qa/evidencia-compras-views.md`, com nota de recuperação para a main |
| #3927 | prazo de personalização + calendário | 5/5 arquivos com todas as linhas presentes na main |
| #3656 | E2E de estoque fora de PR | `.github/workflows/e2e-stock.yml` superou o patch: hoje só `schedule`/`dispatch`, sem trigger de PR |

### C. Premissa refutada ou decisão posterior superou (10)

| PR | Motivo (com prova) |
| --- | --- |
| #4004 | mascararia `supplier_reference`/`unit_cost`; quebra `GerarOrdem.tsx:274` e `pcp.price[i]`. Fechada por decisão; a exposição foi resolvida por revogação de grant em `20261124140000_*` e `20261124163000_*` |
| #4005 | idem #4004 para `v_compras_precos_faixa` |
| #4006 | revogaria grant de variantes; superada pela revogação aplicada em produção (`20261124140000_*`) |
| #4007 | gate de views; superada por `scripts/check-public-views-drift.mjs` com `has_table_privilege` + `.security/anon-select-allowlist.json` |
| #4009 | premissa "view pública de preço" refutada: `tabela_preco_gravacao_oficial_faixa` é legível por `anon` de propósito (medido: 952 linhas) |
| #3993 | ruído de round-trip de view/matview/policy resolvido declarativamente em `supabase/baseline/drift-allowlist.txt` (seção 2026-11-24), não em código |
| #3886 | marcada `[NÃO APLICAR]` pelo próprio autor (trigger de onboarding) |
| #3832 | só sync log divergente; migrations presentes |
| #3685 | idem (#3832/#3685 já cobertos pelo log consolidado) |
| #3683 | só linha de `package.json` divergente; o resto do CRM está na main |

## Conclusão

Nenhuma das 23 PRs fechadas sem merge deixou trabalho órfão: 5 estão literais na
main, 8 foram recuperadas sob outro arquivo e 10 tiveram premissa refutada ou
solução posterior. As branches correspondentes já estavam deletadas.

## Como refazer

```bash
for n in <lista>; do gh pr diff "$n" > /tmp/pgv_audit/pr$n.patch; done
cd <clone>; git fetch origin main
for f in /tmp/pgv_audit/*.patch; do git apply -R --check "$f" && echo "OK $f"; done
```
