# Magazine — pacote RPC forward-only preparado

Data: 09/09/2026. Estado: **preparado e testado em PostgreSQL 17 descartável; não aplicado**.

Este pacote atende à autorização do PO para preparar operações atômicas de Magazine. Ele não cria tabelas, não altera colunas, não apaga dados e não foi executado no projeto canônico `doufsxqlfjyuvxuezpln`.

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

## Sequência de rollout futuro

1. Repetir o dry-run PostgreSQL 17 já aprovado quando o pacote mudar.
2. Testar owner, admin, terceiro autenticado, `anon`, revista publicada/arquivada, IDs inválidos, lotes-limite e concorrência real em duas conexões.
3. Conferir assinaturas e ACLs via `pg_catalog`.
4. Obter autorização explícita do PO para aplicação no canônico.
5. Aplicar as cinco migrations na ordem dos timestamps.
6. Validar funções e grants; só então habilitar o cliente RPC-first.
7. Manter o caminho legado disponível durante a janela de observação e removê-lo em mudança separada.

## Reversão

Como as migrations apenas adicionam/substituem funções, uma reversão eventual deve ser uma nova migration forward-only que revogue o uso e substitua as funções por versões corrigidas. Não usar rollback destrutivo nem apagar tabelas/colunas. A desativação do caller no frontend é o primeiro mecanismo de contenção.

## Verificação local

```bash
npx vitest run tests/magazine/magazine-forward-only-rpcs.test.ts
npm run typecheck
node scripts/validate-supabase-config.mjs
```

Além do teste estático, as cinco funções foram compiladas contra o schema mínimo em `tests/magazine/sql/magazine_rpc_schema.sql`, e `magazine_rpc_scenarios.sql` terminou com `MAGAZINE_RPC_SCENARIOS_OK`. O banco e o container foram descartados após o teste. Isso ainda não substitui homologação no schema completo nem autoriza produção.
