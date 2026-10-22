# Matriz RLS — Isolamento Tenant A × B

**Data:** 2026-10-22  
**Ambiente:** PostgreSQL 16 local (cluster temporário `audit_rls_test`)  
**Script:** `/tmp/rls_matrix_test.sql`  
**Políticas replicadas:** `user_organizations`, `quotes`, `orders`, `order_items`, `profiles`  
**Funções helper replicadas:** `user_is_org_member`, `is_org_owner_or_admin`, `is_coord_or_above`, `can_access_quote`

---

## Resultado: 13/13 PASS ✓

| ID | Teste | Resultado | Status |
|---|---|---|---|
| T1.1 | user-a-1 vê 1 quote (Org-A) | 1 | **PASS ✓** |
| T1.2 | cotação Org-B invisível para user-a-1 | 0 | **PASS ✓** |
| T1.3 | user-a-1 vê 1 order (Org-A) | 1 | **PASS ✓** |
| T1.4 | order_items de Org-B invisíveis para user-a-1 | 0 | **PASS ✓** |
| T1.5 | membros de Org-B invisíveis para user-a-1 | 0 | **PASS ✓** |
| T1.6 | profile de user-b-1 invisível para user-a-1 | 0 | **PASS ✓** |
| T2.1 | user-b-1 vê 1 quote (Org-B) | 1 | **PASS ✓** |
| T2.2 | cotação Org-A invisível para user-b-1 | 0 | **PASS ✓** |
| T2.3 | orders de Org-A invisíveis para user-b-1 | 0 | **PASS ✓** |
| T3.1 | member sem coord não vê quotes de outros | 0 | **PASS ✓ (filtro coord funciona)** |
| T4.1 | anon bloqueado em quotes | `permission denied` | **PASS ✓ (sem GRANT + RLS)** |
| T4.2 | anon bloqueado em orders | `permission denied` | **PASS ✓ (sem GRANT + RLS)** |
| T4.3 | anon bloqueado em user_organizations | `permission denied` | **PASS ✓ (sem GRANT + RLS)** |

---

## Detalhes por Grupo

### Teste 1 — user-a-1 (Org-A owner) só vê Org-A

```
role = authenticated
sub  = aaaaaaaa-0000-0000-0000-000000000002 (owner de Org-A)
```

Resultado: **6/6 PASS** — isolamento completo confirmado.

Evidência:
- `SELECT count(*) FROM quotes` → 1 (apenas a de Org-A)
- `SELECT count(*) FROM quotes WHERE organization_id='bbbbbbbb...'` → 0
- `SELECT count(*) FROM orders` → 1
- `SELECT count(*) FROM order_items WHERE order_id='b1bbbbbb...'` → 0
- `SELECT count(*) FROM user_organizations WHERE organization_id='bbbbbbbb...'` → 0
- `SELECT count(*) FROM profiles WHERE user_id='bbbbbbbb...'` → 0

### Teste 2 — user-b-1 (Org-B owner) só vê Org-B

```
role = authenticated
sub  = bbbbbbbb-0000-0000-0000-000000000002 (owner de Org-B)
```

Resultado: **3/3 PASS** — isolamento simétrico confirmado.

### Teste 3 — user-a-2 (member) bloqueado por política de coordinator

```
role = authenticated
sub  = aaaaaaaa-0000-0000-0000-000000000003 (member de Org-A, não coordinator)
quote da Org-A tem seller_id/created_by = user-a-1 (não user-a-2)
```

Resultado: **PASS** — `is_coord_or_above()` + verificação de seller/creator/assignee impede que member veja quotes de outros.

### Teste 4 — anon bloqueado em todas as tabelas sensíveis

```
role = anon
sub  = 00000000-0000-0000-0000-000000000000
```

Resultado: **PASS via permission denied** — `anon` não tem GRANT SELECT em `quotes`, `orders`, `order_items` ou `user_organizations`. A proteção é dupla: sem GRANT + sem policy. `profiles` tem SELECT para anon mas somente do próprio `user_id` via policy `profiles_select`.

---

## Conclusão

**Isolamento tenant A × B verificado:** Nenhum vazamento de dados entre organizações diferentes nas tabelas críticas testadas. As políticas RLS da produção, replicadas fielmente neste ambiente local, provam isolamento correto para os 4 cenários testados.

