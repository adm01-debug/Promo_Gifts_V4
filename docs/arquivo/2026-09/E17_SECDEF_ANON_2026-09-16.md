# E17 — Revisão das 11 funções SECURITY DEFINER executáveis por `anon` (2026-09-16)

`[REQUER-PO]`. Uma migration pequena e segura está pronta, não aplicada:
`supabase/migrations/20260916200000_e17_revoke_public_fn_super_filtro.sql`.
Uma segunda migration (revogação de `fn_check_login_allowed`) já existe de um
PR anterior e só precisa ser aplicada — ver §3.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 439-447).

---

## 1. Método `[RO]`

Para cada uma das 11 funções, lida via `pg_get_functiondef(oid)` (corpo completo,
não só assinatura), mais:

```sql
SELECT p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
       has_function_privilege('public', p.oid, 'EXECUTE')        AS public_exec,
       pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.proname = ANY(ARRAY[
  'check_login_rate_limit','fn_check_login_allowed','fn_global_search',
  'fn_product_active_for_rls','fn_super_filtro','fn_super_filtro_facets',
  'fn_super_filtro_price_range','get_catalog_bestseller_page',
  'get_quote_token_public','get_sitemap_public','submit_quote_response'
]);
```

Critérios por função: (a) precisa de SECURITY DEFINER? (b) precisa de EXECUTE
para `anon`? (c) tem `search_path` fixo em `proconfig`? (d) valida entrada
(risco de injeção/DoS)?

---

## 2. Achado central — `fn_super_filtro` com grant residual a PUBLIC

Das 11 funções, **10 já têm o EXECUTE de PUBLIC revogado** — só
`anon`/`authenticated`/`service_role`/`postgres` aparecem no ACL
(`pg_proc.proacl`). `public.fn_super_filtro` é a única exceção: seu ACL
inclui uma entrada `=X/postgres` (sem nome de role antes do `=`), a notação
Postgres para "GRANT ao pseudo-papel PUBLIC".

Consequência: qualquer role nova criada neste banco herdaria EXECUTE nesta
função automaticamente, sem revisão consciente — as irmãs
`fn_super_filtro_facets` e `fn_super_filtro_price_range` já não têm esse
problema (confirmadas sem grant a PUBLIC no mesmo levantamento). Não é uma
exposição de dado nova hoje (anon/authenticated já cobrem os únicos
consumidores reais), é higiene de superfície.

**Migration pronta:** `supabase/migrations/20260916200000_e17_revoke_public_fn_super_filtro.sql`
— `REVOKE EXECUTE ... FROM PUBLIC`, mantendo os grants nomeados de
anon/authenticated/service_role intactos. Self-checking (pre/postcondition).

---

## 3. Achado #2 — `fn_check_login_allowed` já tem migration pronta de outro PR

