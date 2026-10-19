# E18 — Achados secundários: 4 gaps de autorização em funções `SECURITY DEFINER` executáveis por `authenticated`

> Isolados da revisão geral do E18 (94 funções `SECURITY DEFINER` executáveis
> por `authenticated`) por severidade — ver
> `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (E18)
> para o escopo completo. Este documento cobre só estes 4 achados; o
> restante das 94 funções segue no documento geral do E18. Ver também
> `docs/E18_MCP_KV_GET_ACHADO_CRITICO_2026-09-17.md` para o achado de maior
> severidade (exfiltração de credencial), tratado separadamente.

## Resumo

Durante a inspeção corpo-a-corpo das funções com o placeholder genérico no
allowlist (`.security/lint-0029-allowlist.json`), 4 funções mostraram um
padrão comum: `SECURITY DEFINER`, `EXECUTE` concedido a `authenticated`, e
**nenhuma checagem de autorização suficiente no corpo da função** (3 delas
sem nenhum `auth.uid()`; a 4ª exige `auth.uid()` mas não valida a relação
entre o chamador e o alvo da ação) — ou seja, o grant a `authenticated` não
é só desnecessário, é um gap de autorização real e explorável hoje por
qualquer usuário logado.

Para as 4, confirmei via `pg_proc.proacl` que `service_role` tem grant
**próprio e explícito** (`service_role=X/postgres`), não meramente herdado
via `authenticated`. Isso significa que revogar `EXECUTE` de `authenticated`
não afeta nenhum consumidor legítimo que rode como `service_role`.

## Achado 1 — `public.confirm_notifications_dispatched(p_ids uuid[])`

**Corpo da função** (integral):

```sql
UPDATE public.workspace_notifications
SET is_read = true
WHERE id = ANY(p_ids) AND is_read = false;
```

Nenhuma checagem de `auth.uid()`, nenhum filtro por dono da notificação.
`p_ids` é um array arbitrário informado pelo chamador.

**Risco — IDOR**: qualquer `authenticated` pode marcar como lida/despachada
a notificação de **qualquer outro usuário**, só adivinhando ou enumerando
UUIDs. Impacto é de integridade (o usuário-alvo pode deixar de ver um aviso
que deveria estar não-lido), não há exfiltração de dados — a função não
retorna nada, só faz `UPDATE`.

**ACL confirmado** (`pg_proc.proacl`, 2026-09-17):
`{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`

**Consumidor legítimo real**: `supabase/functions/process-queue/index.ts`
chama `confirm_notifications_dispatched` via RPC, mas constrói o client
Supabase com `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — roda como
`service_role`, que tem `EXECUTE` próprio no ACL, independente do grant a
`authenticated`. `grep -rn "confirm_notifications_dispatched" src/
supabase/functions/` não encontrou nenhum outro call-site (só o stub de
tipo em `types.ts` e esse edge function).

**Efeito de revogar `authenticated`**: nenhum impacto no `process-queue`
(continua rodando como `service_role`). Fecha o IDOR para qualquer chamada
direta via PostgREST/client autenticado do app.

## Achados 2 e 3 — `public.registrar_entrada_estoque(...)` e `public.registrar_saida_estoque(...)`

**Assinaturas:**
- `registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid)`
- `registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean)`

**Padrão comum no corpo**: ambas escrevem em
`product_variants.stock_quantity` (incremento/decremento direto) e inserem
uma linha em `archive.stock_movements`. Nenhuma das duas chama `auth.uid()`
ou checa papel/role do chamador. O parâmetro `p_user_id uuid` é informado
livremente pelo chamador e gravado como `created_by` no registro de
auditoria — ou seja, além de poder alterar o estoque de qualquer variante,
o chamador pode **forjar a autoria do movimento** no log.

`registrar_saida_estoque` tem uma guarda de regra de negócio (`p_movement_type`
restrito a uma whitelist, e checagem de "estoque insuficiente" a menos que
`p_allow_negative=true`), mas isso não é uma checagem de identidade — não
limita quem pode chamar a função, só o que a chamada pode fazer ao estoque.

**Risco**: qualquer `authenticated` pode manipular quantidade de estoque de
qualquer SKU e forjar quem fez o movimento no log de auditoria
(`archive.stock_movements.created_by`). Impacto potencial em decisões de
reposição, relatórios de ruptura e na confiabilidade do log de auditoria em
si.

**ACL confirmado** (`pg_proc.proacl`, 2026-09-17), idêntico nas duas:
`{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`

**Uso real no código**: `grep -rln "registrar_entrada_estoque\|registrar_saida_estoque"
src/ supabase/functions/` só encontrou `src/integrations/supabase/types.ts`
(stub de tipo gerado) — **nenhum call-site real em nenhum lugar do
código**, nem via client normal nem via edge function/service_role. Ou
seja, essas duas funções estão hoje completamente órfãs: nenhum consumidor
conhecido, legítimo ou não, as chama.

**Efeito de revogar `authenticated`**: nenhum consumidor conhecido é
afetado (não há nenhum). `service_role` mantém `EXECUTE` para o dia em que
um fluxo server-side legítimo precisar chamá-las.

## Achado 4 — `public.fn_notify_user(_target_user_id uuid, _title text, _message text, _type text, _category text, _action_url text, _metadata jsonb)`

**Corpo da função** (relevante):

```sql
_caller_id := auth.uid();
IF _caller_id IS NULL THEN
  RAISE EXCEPTION 'fn_notify_user: authentication required' USING ERRCODE = '42501';
END IF;

IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
  RAISE EXCEPTION 'fn_notify_user: target user does not exist' USING ERRCODE = 'P0001';
END IF;

IF _type NOT IN ('info', 'success', 'warning', 'error') THEN
  RAISE EXCEPTION 'fn_notify_user: invalid type %', _type USING ERRCODE = 'P0001';
END IF;

INSERT INTO public.workspace_notifications (
  user_id, title, message, type, category, action_url, metadata
) VALUES (
  _target_user_id, _title, _message, _type, _category, _action_url, _metadata
)
RETURNING id INTO _notification_id;
```

A função exige `auth.uid()` (autenticação), mas **não checa nenhuma relação
entre o chamador e `_target_user_id`** — nenhum `has_role`, nenhuma checagem
de organização/equipe, nada que limite quem pode notificar quem.

**Risco**: qualquer `authenticated` pode inserir uma notificação com
título, mensagem, `action_url` e `metadata` arbitrários na caixa de
**qualquer outro usuário** — vetor de spam ou phishing dentro do próprio
app (ex.: notificação forjada parecendo vir do sistema, com um
`action_url` malicioso). Diferente dos achados 2/3, aqui a checagem de
autenticação existe; o gap é a ausência de checagem de **autorização**
sobre o alvo.

**ACL confirmado** (`pg_proc.proacl`, 2026-09-17):
`{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`

**Uso real no código**: `grep -rn "fn_notify_user" src/ supabase/functions/`
não encontrou nenhum call-site real — só o stub de tipo gerado em
`types.ts`. Função órfã, mesmo perfil dos achados 2/3.

**Efeito de revogar `authenticated`**: nenhum consumidor conhecido é
afetado. `service_role` mantém `EXECUTE` para o dia em que um fluxo
server-side legítimo (ex.: notificações de sistema disparadas por edge
function/cron) precisar chamá-la — nesse caso, se um dia se quiser reabrir
para `authenticated` (ex.: um recurso de "notificar colega de equipe"), a
função precisaria primeiro ganhar uma checagem real de relação
chamador↔alvo (mesma organização, mesma equipe, etc.), não seria suficiente
só refazer o `GRANT`.

## Resumo para aprovação

| Função | Gap | Consumidor legítimo | Impacto do REVOKE |
|---|---|---|---|
| `confirm_notifications_dispatched(uuid[])` | IDOR — marca notificação de outro usuário como lida | `process-queue` (roda como `service_role`, ACL próprio) | Zero — consumidor não usa `authenticated` |
| `registrar_entrada_estoque(...)` | Sem checagem de identidade; `p_user_id` forjável no log | Nenhum encontrado | Zero — função órfã |
| `registrar_saida_estoque(...)` | Sem checagem de identidade; `p_user_id` forjável no log | Nenhum encontrado | Zero — função órfã |
| `fn_notify_user(...)` | Autenticado mas sem checagem de relação chamador↔alvo — spam/phishing de notificação | Nenhum encontrado | Zero — função órfã |

## Decisão proposta

```sql
REVOKE EXECUTE ON FUNCTION public.confirm_notifications_dispatched(uuid[]) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.registrar_entrada_estoque(
  character varying, integer, numeric, character varying, character varying, text, uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.registrar_saida_estoque(
  character varying, integer, character varying, character varying, text, uuid, boolean
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_notify_user(
  uuid, text, text, text, text, text, jsonb
) FROM authenticated;
```

Migration pronta (não aplicada):
`supabase/migrations/20260917061500_e18_revoke_authenticated_authz_gaps.sql`
— precondição/pós-condição no mesmo padrão de
`20260916200000_e17_revoke_public_fn_super_filtro.sql` e da migration do
achado `mcp_kv_get`, confirmando que `service_role` mantém `EXECUTE` nas
quatro e que `authenticated` perde.

Reversível:
```sql
GRANT EXECUTE ON FUNCTION public.confirm_notifications_dispatched(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_notify_user(uuid, text, text, text, text, text, jsonb) TO authenticated;
```

**[REQUER-PO]** — aguardando aprovação. Recomendações adicionais fora do
escopo desta migration (decisão do PO, não uma ação técnica):
- Se algum movimento de estoque suspeito for encontrado numa auditoria
  retroativa de `archive.stock_movements`, tratar `created_by` como
  não-confiável para qualquer linha anterior a esta correção, já que o
  parâmetro era espontaneamente forjável.
- Se `workspace_notifications` tiver linhas suspeitas (título/mensagem/
  `action_url` incoerentes com o `category`/`type` esperado do sistema),
  considerar auditoria retroativa — o gap em `fn_notify_user` permitia
  inserção de conteúdo arbitrário por qualquer `authenticated` desde que a
  função foi criada.
