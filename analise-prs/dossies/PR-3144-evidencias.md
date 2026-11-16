# Dossiê PR #3144 — CRM bridge: identidade canônica de vendedor

**Data:** 2026-11-08  
**Veredito:** `DECISAO_HUMANA`  
**Razões:** REGRA#8 (migration + rollback), conflito de merge reportado pelo GitHub  

---

## 1. Arquivos alterados — lista completa

| Arquivo | Tipo | Classificação |
|---|---|---|
| `audit/supabase-reference-catalog.temporary.json` | Modificado | Conflito documentado |
| `src/components/search/useGlobalSearch.ts` | Modificado | Frontend — bugfix |
| `src/hooks/simulation/useSimulation.ts` | Modificado | Frontend — bugfix |
| `supabase/MIGRATIONS_SYNC_LOG.md` | Modificado | Conflito documentado |
| `supabase/functions/crm-db-bridge/index.ts` | Modificado | Edge function — refactor major |
| `supabase/functions/crm-db-bridge/query-policy.ts` | NOVO | Edge function — módulo novo |
| `supabase/migrations/20261107134429_create_crm_seller_identity_links.sql` | NOVO | **GOVERNANÇA — REGRA#8** |
| `supabase/rollbacks/20261107134429_rollback.sql` | NOVO | **GOVERNANÇA — REGRA#8** |
| `tests/security/crm-db-bridge-error-mapping.test.ts` | NOVO | Teste de segurança |
| `tests/security/crm-db-bridge-filter-validation.test.ts` | NOVO | Teste de segurança |
| `tests/security/crm-db-bridge-seller-scope.test.ts` | NOVO | Teste de segurança |

---

## 2. Arquivos de governança (REGRA#8 — DECISAO_HUMANA)

### `supabase/migrations/20261107134429_create_crm_seller_identity_links.sql`

Cria tabela `public.crm_seller_identity_links`:

```sql
CREATE TABLE IF NOT EXISTS public.crm_seller_identity_links (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_seller_id bigint NOT NULL UNIQUE CHECK (crm_seller_id > 0),
  link_source text NOT NULL DEFAULT 'email_bootstrap'
    CHECK (link_source IN ('email_bootstrap', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_seller_identity_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_seller_identity_links FROM PUBLIC;
REVOKE ALL ON TABLE public.crm_seller_identity_links FROM anon;
REVOKE ALL ON TABLE public.crm_seller_identity_links FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.crm_seller_identity_links TO service_role;
```

**Impacto:** DDL em produção. Requer aplicação via `db-apply-migration.yml`.

### `supabase/rollbacks/20261107134429_rollback.sql`

```sql
DROP TABLE IF EXISTS public.crm_seller_identity_links;
```

---

## 3. Risco de regressão — arquivos não-governança

### `src/components/search/useGlobalSearch.ts` — RISCO BAIXO

**Evidência:** `diff +28-36`

```diff
- { select: 'id, razao_social, nome_fantasia, ramo', limit: 5 }
+ { select: 'id, razao_social, nome_fantasia, ramo_atividade', limit: 5 }
- subtitle: c.ramo || 'Empresa',
+ subtitle: c.ramo_atividade || 'Empresa',
```

Coluna `ramo` não existe na tabela `companies`; a coluna correta é `ramo_atividade`. Era um bug silencioso (retornava `null`). Regressão impossível — era broken antes.

### `src/hooks/simulation/useSimulation.ts` — RISCO BAIXO

**Evidência:** `diff +48-65`

```diff
- ramo?: string; nicho?: string;
+ ramo_atividade?: string; nicho_cliente?: string;
- select: 'id, razao_social, nome_fantasia, ramo, nicho, logo_url'
+ select: 'id, razao_social, nome_fantasia, ramo_atividade, nicho_cliente, logo_url'
- ramo: c.ramo, nicho: c.nicho,
+ ramo: c.ramo_atividade, nicho: c.nicho_cliente,
```

