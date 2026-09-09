# Magazine — pacote RPC forward-only aplicado e validado

Data: 09/09/2026. Estado: **aplicado no Supabase canônico e validado independentemente**.

Este pacote atende à autorização posterior do PO para aplicar as operações atômicas de Magazine. Ele não cria tabelas, não altera colunas e não apaga dados. As cinco funções foram aplicadas em uma transação no projeto canônico `doufsxqlfjyuvxuezpln` pelo run [34393079315](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34393079315).

## Inventário

| Migration                                            | RPC                               | Contrato                                                                        |
| ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `20260909181000_magazine_add_items_atomic.sql`       | `magazine_add_items_atomic`       | Adição deduplicada, lote 1–500, snapshot obrigatório, lock e CAS.               |
| `20260909181100_magazine_remove_items_atomic.sql`    | `magazine_remove_items_atomic`    | Remoção de conjunto completo, IDs únicos, lock e CAS.                           |
| `20260909181200_magazine_reorder_items_atomic.sql`   | `magazine_reorder_items_atomic`   | Exige permutação completa dos itens e grava posições numa transação.            |
| `20260909181300_magazine_duplicate_atomic.sql`       | `magazine_duplicate_atomic`       | Copia cabeçalho e itens; a cópia nasce como rascunho sem token público.         |
| `20260909181400_magazine_update_metadata_atomic.sql` | `magazine_update_metadata_atomic` | Patch allowlisted e compare-and-swap por `updated_at`; não aceita status/token. |

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

## Próxima etapa de rollout

O cliente RPC-first permanece deliberadamente desligado. Sua ativação deve ser uma mudança separada, com fallback durante a janela de observação, tratamento explícito de `40001`/conflito, teste autenticado e telemetria. O caminho legado só poderá ser removido depois dessa homologação.

## Reversão

Como as migrations apenas adicionam/substituem funções, uma reversão eventual deve ser uma nova migration forward-only que revogue o uso e substitua as funções por versões corrigidas. Não usar rollback destrutivo nem apagar tabelas/colunas. A desativação do caller no frontend é o primeiro mecanismo de contenção.

## Verificação local

```bash
npx vitest run tests/magazine/magazine-forward-only-rpcs.test.ts
npm run typecheck
node scripts/validate-supabase-config.mjs
```

Além do teste estático, as cinco funções foram compiladas contra o schema mínimo em `tests/magazine/sql/magazine_rpc_schema.sql`, e `magazine_rpc_scenarios.sql` terminou com `MAGAZINE_RPC_SCENARIOS_OK`. O banco e o container foram descartados após o teste. A aplicação canônica foi autorizada e validada estruturalmente; mutações com dados reais de produção não foram executadas.
