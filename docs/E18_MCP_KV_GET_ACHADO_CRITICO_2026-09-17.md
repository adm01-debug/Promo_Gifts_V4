# E18 — Achado crítico: `public.mcp_kv_get` executável por `authenticated` com autorização quebrada

> Isolado da revisão geral do E18 (94 funções `SECURITY DEFINER` executáveis por
> `authenticated`) por severidade — ver
> `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (E18) para o
> escopo completo. Este documento cobre só este achado; o restante das 94
> funções segue no documento geral do E18.

## Resumo

`public.mcp_kv_get(p_secret text, p_key text)` é `SECURITY DEFINER` e tem
`EXECUTE` concedido a `authenticated` — ou seja, qualquer usuário logado do
app. A função não valida o chamador via `auth.uid()` nem qualquer mecanismo
por sessão: a única guarda é comparar `p_secret` contra um literal de texto
fixo embutido no corpo da função (`RAISE EXCEPTION 'forbidden'` se diferente).

O problema: o corpo de qualquer função (`pg_proc.prosrc`) é legível via
`pg_get_functiondef()` por qualquer role com `USAGE` em `pg_catalog` — que é
o padrão para `authenticated`. Então o literal que deveria ser um segredo
está, na prática, visível para exatamente a mesma audiência que tem
`EXECUTE` na função. Isso reduz a autorização a "nenhuma": qualquer sessão
autenticada pode ler o código-fonte da função, extrair o literal, e chamar
`mcp_kv_get('<literal>', '<qualquer chave>')` para ler qualquer linha de
`public.mcp_kv`.

**Não estou reproduzindo o valor do literal nem o conteúdo do payload
armazenado neste documento, em nenhum commit ou em qualquer resposta —
tratando ambos como segredo mesmo já potencialmente comprometido.**

## Evidência (levantada em 2026-09-17, só leitura via `pg_catalog`)

### ACL ao vivo do trio `mcp_kv_*`

| Função | ACL (`pg_proc.proacl`) | `authenticated` tem EXECUTE? |
|---|---|---|
| `mcp_kv_get(text, text)` | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | **Sim** |
| `mcp_kv_set(text, text, jsonb)` | `{postgres=X/postgres,service_role=X/postgres}` | Não |
| `mcp_kv_try_lock(text, text, integer)` | `{postgres=X/postgres,service_role=X/postgres}` | Não |

As três funções compartilham o mesmo padrão de assinatura (`p_secret text`
como primeiro argumento) e o mesmo schema/owner. Só `mcp_kv_get` tem grant a
`authenticated` — as irmãs de escrita/lock não têm. Isso é consistente com
concessão acidental (ex.: copiada de outra função por engano, ou sobrando de
um teste) e não com uma decisão deliberada de expor leitura a usuários
comuns.

Nenhuma das três tem `EXECUTE` para `anon` ou `PUBLIC`.

### Corpo da função

`prosecdef = true`, `proconfig = {search_path=public}` (search_path fixo,
correto). `position('auth.uid()' in prosrc) = 0` — a função não faz nenhuma
checagem de identidade do chamador. A única guarda é a comparação de string
contra o literal fixo.

### Tabela protegida

`public.mcp_kv`: `relrowsecurity = true`, 1 policy, `SELECT` direto nega
tanto `anon` quanto `authenticated` — a tabela em si está corretamente
trancada (deny-all). O problema é exclusivamente que `mcp_kv_get`, sendo
`SECURITY DEFINER`, contorna essa RLS para quem conseguir chamá-la.

Conteúdo atual (só metadados — chave, tamanho e timestamp; **valor não
lido/exposto**):

| `k` | tamanho do `v` (chars, jsonb) | `updated_at` |
|---|---|---|
| `higgsfield_creds` | 229 | 2026-06-16 21:21:57 UTC |

O nome da chave sugere uma credencial de API de terceiro (serviço de
geração de imagem/vídeo), consistente com outras funcionalidades de
geração de mockup no repo.

### Uso real no código

```
grep -rn "mcp_kv_get\|mcp_kv_set\|mcp_kv_try_lock" src/ supabase/functions/
```

só encontra o stub de tipo gerado (`src/integrations/supabase/types.ts`,
declaração de `Args`/`Returns` do RPC) — nenhum call-site real em `src/`
nem em `supabase/functions/`. Não há edge function, hook ou serviço que
chame `mcp_kv_get` hoje.

## Risco

- **Exploração**: qualquer usuário autenticado do app (não precisa ser
  admin) pode, em princípio, ler `prosrc` via SQL direto se tiver algum
  caminho de execução SQL arbitrária (ex.: um client Postgres com a mesma
  role) — o que não é o caso do client Supabase padrão (PostgREST só expõe
  RPCs declaradas, não `pg_catalog` livre). Então o vetor de exploração real
  depende de o atacante já ter acesso a uma conexão Postgres autenticada
  como `authenticated` (não só a chamadas RPC via PostgREST) — o que é mais
  restrito do que "qualquer usuário logado do app web", mas ainda
  significativamente mais amplo do que o pretendido (só `service_role`).
- **Impacto se explorado**: leitura de qualquer chave em `mcp_kv`, hoje 1
  credencial de terceiro.
- **Uso legítimo perdido ao corrigir**: nenhum identificado (sem
  call-site).

## Decisão proposta

`REVOKE EXECUTE ON FUNCTION public.mcp_kv_get(text, text) FROM authenticated;`

Migration pronta (não aplicada):
`supabase/migrations/20260917060000_e18_revoke_authenticated_mcp_kv_get.sql`
— com precondição/pós-condição no mesmo padrão de
`20260916200000_e17_revoke_public_fn_super_filtro.sql`, confirmando que
`service_role` mantém `EXECUTE` e que `anon`/`authenticated` não têm.

Reversível: `GRANT EXECUTE ON FUNCTION public.mcp_kv_get(text, text) TO authenticated;`

**[REQUER-PO]** — aguardando aprovação. Recomendação adicional fora do
escopo desta migration (decisão do PO, não uma ação técnica): considerar
rotacionar a credencial `higgsfield_creds` como precaução, já que o
histórico exato de quem teve acesso de sessão `authenticated` neste banco
não foi auditado retroativamente nesta investigação.