Mesma correção. Objeto de retorno ainda usa `ramo`/`nicho` como chaves (mapeamento intencional). Callers existentes não quebram.

### `supabase/functions/crm-db-bridge/index.ts` — RISCO MÉDIO

**Evidência — expansão de roles:** `diff +232-242`

```typescript
// ANTES:
["supervisor","gerente","vendedor"]
// DEPOIS:
["dev","admin","supervisor","manager","coordenador","vendedor","agente"]
```

Roles desconhecidos que antes caíam como `"vendedor"` agora recebem 403. Breaking change para qualquer usuário com role fora da lista nova.

**Evidência — AAL2 para mutações:** `diff +765-775`

```typescript
if (sellerScoped && (method === "POST" || method === "PATCH" || method === "DELETE")) {
  if (aal !== "aal2") {
    return errorResponse(403, "MFA obrigatório para esta operação", requestId, corsHeaders);
  }
}
```

Vendedores/agentes sem MFA ativo (AAL1) não conseguem mais criar/editar/deletar no CRM. Breaking change que requer comunicação prévia.

**Evidência — circuit breaker ordering:** `diff +790-823`

`breaker.canRequest()` movido para DEPOIS de validation/auth/seller-scope. Melhora resiliência mas não quebra nada.

### `supabase/functions/crm-db-bridge/query-policy.ts` (novo) — RISCO MÉDIO-BAIXO

**Evidência:** Novo arquivo, 620 linhas. Introduz validação estrita de colunas via `COLUMNS` allowlists por tabela.

Callers que enviam colunas fora do allowlist receberão 400. Se o frontend CRM usa colunas não listadas no allowlist, quebrará. Os testes `crm-db-bridge-filter-validation.test.ts` cobrem esse caminho.

### Testes de segurança (3 novos arquivos) — RISCO ZERO

São novos testes que cobrem o novo código. Não alteram comportamento existente.

---

## 4. Regra de negócio — válida?

**Sim.** CRM com escopo por vendedor é requisito funcional correto:
- Vendedores só veem seus próprios clientes (via `crm_seller_identity_links`)
- Supervisores/admin/dev veem tudo
- MFA obrigatório para mutações é hardening correto
- Allowlist de colunas previne enumeração cega de schema

A tabela `crm_seller_identity_links` é o elo entre `auth.users` e o `crm_seller_id` (bigint externo), com bootstrap por email na primeira acesso.

---

## 5. Já implementada em main?

**Não.** `git cherry -v` confirmou em sessão anterior que todos os commits desta PR têm prefixo `+` (não estão em main). A tabela `crm_seller_identity_links` não existe em produção.

---

## 6. Conflitos de merge

GitHub reporta CONFLICTING. Arquivos confirmados com conflito:
- `audit/supabase-reference-catalog.temporary.json` — entrada nova para `crm_seller_identity_links`
- `supabase/MIGRATIONS_SYNC_LOG.md` — entrada nova para a migration

Ambos são conflitos documentais, não de lógica.

---

## 7. Veredito final

**DECISAO_HUMANA**

Razões em ordem de prioridade:
1. **REGRA#8:** `supabase/migrations/20261107134429_create_crm_seller_identity_links.sql` e `supabase/rollbacks/20261107134429_rollback.sql` — DDL em produção requer aprovação PO + aplicação via `db-apply-migration.yml` **antes** do deploy da edge function
2. **Breaking change AAL2:** Vendedores sem MFA perdem acesso a mutações. PO precisa coordenar comunicação e ativação de MFA antes do merge
3. **Conflito de merge:** Requer resolução manual
4. **Deploy em sequência:** Migration → deploy edge function `crm-db-bridge` (via `deploy-edge-functions.yml`)

A PR está correta tecnicamente e os bugs de coluna (`ramo`→`ramo_atividade`) devem ser mergeados. O bloqueio é processual/operacional, não técnico.
