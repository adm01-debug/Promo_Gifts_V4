# E18 — Revisão das 94 funções SECURITY DEFINER executáveis por `authenticated`

`[REQUER-PO]` para as 5 revogações propostas (§3); as demais 89 funções não
têm ação de schema associada, só classificação no allowlist.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linha 579).

Achados isolados por severidade em documentos próprios (cada um com sua
migration pronta, não aplicada):
- `docs/E18_MCP_KV_GET_ACHADO_CRITICO_2026-09-17.md` — `mcp_kv_get` (achado
  crítico: exfiltração de credencial via segredo lido de `pg_proc.prosrc`).
- `docs/E18_ACHADOS_SECUNDARIOS_AUTHENTICATED_2026-09-17.md` —
  `confirm_notifications_dispatched`, `registrar_entrada_estoque`,
  `registrar_saida_estoque`, `fn_notify_user` (4 gaps de autorização reais).

Este documento cobre a classificação das 94 funções como um todo — a tabela
completa de decisão está em `.security/lint-0029-allowlist.json`, que é a
fonte única de verdade (`reason` por função); aqui vai o método e o resumo
agregado por categoria, sem repetir os 94 textos.

---

## 1. Método `[RO]`

Toda a investigação foi feita só via `pg_catalog` (REGRA #8, corolário),
nunca PostgREST. Duas rodadas de consulta em lote (`mcp__supabase__execute_sql`,
somente leitura):

```sql
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       position('auth.uid()' in p.prosrc) > 0        AS uses_auth_uid,
       position('has_role'   in p.prosrc) > 0        AS uses_has_role,
       position('is_admin'   in p.prosrc) > 0         AS uses_is_admin,
       position('is_coord'   in p.prosrc) > 0         AS uses_is_coord,
       position('org_member' in p.prosrc) > 0         AS uses_org_member,
       position('RAISE EXCEPTION' in p.prosrc) > 0    AS has_raise,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       left(p.prosrc, 300) AS body_start
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
ORDER BY p.proname;
```

seguida de `pg_get_functiondef(oid)` (corpo completo) para toda função cujo
`body_start` de 300 caracteres não permitisse concluir com segurança se havia
ou não uma checagem de autorização real (parâmetros que pareciam permitir
consulta a outro usuário, funções de escrita, ou heurística de string
ambígua). Nenhuma função foi classificada só pelo nome ou pela assinatura —
toda decisão abaixo tem corpo lido.

Critério de decisão por função:
1. É helper pré-login (roda antes de `auth.uid()` existir)? → EXECUTE a
   `authenticated`/`anon` é esperado por design.
2. Tem gate real (`auth.uid()` obrigatório + ownership/role check que nega
   com `RAISE EXCEPTION` ou filtro `WHERE`)? → manter.
3. É leitura pública de catálogo (sem PII, `anon_exec=true` ou dado
   equivalente a `anon_exec=true`)? → manter, mesma classe do E17.
4. É leitura/escrita interna (dashboard operacional, QA, auditoria) sem PII
   de cliente e sem `auth.uid()`? → manter como está, mas registrar como
   candidato a hardening de baixa prioridade (não é exposição de dado
   sensível nem corrupção de integridade de negócio).
5. Tem efeito real (escreve dado de outro usuário, ou lê PII/segredo) **sem**
   nenhuma checagem de identidade ou relação chamador↔alvo? → achado,
   REVOKE preparado.

---

## 2. Resultado agregado — 94/94 classificadas

| Categoria | Qtde | Decisão | Exemplos |
|---|---:|---|---|
| Achados com REVOKE preparado (`[REQUER-PO]`, pendente) | 5 | Ver §3 | `mcp_kv_get`, `confirm_notifications_dispatched`, `registrar_entrada_estoque`, `registrar_saida_estoque`, `fn_notify_user` |
| Já rastreados em outro achado/pacote (não duplicado aqui) | 2 | Ver pacote correspondente | `fn_super_filtro_product_ids` (E07, PUBLIC), `zapp_catalog_stats` (E07, Pacote de Aprovação #1) |
| Helpers pré-login (por design, sem `auth.uid()`) | 2 | Manter | `check_login_rate_limit`, `fn_check_login_allowed` |
| Catálogo público / anon-safe, sem PII (mesma classe do E17) | ~8 | Manter | `fn_global_search`, `fn_super_filtro*`, `fn_product_active_for_rls`, `get_catalog_bestseller_page` |
| `auth.uid()`-scoped com gate real de ownership/role confirmado no corpo | ~20 | Manter | `can_access_quote`, `fn_get_conversion_funnel`, `request_discount_approval_transactional`, `verify_step_up_password`, `is_admin_or_above` |
| RPCs Magazine v2/atomic (auth.uid + owner/admin + CAS/lock, já revisadas) | 20 | Manter | `magazine_publish_v2`, `magazine_add_items_atomic` |
| Dashboards/QA/auditoria interna, sem PII de cliente, sem `auth.uid()` | ~31 | Manter, hardening futuro de baixa prioridade | `fn_get_low_stock_alerts`, `fn_products_quality_dashboard`, `get_inventory_health` |
| Achados menores sinalizados (dado de sensibilidade muito baixa, sem call-site privilegiado) | 3 (dentro da categoria acima) | Manter, hardening futuro | `fn_list_deactivation_requests`, `fn_qa_scan_imageless_products`, `is_dnd_active(p_user_id uuid)` |
| Diversos (agregados públicos simples, RBAC helper) | ~6 | Manter | `get_collections_weekly_count`, `get_top_collected_products`, `is_org_member` |

Soma: 94. Cada linha da tabela acima tem o `reason` específico correspondente
em `.security/lint-0029-allowlist.json` — nenhuma entrada ficou com a frase
genérica "Baseline canônica 2026-08-29" após esta revisão.

Das **25 funções novas desde julho** (94 vs. 69 anteriores), todas foram
revisadas corpo-a-corpo nesta rodada — é onde os 5 achados de REVOKE (§3)
foram encontrados; nenhuma das 69 antigas (já revisadas em ciclos anteriores,
E07/E17) recebeu um achado novo nesta passada.

---

## 3. Achados com REVOKE preparado (resumo)

| Função | Gap | Severidade | Consumidor legítimo | Impacto do REVOKE |
|---|---|---|---|---|
| `mcp_kv_get(text, text)` | "Segredo" no corpo da função é legível por quem tem o EXECUTE — autorização efetivamente nula | Crítico (exfiltração de credencial) | Nenhum encontrado | Zero |
| `confirm_notifications_dispatched(uuid[])` | IDOR — sem checagem de ownership | Médio | `process-queue` (roda como `service_role`, ACL próprio) | Zero |
| `registrar_entrada_estoque(...)` | Sem checagem de identidade; log de auditoria forjável | Médio | Nenhum encontrado (órfã) | Zero |
| `registrar_saida_estoque(...)` | Sem checagem de identidade; log de auditoria forjável | Médio | Nenhum encontrado (órfã) | Zero |
| `fn_notify_user(...)` | Autenticado mas sem checagem de relação chamador↔alvo (spam/phishing) | Médio | Nenhum encontrado (órfã) | Zero |

Migrations prontas, não aplicadas:
- `supabase/migrations/20260917060000_e18_revoke_authenticated_mcp_kv_get.sql`
- `supabase/migrations/20260917061500_e18_revoke_authenticated_authz_gaps.sql`

Ambas seguem o padrão precondição/DDL/pós-condição de
`20260916200000_e17_revoke_public_fn_super_filtro.sql`, confirmando que
`service_role` mantém `EXECUTE` em todas as 5 e que `authenticated` perde.
Nenhum consumidor real conhecido depende do grant a `authenticated` em
nenhuma das 5 (detalhe da investigação de call-sites em cada documento
próprio).

---

## 4. Allowlist atualizada

`.security/lint-0029-allowlist.json` foi reescrito nesta preparação: as 94
entradas têm agora `reason` específico (evidência de corpo de função, não
placeholder genérico), incluindo a entrada que faltava
(`public.zapp_catalog_stats()`, adicionada — referenciando o achado E07
já rastreado no Pacote de Aprovação #1). O script de drift do gate CI só
valida presença de `reason` não-vazio por função nova, então esta reescrita
não quebra o gate; melhora a qualidade da justificativa exigida.

---

## 5. Checklist de conclusão (do plano, §E18)

- [x] 94/94 classificadas; 25 novas revisadas linha a linha
- [ ] Revogações via E15 — **preparadas, aguardando aprovação do PO** (5
      funções, §3); aplicação segue o workflow `db-apply-migration.yml`
      quando aprovado, nunca `supabase db push`
- [ ] `check-lint-0029-drift --require-live` passa — não executado nesta
      sessão (requer `DATABASE_URL`/ambiente de CI); allowlist já está
      estruturalmente completa para passar assim que rodado

---

## 6. Resumo para aprovação

Responda "aprovado" (por objeto ou pelo lote inteiro) para aplicar as 2
migrations de revogação listadas em §3, via `db-apply-migration.yml`. As
demais 89 funções não têm ação de schema pendente — só a atualização do
allowlist (já preparada, sem DDL, sem risco).