---

## NV-003 — Matriz com Migrations Reais do Repositório

**Data:** 2026-10-22  
**Ambiente:** PostgreSQL 16 local (banco `audit_rls_v2`, criado do zero nesta sessão)  
**Fonte das migrations:** `supabase/migrations/` do repositório (arquivos reais)  
**Método:** `auth.uid()` simulado via `set_config('app.current_user_id', ...)` + `SET ROLE authenticated` (não-superusuário — RLS aplica)

### Tabelas testadas com migrations reais

| Tabela | Migration | Cenários | Resultado |
|---|---|---|---|
| `seller_carts` | `20260214152115_900b7a1c...sql` | 7/7 | **PASS ✓** |
| `favorite_lists` | `20260420123931_cfdf94d4...sql` | 6/6 | **PASS ✓** |
| `collections` | `20260412182408_a60c0965...sql` | 6/6 | **PASS ✓** |
| `custom_kits` | `20260322133758_7dc8f3c8...sql` | 5/5 | **PASS ✓** |

**Total NV-003: 24/24 PASS**

### Cenários `seller_carts` (7/7)

| ID | Teste | Resultado |
|---|---|---|
| SC1 | A lê próprios carts | PASS |
| SC2 | B não vê carts de A | PASS (0 rows) |
| SC3 | B não deleta carts de A | PASS (0 deleted) |
| SC4 | B não insere cart para A | PASS (new row violates RLS) |
| SC5 | B não atualiza cart de A | PASS (0 updated) |
| SC6 | Após ops de B, A ainda vê próprio cart | PASS |
| SC7 | B não vê cart de A sem filtro user_id | PASS (0 visible) |

### Cenários `favorite_lists` (6/6)

| ID | Teste | Resultado |
|---|---|---|
| FAV-SC1 | A lê próprias listas | PASS |
| FAV-SC2 | B não vê listas de A | PASS (0 rows) |
| FAV-SC3 | B não deleta lista de A | PASS (0 deleted) |
| FAV-SC4 | B não insere lista para A | PASS (new row violates RLS) |
| FAV-SC5 | B não atualiza lista de A | PASS (0 updated) |
| FAV-SC6 | B não insere lista com A.user_id | PASS (blocked) |

### Cenários `collections` (6/6)

| ID | Teste | Resultado |
|---|---|---|
| COL-SC1 | A lê própria coleção | PASS (1 row) |
| COL-SC2 | B não vê coleção de A | PASS (0 rows) |
| COL-SC3 | B não deleta coleção de A | PASS (0 deleted) |
| COL-SC4 | B não insere coleção para A | PASS (new row violates RLS) |
| COL-SC5 | B não atualiza coleção de A | PASS (0 updated) |
| COL-SC6 | B não vê coleção de A sem filtro | PASS (0 visible) |

### Cenários `custom_kits` (5/5)

| ID | Teste | Resultado |
|---|---|---|
| KIT-SC1 | A lê próprio kit | PASS |
| KIT-SC2 | B não vê kit de A | PASS (blocked) |
| KIT-SC3 | B não deleta kit de A | PASS (0 deleted) |
| KIT-SC4 | B não insere kit para A | PASS (new row violates RLS) |
| KIT-SC5 | A isolamento preservado após ops de B | PASS |

### Conclusão NV-003

**STATUS: RESOLVIDO** — Isolamento de tenant confirmado com migrations reais do repositório em banco local sem mock. 24/24 cenários passaram. Nenhum vazamento cross-tenant detectado em `seller_carts`, `favorite_lists`, `collections` e `custom_kits`.

**Limitação:** Teste local não substitui teste em ambiente com JWT real. Funções SECURITY DEFINER e JOINs cross-tabela não foram cobertos.

---

## Script Reproduzível

```bash
# Recriar banco e rodar:
sudo -u postgres psql -c "DROP DATABASE IF EXISTS audit_rls_test; CREATE DATABASE audit_rls_test;"
sudo -u postgres psql -d audit_rls_test -f /tmp/rls_matrix_test.sql
```

O arquivo `/tmp/rls_matrix_test.sql` está em `/home/user/Promo_Gifts_V4/auditoria-supabase/testes/rls_matrix_test.sql`.
