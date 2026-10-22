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

**Limitação:** Teste em Postgres local com schema simplificado. Não cobre:
- Tabelas além de `quotes`, `orders`, `order_items`, `user_organizations`, `profiles`
- Funções SECURITY DEFINER que bypassam RLS
- Cenários de sub-query e JOINs intra-tenant

---

## Script Reproduzível

```bash
# Recriar banco e rodar:
sudo -u postgres psql -c "DROP DATABASE IF EXISTS audit_rls_test; CREATE DATABASE audit_rls_test;"
sudo -u postgres psql -d audit_rls_test -f /tmp/rls_matrix_test.sql
```

O arquivo `/tmp/rls_matrix_test.sql` está em `/home/user/Promo_Gifts_V4/auditoria-supabase/testes/rls_matrix_test.sql`.
