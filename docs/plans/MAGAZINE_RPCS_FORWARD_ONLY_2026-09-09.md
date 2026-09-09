# Magazine — pacote RPC forward-only aplicado e validado

Data: 09/09/2026. Estado: **aplicado no Supabase canônico e validado independentemente**.

Este pacote atende à autorização posterior do PO para aplicar as operações atômicas de Magazine. Ele não cria tabelas, não altera colunas e não apaga dados. As cinco funções iniciais foram aplicadas em uma transação no projeto canônico `doufsxqlfjyuvxuezpln` pelo run [34393079315](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34393079315). As revisões exigiram quatro substituições de definição e a publicação atômica; tudo foi entregue exclusivamente por cinco migrations posteriores nos runs [34395700558](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34395700558), [34397795301](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34397795301) e [34399151305](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34399151305), sem reescrever o histórico aplicado.

## Inventário

| Migration                                            | RPC                               | Contrato                                                                        |
| ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `20260909181000_magazine_add_items_atomic.sql`       | `magazine_add_items_atomic`       | Adição deduplicada, lote 1–500, snapshot obrigatório, lock e CAS.               |
| `20260909181100_magazine_remove_items_atomic.sql`    | `magazine_remove_items_atomic`    | Remoção de conjunto completo, IDs únicos, lock e CAS.                           |
| `20260909181200_magazine_reorder_items_atomic.sql`   | `magazine_reorder_items_atomic`   | Exige permutação completa dos itens e grava posições numa transação.            |
| `20260909181300_magazine_duplicate_atomic.sql`       | `magazine_duplicate_atomic`       | Copia cabeçalho e itens; a cópia nasce como rascunho sem token público.         |
| `20260909181400_magazine_update_metadata_atomic.sql` | `magazine_update_metadata_atomic` | Patch allowlisted e compare-and-swap por `updated_at`; não aceita status/token. |
| `20260909190000_magazine_duplicate_remap_page_order.sql` | `magazine_duplicate_atomic` | Remapeia IDs antigos para os itens clonados dentro do `page_order` v2. |
| `20260909190100_magazine_page_order_validation_null_safe.sql` | `magazine_update_metadata_atomic` | Rejeita campos obrigatórios ausentes/nulos e IDs repetidos no envelope v2. |
| `20260909190200_magazine_add_items_null_safe.sql` | `magazine_add_items_atomic` | Rejeita payload SQL nulo antes de avaliar comprimento ou avançar a revisão. |
| `20260909190300_magazine_publish_atomic.sql` | `magazine_publish_atomic` | Valida owner, requisitos, status e token do trigger dentro da mesma transação. |
| `20260909190400_magazine_page_order_numeric_version.sql` | `magazine_update_metadata_atomic` | Exige que o discriminador v2 seja o número JSON `2`, com validação null-safe. |

## Invariantes comuns

- `SECURITY DEFINER` com `search_path` fixo em `public, pg_temp`.
- `auth.uid()` obrigatório; somente owner ou `admin` pode operar.
- Mutação de conteúdo somente quando a revista está em `draft`.
- `REVOKE` de `PUBLIC` e `anon`; `EXECUTE` apenas para `authenticated` e `service_role`.
- Limites defensivos: até 500 itens por lote/revista e até 200 páginas estruturadas.
- Nenhum `DROP`, `TRUNCATE` ou `ALTER TABLE`.

## Concorrência simulada

1. Dois usuários carregam `updated_at=T0`.
2. A primeira operação adquire `FOR UPDATE`, valida `T0`, grava e gera `T1`.
3. A segunda operação adquire o lock depois, encontra `T1 != T0` e falha com conflito (`40001`) ou retorna `conflict=true` no patch de metadados.
4. O cliente deve recarregar, apresentar o conflito e nunca sobrescrever silenciosamente a edição vencedora.

## Execução canônica

1. Preflight canônico: zero das cinco funções e zero das cinco versões no histórico.
2. Aplicação: as cinco migrations e seus registros foram executados em uma única transação pela Management API, fixada no projeto canônico.
3. Postflight do executor: cinco funções, cinco versões e zero grants de execução para `anon`.
4. Validação independente pelo MCP oficial somente leitura: PostgreSQL 17.6, owner `postgres`, `SECURITY DEFINER`, `search_path=public, pg_temp`, retorno `jsonb`, assinaturas corretas e execução apenas para `authenticated` e `service_role`.
5. O linter canônico executado no mesmo run passou.
6. Revisão pós-aplicação: `magazine_items_position_unique` foi confirmada por `pg_catalog` como `DEFERRABLE INITIALLY DEFERRED`; a troca direta de posições é válida no canônico e no schema de teste.
7. Correções compensatórias: preflight com duas funções-base e zero versões corretivas; postflight com duas funções, duas versões e zero grants para `anon`.
8. Validação independente final: as versões `20260909190000` e `20260909190100` têm um statement cada; as definições live contêm o remapeamento `v_id_map` e a validação `IS DISTINCT FROM`, mantendo `SECURITY DEFINER`, `search_path` fixo e ACL mínima.
9. Correções finais: o run `34397795301` partiu de `base_add=1`, `publish=0`, zero versões e terminou com duas funções, duas versões e zero grants para `anon`.
10. O MCP oficial confirmou PostgreSQL 17.6, nove versões registradas, seis RPCs, guarda `p_items IS NULL`, publicação com `FOR UPDATE`, owner `postgres`, `SECURITY DEFINER` e grants somente para `authenticated`/`service_role`.
11. Discriminador v2: o run `34399151305` terminou com uma função, uma versão e `anon=0`; o MCP confirmou dez versões e os predicados numérico/null-safe na definição live.

## Próxima etapa de rollout

Os callers de `magazine_publish_atomic` e `magazine_duplicate_atomic` estão ativos. Os callers RPC-first de itens e metadata permanecem deliberadamente desligados; sua ativação deve ser uma mudança separada, com fallback durante a janela de observação, tratamento explícito de `40001`/conflito, teste autenticado e telemetria. O caminho legado só poderá ser removido depois dessa homologação.

## Reversão

Como as migrations apenas adicionam/substituem funções, uma reversão eventual deve ser uma nova migration forward-only que revogue o uso e substitua as funções por versões corrigidas. Não usar rollback destrutivo nem apagar tabelas/colunas. A desativação do caller no frontend é o primeiro mecanismo de contenção.

## Verificação local

```bash
npx vitest run tests/magazine/magazine-forward-only-rpcs.test.ts
npm run typecheck
node scripts/validate-supabase-config.mjs
```

Além do teste estático, as dez versões das seis funções foram compiladas em sequência contra PostgreSQL 17.6 e o schema mínimo em `tests/magazine/sql/magazine_rpc_schema.sql`; `magazine_rpc_scenarios.sql` terminou com `MAGAZINE_RPC_SCENARIOS_OK`. O cenário comprova troca de posições, payload nulo sem avanço de revisão, rejeição de página sem `kind`, versão v2 ausente/textual, remapeamento do item clonado e publicação atômica. O banco e o container foram descartados após o teste. A aplicação canônica foi autorizada e validada estruturalmente; mutações com dados reais de produção não foram executadas.
