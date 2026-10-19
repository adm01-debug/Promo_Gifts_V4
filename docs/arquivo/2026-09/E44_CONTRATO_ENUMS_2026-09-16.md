# E44 — Contrato de enums: teste de consistência `types.ts` ↔ union manual em `src/`

**Data:** 2026-09-16
**Etapa:** E44 (`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`, linhas 684-690)
**Classificação:** `[GIT]` — só repositório (teste novo). Nenhuma alteração de banco.
**Auditoria de schema:** feita via `mcp__supabase__execute_sql` contra `pg_catalog` (somente-leitura),
conforme REGRA #8 do `CLAUDE.md` — nunca via PostgREST/OpenAPI.

## Problema

O banco canônico (`doufsxqlfjyuvxuezpln`) tem 15 enums em `public`. Se um valor novo for
adicionado a um enum no banco sem atualizar o tipo TypeScript correspondente, um
`switch`/`if` no frontend pode deixar de tratar o caso novo **silenciosamente** — sem erro
de compilação, caso não exista um `default: assertNever(x)` exaustivo.

## 1. Os 15 enums e seus valores ao vivo

Consulta executada (`pg_catalog`, somente-leitura):

```sql
SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder)
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;
```

| # | Enum (`pg_type.typname`) | Nº de valores | Valores ao vivo |
|---|---|---|---|
| 1 | `app_role` | 7 | `dev, supervisor, admin, manager, agente, coordenador, vendedor` |
| 2 | `categoria_cor_enum` | 8 | `pantone, basica, institucional, especial, bordado, hot_stamping, serigrafia, sublimacao` |
| 3 | `conversation_event_type` | 6 | `text, image, audio, video, file, system` |
| 4 | `familia_cor_enum` | 15 | `amarelo, laranja, vermelho, coral, rosa, magenta, roxo, lilas, azul, ciano, verde, marrom, bege, neutro, metalico` |
| 5 | `magazine_reaction_kind` | 4 | `like, love, fire, idea` |
| 6 | `magazine_status` | 3 | `draft, published, archived` |
| 7 | `org_role` | 3 | `owner, admin, member` |
| 8 | `payment_status` | 5 | `pending, authorized, captured, refunded, failed` |
| 9 | `produtos_padronizacao_status` | 4 | `pending, standardized, rejected, promoted` |
| 10 | `role_migration_item_status` | 4 | `pending, success, failed, skipped` |
| 11 | `role_migration_status` | 5 | `pending, running, completed, failed, cancelled` |
| 12 | `silver_norm_status` | 6 | `raw, normalizing, normalized, validated, rejected, promoted` |
| 13 | `step_up_action` | 8 | `promote_dev, demote_dev, mcp_full_issue, mcp_full_escalate, secret_rotation, secret_revoke, mcp_key_revoke, mcp_key_rotate` |
| 14 | `supplier_raw_status` | 6 | `pending, processing, processed, failed, skipped, quarantined` |
| 15 | `tipo_cor_enum` | 6 | `solid, metalica, fluorescente, pastel, neon, especial` |

Todos os 15 batem exatamente (nomes, valores e ordem) com `Constants.public.Enums` em
`src/integrations/supabase/types.ts` (linhas ~64527-64633) no estado atual do repositório —
ou seja, `types.ts` está sincronizado com o banco ao vivo hoje. A sincronização
`types.ts` ↔ banco é responsabilidade de outro pipeline (regeneração de types), não desta etapa.

## 2. Union manual duplicada em `src/` (risco real)

Busca: `grep -rln` pelos 15 nomes de enum e, em seguida, pelos conjuntos de valores de cada
enum (para pegar unions manuais que não citam o nome do tipo do banco) em todo `src/`
(não só `src/types/` — nenhuma das 15 tem union manual dentro de `src/types/` especificamente).

**Resultado: 2 dos 15 enums têm union manual TypeScript duplicada fora do `types.ts` gerado:**

