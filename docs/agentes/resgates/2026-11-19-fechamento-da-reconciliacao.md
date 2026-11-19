# Fechamento da reconciliação byte a byte — 2026-11-19

Este arquivo fecha a fila aberta pela regra do dono: *nenhum trabalho de outro
agente pode ser perdido, nem parcial, e nada se apaga sem certeza*. Ele registra
o **último** lote medido, para que ninguém precise refazer a conta.

O recibo anterior (`2026-11-18-veredicto-byte-a-byte-das-branches.md`) estabeleceu
o método e julgou as branches. Este aqui fecha os arquivos que faltavam.

## O universo medido

573 arquivos de código existem em alguma branch e não na `main`
(`git ls-tree -r`, não `git diff` — a armadilha está documentada no recibo
anterior). Desses, 463 têm conteúdo legível e foram comparados **linha a linha**
contra um índice de **366.139 linhas não-triviais** da `main`:

| | |
|---|---|
| linhas não-triviais nos 463 arquivos | 29.766 |
| linhas que não aparecem em lugar nenhum da `main` | **10.758 (36,1%)** |
| arquivos com 100% das linhas já na `main` | 114 |
| arquivos com mais de 30% de linhas ausentes | 220 |

**36% de linhas divergentes não é 36% de trabalho perdido.** A `main` reescreveu
implementação; o que importa é se alguma **capacidade** ficou sem par. Foi isso
que as três ondas de adjudicação mediram.

## As três ondas

| onda | arquivos | método | resultado |
|---|---|---|---|
| 1 | 25 (os de maior conteúdo ausente) | um agente por arquivo + cético por veredicto de "obsoleto" | 12 superados, 9 obsoletos, **4 a resgatar** |
| 2 | 30 seguintes | idem | 21 superados, 5 obsoletos, **4 a resgatar** (um deles falso positivo) |
| 3 | **98 restantes** (≥25 linhas ausentes) | varredura mecânica de símbolo contra `main` inteira, júri só no que sobrou | 71 limpos, 18 com órfão, 9 sem símbolo |

A onda 3 foi mecânica de propósito: 98 agentes custariam caro para repetir o que
uma varredura de símbolo decide. O júri entrou só nos 27 que a varredura não
fechou.

### Onda 3, detalhada

**71 arquivos**: todo símbolo exportado existe em algum lugar da `main`. Nada a
resgatar.

**18 com símbolo órfão** — 13 têm cópia em `recovery/src-legacy/`, que **está na
main** e foi adjudicada na sua própria fila. Os 5 sem cópia alguma:

| arquivo | veredicto |
|---|---|
| `src/lib/personalization/repositories/technique.repository.ts` | **obsoleto por arquitetura.** Fala com uma API externa (`GRAVACAO_API`, com `X-API-Key`) que **não existe na main**: `git grep GRAVACAO_API origin/main -- src` = zero. A main lê técnica do banco canônico (`useMockupTechniques`, `customization-options.adapter`) e manteve só `priceTable.repository.ts`. Ressuscitar reintroduziria dependência externa que a main removeu |
| `src/components/loading/DetailedProductDetailSkeleton.tsx` | **superado** — a main usa `ProductDetailSkeleton` de `components/layout/SkeletonLoaders`, montado em `src/pages/products/ProductDetail.tsx:278` |
| `src/components/auth/SupabaseConnectionDebug.tsx` | **superado** — debug de conexão na tela de login deu lugar à área de admin `src/components/admin/connections/` (aba, diálogo de detalhes e teste próprio) |
| `src/services/notificationService.ts` | **superado** — virou `src/hooks/ui/useNotifications.ts`, com módulo completo em volta (drawer, preferências, badge stats, e2e) |
| `src/components/products/SmartRecommendationsMock.tsx` | **obsoleto por desenho** — a main tem `SmartRecommendations.tsx`, a versão real |

**9 sem símbolo exportado** (teste, SQL, script):

