# Auditoria — 8 Schemas Extras (além de `public`)

> Auditado em 2026-10-27 · Projeto `doufsxqlfjyuvxuezpln`  
> Fonte: `pg_catalog` (REGRA #8 corolário — nunca PostgREST/OpenAPI)  
> Critério de risco: RLS ausente + grants a `anon`/`authenticated` + USAGE no schema

---

## Resumo executivo

| Schema | Tabelas | Views | RLS | anon USAGE | auth USAGE | Risco |
|---|---|---|---|---|---|---|
| `api` | 0 | 0 | n/a | ✅ sim | ✅ sim | 🟢 Baixo — schema vazio |
| `analytics` | 0 | 0 | n/a | ✅ sim | ✅ sim | 🟢 Baixo — schema vazio |
| `internal` | 0 | 0 | n/a | ✅ sim | ✅ sim | 🟢 Baixo — sem funções expostas |
| `repack` | 0 | 2 | n/a | ❌ não | ❌ não | 🟢 Baixo — schema do sistema pg_repack |
| `cf_recon` | 6 | 7 | ✅ todos | ❌ não | ❌ não | 🟢 Limpo — RLS em todas as tabelas |
| `classification_audit` | 1 | 2 | ❌ nenhum | ❌ não | ❌ não | 🟢 Baixo — sem USAGE a anon/auth |
| `prod_audit` | 5 | 1 | ❌ nenhum | ❌ não | ❌ não | 🟢 Baixo — sem USAGE a anon/auth |
| `supplier_stricker` | 17 | 4 | ❌ nenhum | ❌ não | ❌ não | 🟡 **Médio** — SELECT grants em 13/17 tabelas + 4 views a `authenticated`, sem USAGE; uma linha de DDL expõe tudo |

---

## Detalhe por schema

### `api`
- Nenhuma tabela, nenhuma view, nenhuma função
- USAGE concedido a `anon` e `authenticated`
- **Ação:** nenhuma — schema vazio. Monitorar para garantir que permanece vazio ou recebe RLS quando populado.

---

### `analytics`
- Nenhuma tabela, nenhuma view, nenhuma função
- USAGE concedido a `anon` e `authenticated`
- **Ação:** nenhuma — schema vazio. Idem `api`.

---

### `internal`
- Nenhuma tabela, nenhuma view
- USAGE concedido a `anon` e `authenticated`
- Nenhuma função exposta via `search_path` a roles públicas (verificado via `pg_proc + pg_namespace`)
- **Ação:** nenhuma — USAGE existe mas sem objetos acessíveis.

---

### `repack`
- Schema do sistema criado pela extensão `pg_repack`
- 2 views de sistema, nenhuma tabela de dados
- Nenhum USAGE a `anon` ou `authenticated`
- **Ação:** nenhuma — infraestrutura de reorganização de tabelas, não acessível via PostgREST.

---

### `cf_recon`
- 6 tabelas, 7 views
- **RLS habilitado em todas as 6 tabelas** ✅
- Nenhum USAGE a `anon` ou `authenticated` — inacessível via PostgREST
- **Ação:** nenhuma — estado correto.

---

### `classification_audit`
- 1 tabela, 2 views
- Nenhum RLS nas tabelas/views
- Nenhum USAGE a `anon` ou `authenticated`
- Inacessível via PostgREST sem USAGE
- **Ação:** nenhuma urgente. Recomendado: se houver plano de expor via API, adicionar RLS antes de USAGE.

---

### `prod_audit`
- 5 tabelas, 1 view
- Nenhum RLS nas tabelas
- Nenhum USAGE a `anon` ou `authenticated`
- Inacessível via PostgREST sem USAGE
- **Ação:** nenhuma urgente. Mesma recomendação de `classification_audit`.

---

### `supplier_stricker` ⚠️ RISCO MÉDIO

**Estado atual:**
- 17 tabelas, 4 views
- **Nenhum RLS em nenhuma das 17 tabelas**
- USAGE **não concedido** a `anon` nem `authenticated` → inacessível via PostgREST hoje
- `authenticated` tem **SELECT** nas seguintes 13 tabelas:
  - `canceled_products`, `category_mappings`, `colors`, `customization_options`
  - `customization_tables`, `optionals`, `product_types`, `products`
  - `stg_optionals`, `stg_products`, `stg_stock`, `stocks`, `sync_log`
- `authenticated` tem SELECT nas 4 views também
- As 4 tabelas **sem** grant de SELECT: `config`, `failed_products`, `images`, `price_rules`

**Por que é risco médio:**
O bloco de grants `GRANT SELECT ON TABLE supplier_stricker.X TO authenticated` existe no banco.
Hoje esses grants são inofensivos porque `GRANT USAGE ON SCHEMA supplier_stricker TO authenticated`
não foi executado — PostgREST bloqueia na camada de schema antes de checar privilégios de tabela.
Mas:
1. Qualquer migration futura que adicione `GRANT USAGE ON SCHEMA supplier_stricker TO authenticated`
   (intencionalmente para expor dados de fornecedor) imediatamente expõe **todas** as 17 tabelas
   **sem RLS**, dando SELECT irrestrito a qualquer usuário autenticado.
2. Dados de fornecedor tipicamente contêm preços de custo, estoque bruto, condições comerciais —
   informação sensível que não deve ser exposta diretamente.

**Recomendação:**
Opção A (preferida): Adicionar RLS com policy `USING (false)` em todas as 17 tabelas agora, como
proteção de segurança-por-default. Quando uma tabela precisar ser exposta, a policy é substituída
por uma USING real.

Opção B: Manter sem RLS mas documentar explicitamente que `GRANT USAGE ON SCHEMA supplier_stricker`
é proibido sem aprovação do PO e adição simultânea de RLS.

**Tabelas afetadas para Opção A:**
```sql
-- 17 tabelas a receber ENABLE ROW LEVEL SECURITY + policy USING (false)
-- (não aplicar via execute_sql — criar migration, REGRA #8/E056)
-- Tabelas: canceled_products, category_mappings, colors, config, customization_options,
-- customization_tables, failed_products, images, optionals, price_rules, product_types,
-- products, stg_optionals, stg_products, stg_stock, stocks, sync_log
```

---

## Conclusão

7 dos 8 schemas não apresentam risco ativo. O único item de atenção é `supplier_stricker`:
grants de SELECT existem a `authenticated` mas schema USAGE não foi concedido — barrando
o acesso hoje. A proteção é frágil (uma linha de DDL a desfaz). Recomendado adicionar RLS
antes que qualquer USAGE seja concedido.

**Ação imediata:** nenhuma obrigatória — sistema está seguro agora.
**Ação preventiva:** criar migration com `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY deny_all ON supplier_stricker.X USING (false)` para todas as 17 tabelas (Opção A acima). Abrir como PR separado com aprovação do PO.
