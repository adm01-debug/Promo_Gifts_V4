# P09 — Investigação Ledger vs Repo (2026-11-08)

**Data:** 2026-11-08  
**Investigador:** Claude (sessão fc0c3cf5)  
**Banco:** `doufsxqlfjyuvxuezpln` (Gestão de Produtos)

---

## Resumo executivo

| Métrica | Valor |
|---------|-------|
| Arquivos em `supabase/migrations/` | 3.045 |
| Versões em `schema_migrations` (ledger DB) | 2.572 |
| **Gap (repo - ledger)** | **476** |
| Gap em outubro/2026 (ADENDO) | 464 |
| Variação desde outubro | +12 novas versões sem registro |

---

## Categorização do gap (amostragem)

### Categoria A — Genuinamente pendentes (criados, nunca aplicados ao DB)

Verificados via pg_catalog: objeto esperado **não existe** no banco.

| Versão | Arquivo | Objeto ausente na DB |
|--------|---------|---------------------|
| `20261013180500` | `20261013180500_incidente_2026_10_13_drop_tabelas_backup_vencidas.sql` | Marcado "PENDENTE DE APLICAÇÃO" no próprio arquivo; comentário confirma aguarda aprovação |
| `20261027195959` | `20261027195959_supplier_stricker_rls_deny_all.sql` | Política `deny_all` em `suppliers` não existe |
| `20261104100000` | `20261104100000_partitions_supplier_products_raw_history_2027.sql` | `supplier_products_raw_history_p2027_03` não existe |
| `20261108001500` | `20261108001500_reconcile_e2e_cleanup_audit.sql` | Operação de reconciliação do ledger; pendente aplicação via workflow |

### Categoria B — Aplicados via DDL/MCP sem registro no ledger

Verificados via pg_catalog: objeto esperado **existe** no banco mas versão não está em `schema_migrations`.

| Versão | Arquivo | Evidência de aplicação |
|--------|---------|------------------------|
| `20261022100020` | `20261022100020_fix_cron_dispatcher_failure_alert.sql` | Cron jobs existem com schedules modificados |
| `20261022100021` | `20261022100021_fix_cron_hash_product_images.sql` | Comportamento de cron de imagens alterado |
| `20261022100022` | `20261022100022_fix_cron_sync_is_stockout_universal.sql` | Sync de stockout funcional |
| `20261101220000` | `20261101220000_cron001_stagger_schedules.sql` | Cron de ruptura em schedule `'18 * * * *'` (não seria o default `'*/30 * * * *'`) |
| `20261101210000` | `20261101210000_sb0007_drop_noop_restrictive_policies.sql` | 0 políticas `rls_restrictive_*` com `qual='(true)'` no banco (migration de DROP foi aplicada) |

### Categoria C — Pré-Gate-1.13.3 (antes de 2026-09-16)

Versões mais antigas do gap que existem no repo mas nunca foram registradas no ledger porque o contrato `MIGRATIONS_SYNC_LOG.md` só foi estabelecido em 2026-09-16 (Etapa E48). Estas são histórico legítimo — não representam risco ativo.

**Exemplo do intervalo:**
```
20260511235900, 20260512000000, 20260525200106, 20260525232003,
20260526103000, 20260526120000, 20260526133316 ... (maioria do gap)
```

---

## Distribuição temporal do gap

| Período | Versões em gap | Categoria estimada |
|---------|---------------|---------------------|
| Antes de 2026-09-16 | ~440 | C (pré-Gate-1.13.3) |
| Set/2026 | ~6 | B (aplicados sem registro) |
| Out/2026 | ~18 | B + A |
| Nov/2026 | ~12 | A + B |

---

## Achado crítico — aplicações fora do fluxo autorizado

A amostragem confirma que **parte das migrações de outubro/novembro foi aplicada diretamente ao banco sem passar pelo workflow `db-apply-migration.yml`**, deixando a versão fora do ledger `schema_migrations`.

Isto viola REGRA #8 do projeto (E056) e é um drift estrutural:
- O banco está em um estado **mais avançado** do que o ledger indica
- Reverter o ledger para "pending" seria errado — o DDL já existe no banco
- Registrar como "applied" via `repair` seria também incorreto sem verificação

---

## O que é necessário para resolver P09

A resolução completa requer:

1. **Verificação sistemática** de cada uma das 476 versões via pg_catalog (8–16h de trabalho)
2. Para cada versão: determinar se o objeto existe na DB
3. Para versões aplicadas sem registro: `supabase migration repair --status applied <versão>` individualmente (NUNCA em lote)
4. Para versões pendentes: aplicar via `db-apply-migration.yml` ou documentar como descartadas
5. Atualizar `MIGRATIONS_SYNC_LOG.md` para cada versão reconciliada

**Custo mínimo estimado:** 1 sessão completa de 4–6h com acesso a MCP + aprovação do PO para cada `repair` DDL.

---

## Gap file gerado

`/tmp/gap_versions.txt` — 476 linhas, uma versão por linha, ordenadas.

```
# Primeiras 10 (mais antigas):
20260511235900
20260512000000
20260525200106
20260525232003
20260526103000
20260526120000
20260526133316
20260526134911
20260526135538
20260526135947

# Últimas 10 (mais recentes):
20261022203935
20261027195959
20261027220000
20261027230000
20261027233000
20261027234500
20261101150000 (pendente)
20261101194200
20261101202000
20261104100000 (pendente)
20261108001500 (pendente)
```

---

## Status P09

**Estado:** ⏸️ ADIADO — requer sessão dedicada + aprovação PO por operação de `repair`

**Risco imediato:** baixo — o banco funciona; o drift não causa erros operacionais.  
**Risco CI:** médio — gate `check-migrations-sync-log-gate.mjs` vai rejeitar PRs que tocam `supabase/migrations/` sem entrada correspondente no MIGRATIONS_SYNC_LOG.md, tornando mais difícil aplicar novas migrações enquanto o gap acumula.