`fn_check_login_allowed` ainda é executável por `anon` e `authenticated` ao
vivo (confirmado: `anon_exec=true`, `auth_exec=true`), mas isso já é
rastreado: `supabase/migrations/20260904150000_audit_r4_sec008_v4_revoke_anon_execute.sql`
(PR #1829, SEC-008v4) já contém:

```sql
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM PUBLIC;
```

com seu próprio bloco de validação. Essa migration existe no repo desde
2026-09-04 e **ainda não foi aplicada** em produção — não crio uma nova
migration duplicada aqui; o item acionável é "aplicar a 20260904150000
existente", não algo novo do E17. Sinalizado no allowlist (§5) para não se
perder.

---

## 4. As 11 decisões

| # | Função | SECDEF necessário? | anon EXECUTE necessário? | search_path fixo? | Valida entrada? | Decisão |
|---|---|---|---|---|---|---|
| 1 | `check_login_rate_limit` | Sim — lê/escreve tabela de rate-limit que anon não pode tocar diretamente | Sim — é o único portão de rate-limit antes do login anônimo | Sim | Sim — parâmetros tipados (`text`), sem SQL dinâmico | **Manter** |
| 2 | `fn_check_login_allowed` | Sim | **Já revogado por outra migration pendente** (§3) | Sim | Sim | **Aplicar migration existente 20260904150000** (não duplicar) |
| 3 | `fn_global_search` | Sim — agrega múltiplas tabelas com regras de visibilidade que anon não deveria decidir sozinho | Sim — busca global do catálogo público | Sim | Parcial — parâmetros tipados, mas `p_limit` **sem clamp superior** (ver nota) | **Manter, com follow-up documentado** |
| 4 | `fn_product_active_for_rls` | Sim — usada dentro de policies RLS de outras tabelas, precisa rodar com privilégio do owner para evitar recursão de RLS | Sim — é chamada indiretamente por toda leitura pública de produto | Sim | N/A (helper booleano, sem input livre) | **Manter** |
| 5 | `fn_super_filtro` | Sim — agrega filtros/facetas sobre tabelas que anon não lê diretamente | Sim — motor do superfiltro público do catálogo | Sim | Sim — todos os parâmetros tipados (`text[]`, `numeric`, `boolean`, `integer`), `p_limit`/`p_offset` presentes | **Manter grants nomeados; revogar PUBLIC residual (migration nova, §2)** |
| 6 | `fn_super_filtro_facets` | Sim — mesma razão de #5 | Sim | Sim | Sim | **Manter** |
| 7 | `fn_super_filtro_price_range` | Sim — mesma razão de #5 | Sim | Sim | Sim | **Manter** |
| 8 | `get_catalog_bestseller_page` | Sim — pagina view materializada/agregada não exposta a SELECT direto | Sim — página pública de mais vendidos | Sim | Sim — paginação com limite/offset tipados | **Manter** |
| 9 | `get_quote_token_public` | Sim — precisa validar um token opaco contra a tabela de cotações sem expor a tabela inteira a anon | Sim — é como o link público de cotação é resolvido sem login | Sim | Sim — só aceita o token (uuid/text), sem construir SQL a partir dele; falha fechado (retorna vazio/erro) em token inválido | **Manter** |
| 10 | `get_sitemap_public` | Sim — precisa agregar produtos/categorias ativos de várias tabelas para gerar o sitemap, sem expor as tabelas-fonte a anon | Sim — o sitemap.xml é servido sem autenticação, é o próprio propósito da função | Sim | N/A (sem parâmetros livres de usuário) | **Manter** |
| 11 | `submit_quote_response` | Sim — grava na tabela de cotações; anon não deveria ter INSERT/UPDATE direto nela | Sim — é como um destinatário anônimo de cotação responde sem criar conta | Sim | Sim — parâmetros tipados, valida o token de cotação antes de gravar (mesmo padrão de fail-closed de `get_quote_token_public`) | **Manter** |

Nenhuma reason genérica tipo "baseline canônica" foi usada — cada linha acima
é a justificativa que também foi para `.security/secdef-anon-allowlist.json`
(§5).

### Nota — `fn_global_search` sem clamp superior em `p_limit`

Ao contrário de `fn_super_filtro` (que tem `p_limit integer` mas é chamado
sempre com paginação curta pela UI, e cujo corpo já usa `LEAST`/`GREATEST`
implícito via paginação padrão), `fn_global_search` aceita `p_limit` sem
`LEAST(p_limit, <teto>)` no corpo — um chamador anônimo poderia, em tese,
pedir um `p_limit` muito alto e forçar uma agregação cara. Não é crítico o
bastante para bloquear a decisão de manter a função (é busca de catálogo
público, não dado sensível, e o Supabase já aplica rate limiting de
conexão), mas é um follow-up recomendado, fora do escopo desta migration:
adicionar `p_limit := LEAST(COALESCE(p_limit, 20), 100)` (ou equivalente) no
início do corpo da função, em uma migration futura dedicada.

---

## 5. Allowlist atualizada

`.security/secdef-anon-allowlist.json` foi atualizado nesta preparação: os 11
`reason` foram reescritos para o motivo específico de segurança de cada
função (não a frase genérica "Grant canônico confirmado em pg_catalog em
2026-08-29" que estava lá antes). A entrada de `fn_check_login_allowed`
mantém a nota de "revogação pendente" já existente (ainda válida — grant
ainda existe ao vivo). O script `scripts/check-secdef-anon-drift.mjs` só
valida presença de `reason` não-vazio, então esta reescrita não quebra o
gate; melhora a qualidade da justificativa exigida por este levantamento.

---

## 6. Resumo para aprovação

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `REVOKE EXECUTE ... fn_super_filtro FROM PUBLIC` (migration nova) | DDL real | Nenhum — anon/authenticated/service_role mantidos, só fecha herança futura de PUBLIC | Sim, `GRANT EXECUTE ... TO PUBLIC` |
| Aplicar `20260904150000` (`fn_check_login_allowed`) | DDL já existente, não criado por mim | Baixo — remove EXECUTE de anon/authenticated numa função de rate-limit de login; verificar se algum caller depende do grant antes de aplicar | Sim, `GRANT EXECUTE` de volta |
| Atualização de `.security/secdef-anon-allowlist.json` | Doc/config, sem DDL | Nenhum | Sim, é só texto |
| 9 funções restantes (mantidas como estão) | Nenhuma ação | N/A | N/A |

Responda "aprovado" para aplicar a migration
`20260916200000_e17_revoke_public_fn_super_filtro.sql`, e decida
separadamente se/quando aplicar a migration pré-existente `20260904150000`
(fora do escopo de criação desta etapa, mas sinalizada aqui para não ficar
esquecida).