| Enum do banco | Union manual duplicada | Arquivo |
|---|---|---|
| `app_role` | `type AppRole = 'admin' \| 'agente' \| 'coordenador' \| 'dev' \| 'manager' \| 'supervisor' \| 'vendedor'` | `src/lib/roles.ts` |
| `step_up_action` | `type StepUpAction = 'demote_dev' \| 'mcp_full_escalate' \| 'mcp_full_issue' \| 'mcp_key_revoke' \| 'mcp_key_rotate' \| 'promote_dev' \| 'secret_revoke' \| 'secret_rotation'` | `src/hooks/auth/useStepUpAuth.ts` |

Ambas têm o mesmo *conjunto* de valores que o enum do banco hoje (ordem diferente, o que é
aceitável — union TS não impõe ordem).

Os outros 13 enums **não** têm union manual duplicada em `src/`: onde são usados no
frontend, o tipo é derivado diretamente de `Database['public']['Enums'][...]`
(ex.: `src/pages/admin/RolePermissionsPage.tsx`, `src/hooks/admin/useRoleMigration.ts`),
o que não é duplicação — é a fonte única (`types.ts`) sendo referenciada, então não há
risco de drift silencioso para esses 13.

Candidatos falsos descartados após inspeção (não são duplicação de nenhum dos 15 enums,
apenas coincidência de algum token de valor): `src/components/mockup/logo-editor/logoTechniqueFilters.ts`
(`Record<string, ...>` com chaves parciais de técnica, não union exaustiva),
`src/types/infrastructure/promobrind.ts` (`'fosco' | 'holografico' | 'metalico'`, domínio de
acabamento, não `tipo_cor_enum`/`familia_cor_enum`), `src/utils/colorSorting.ts`
(mapa de heurística de ordenação por nome livre de cor, não union tipada),
`src/components/pricing/simulator/upsell/upsell-engine.ts`,
`src/components/admin/security/keys/diagnostics/FullOpDiagnosticsPanel.tsx` e
`src/pages/admin/DevChallengeExamplesPage.tsx` (unions próprias sem relação com os 15 enums).

## 3. Teste novo

**Arquivo:** `tests/scripts/check-enum-contract.test.mjs`

- Importa `Constants` (valor em runtime, não faz parsing regex de `types.ts`) de
  `@/integrations/supabase/types`.
- Teste 1: confirma que `Constants.public.Enums` tem exatamente as 15 chaves esperadas,
  cada uma com a contagem de valores da tabela acima.
- Teste 2 e 3: para os 2 enums com union manual duplicada (`AppRole`, `StepUpAction`), lê o
  arquivo-fonte (`src/lib/roles.ts`, `src/hooks/auth/useStepUpAuth.ts`) via `node:fs`, extrai
  os literais string da declaração `type X = '...' | '...';` (union TS não existe em runtime,
  então não há como importar o tipo e inspecioná-lo como se faz com `Constants` — ler o
  literal do arquivo-fonte é a única forma de comparação em um teste que roda de verdade,
  já que `typecheck.enabled: false` em `vitest.config.ts` significa que um teste type-level
  nunca seria executado) e compara o conjunto contra `Constants.public.Enums.<nome>`.
- O topo do arquivo documenta explicitamente: garante consistência `types.ts` ↔ union manual,
  **não** `types.ts` ↔ banco ao vivo (isso é outro pipeline).

## 4. Execução

```
npx vitest run tests/scripts/check-enum-contract.test.mjs
```

Resultado: **3 testes, 3 passaram.**

Validação adicional (mutação manual, revertida em seguida): inserido um valor fictício
(`'new_role_not_in_db'`) na union `AppRole` em `src/lib/roles.ts` — o teste falhou como
esperado, confirmando que ele detecta drift de verdade e não é um "sempre-passa". Arquivo
restaurado ao estado original (`git diff --stat src/lib/roles.ts` vazio após a validação).

## Resumo

- 15/15 enums do banco mapeados e conferidos contra `Constants.public.Enums`.
- 2/15 enums (`app_role`, `step_up_action`) tinham union manual duplicada em `src/` — risco
  real de drift silencioso, agora coberto pelo teste novo.
- 13/15 enums só existem via `types.ts` gerado (referenciado diretamente, sem duplicação) —
  sem risco adicional para cobrir.
- Teste novo: `tests/scripts/check-enum-contract.test.mjs` — passa hoje (3/3).