| arquivo | veredicto |
|---|---|
| `tests/sql/quote-comments/README.md` e `fixture.sql` | **arquivados na main**, em `docs/agentes/resgates/quote-comments/` — feature cancelada pelo dono em `3413dd136`, com o código, os testes e o SQL preservados byte a byte e o passo a passo para reviver |
| `src/components/ui/toast.tsx` | **superado por troca de biblioteca** — a main usa `src/components/ui/sonner.tsx` |
| `tests/pages/legacy-CartSidebar.preservation.test.tsx` | **coberto** — a main tem 2 arquivos de teste de CartSidebar |
| `tests/pages/legacy-MagicUp.search-lifetime.test.tsx` | **coberto** — a main tem 8 arquivos de teste de MagicUp |
| `tests/pages/legacy-filter-voice.test.ts` | **coberto** — `src/pages/products/__tests__/applyVoiceFilters.test.ts` e `tests/lib/voiceFilterPatch.legacy.test.ts` |
| `src/components/search/__tests__/SmartSuggestions.test.tsx` | **obsoleto** — testa o `SmartSuggestions` que o dono apagou por ser mock cravado (ver `2026-11-18-pendencias-abertas.md`). Teste de código que não existe |
| `src/pages/products/seller-carts/__tests__/CartHeaderActions.render.test.tsx` | **obsoleto** — `CartHeaderActions` não existe na main em caminho nenhum |

## O que os resgates viraram (9 PRs)

Cada um é defeito que estava em produção, não melhoria especulativa. Todos com
teste que fica **vermelho** se a correção for revertida — provado por mutação, um
a um.

| PR | o que acontecia em produção |
|---|---|
| #3854 | a RPC do painel de ruptura **não existia no banco**; o selo nunca renderizava |
| #3858 | salvar template que falha **apagava o que o vendedor digitou** |
| #3859 | item inválido entrava no `jsonb` e virava `NaN` no total do orçamento |
| #3860 | excluir/clonar que falha **sumia da tela** — o usuário ia embora achando que fez |
| #3861 | voz "limpar os filtros" limpava só o texto; o catálogo seguia filtrado |
| #3862 | `templateExport` sem nenhum teste — e é o arquivo que sai da empresa |
| #3863 | drawer de estoque montado, testado e **impossível de abrir** |
| #3865 | kit sem preço era beco sem saída: nenhuma ação a não ser recarregar |
| #3866 | `shape` do banco entrava no tipo por cast cego; consulta sem prazo prendia o spinner |

## O que fica, e por quê

**Quatro branches `salvo/*` não podem ser apagadas** — e a trava é a sua própria
regra virada controle de repositório. O ruleset
*"Proteger refs de preservacao (salvo/* com conteudo nao incorporado)"*
(id 27365809, ativo desde 2026-11-16) lista as quatro nominalmente e bloqueia
`deletion` e `non_fast_forward`, com `bypass_actors: []` e
`current_user_can_bypass: never`. Nem o dono passa por cima sem editar o ruleset.

Isso é o certo: o veredicto está na `main`, com os SHAs, então liberar o ruleset
depois é um passo seguro e reversível (`git branch <nome> <sha>`).

**Três decisões que são de produto ou de segurança, não de execução:**

1. **Link público** — a main gera token de compartilhamento e não tem rota para
   apontá-lo. Medido: `onShareList` aparece **uma única vez** em
   `FavoriteListsSidebar.tsx:30`, só a declaração da prop, nunca chamada; nada
   mente ao usuário hoje. Fechar o ciclo exige rota pública nova **e leitura
   anônima de dado de cliente** — decisão de segurança e custo.
2. **Card de sugestão de template padrão** no orçamento vazio — a main já mostra
   o padrão com badge dentro do diálogo "Usar template"; pôr um card antes muda
   o que o vendedor vê primeiro.
3. **Job Deno como required check** — ele roda sobre 45 arquivos e hoje **não
   barra merge** (não está em `.github/required-checks.json`). Promovê-lo muda a
   regra de merge de toda PR futura do repo.

## Nota de método, para quem vier depois

Quatro armadilhas que custaram tempo nesta fila, as três primeiras registradas no
recibo anterior e repetidas aqui porque são fáceis de cair de novo:

1. **Comparar arquivo com arquivo de mesmo caminho.** A `main` move símbolo de
   lugar e às vezes traduz o nome (`useExternalBusinessSectors` →
   `useExternalRamosAtividade`). Procure o símbolo em **toda** a `main`.
2. **Casar nome de teste com regex colada.** `it('...` e `it(\n  '...` são o
   mesmo teste.
3. **Usar `git diff main...branch` para achar arquivo perdido.** Esse diff só
   mostra o que a *branch* mudou; arquivo que a `main` apagou não aparece. Use
   `git ls-tree -r`.
4. **Confiar em veredicto de agente sem conferir o arquivamento.** Um agente da
   onda 2 pediu para recriar a tabela `quote_comments` como trabalho perdido. Ela
   foi **cancelada pelo dono** e está arquivada na `main`. Antes de resgatar,
   procure em `docs/agentes/resgates/`.

## Adendo — a quinta branch `salvo/*`, fora do ruleset

O ruleset 27365809 nomeia **quatro** branches `salvo/*`. Existe uma quinta,
`salvo/claude-fix-resgate-p06-p15-security-261116-2215`, criada em 16/11 e **não
coberta** pela proteção (o ruleset foi atualizado em 17/11 sem incluí-la).
Adjudicada aqui, byte a byte, para que não fique em aberto.

Ela tem **3 arquivos ausentes da `main`** (`git ls-tree -r`, não `git diff`):

| arquivo | veredicto |
|---|---|
| `supabase/migrations/20261101000001_security_invoker_views_p06.sql` | **superado** — é a P06 em escopo completo, da PR #3720 fechada sem merge. A sucessora de escopo reduzido (`20261118172500`, PR #3832) existe justamente porque o escopo completo derrubaria o catálogo: ele inclui `v_products_public`, que lê `internal.mv_product_leaf_category`, sem grant para anon. E a medição de 19/11 mostrou que **mesmo o escopo reduzido** é inseguro hoje — as 5 views restantes também leem bases que `anon` não alcança. Aplicar o escopo completo seria pior. |
| `supabase/rollbacks/20261101000001_rollback.sql` | **superado** — rollback do arquivo acima |
| `e2e/quotes/no-templates.spec.ts` | **obsoleto por decisão de produto** — ver abaixo |

### Por que o teste `no-templates.spec.ts` não deve ser adotado

As cinco asserções dele garantem que **Templates de Orçamento foi removido**:
rota `/orcamentos/templates` redirecionando, nenhum botão "Usar/Salvar template",
nenhum `href` para a rota.

A `main` diz o contrário, e de propósito:

- `src/pages/quotes/QuoteTemplatesPage.tsx:68` — a rota existe
- `src/pages/quotes/QuotesListPage.tsx:167` — o botão navega para ela
- `src/routes/__tests__/quote-templates-route.integration.test.tsx` — há teste de integração da rota
- `src/lib/quotes/applyTemplateToQuote.ts:4` registra: *"a #3817 devolveu a tela de templates"*

A branch partiu da premissa de que a funcionalidade fora removida; o dono decidiu
devolvê-la. Nesta mesma sessão, quatro defeitos **dessa funcionalidade** foram
resgatados e mergeados (#3858, #3859, #3860, #3862). Adotar o teste faria as cinco
asserções falharem na CI — é trabalho que o próprio projeto já superou, não
trabalho perdido.

**Conclusão:** nenhum conteúdo desta branch precisa ser resgatado. Ela pode ser
apagada ou incluída no ruleset, indiferentemente — fica a critério do dono. O
veredicto está aqui para que ninguém precise refazer a medição.
