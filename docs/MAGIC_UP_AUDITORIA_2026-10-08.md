# Auditoria do módulo Magic Up — resumo para a entrevista (08/10/2026)

> Insumo da entrevista do módulo. Escrito em 13/10/2026 sobre o HEAD `3ebd35e6d` da `main`.
> Toda linha citada foi conferida lendo o arquivo no código atual (worktree do cartão `n59` / `t_9763c723`).

## 1. O que foi auditado e de onde vem este resumo

- Duas auditorias do **Magic Up** feitas em 08/10/2026: **front** (série **E**, 27 achados) e
  **backend/edge** (série **F**, 13 achados).
- Os relatórios originais **não existem no repo**: ficaram em arquivos temporários da sessão que os
  produziu. O que dá para rastrear aqui é:
  1. os **cartões de correção** abertos a partir dos achados (séries `m01…m30`; os códigos E-/F- vêm
     no próprio corpo de cada cartão);
  2. os **defeitos, conferidos por leitura direta do código** atual (§2);
  3. as **decisões de produto** que os cartões deliberadamente não resolveram — o plano de cartões
     registra a regra "Magic Up: SÓ correção de defeito (nenhuma decisão de produto que ainda não
     foi entrevistada)" (§3).
- Onde não existe resposta do dono, este documento **pergunta**; nada foi decidido por conta própria.

## 2. Defeitos com cartão de correção já aberto

Estado da coluna **Cartão**: `branch` = já existe commit na worktree do cartão, ainda **não integrado**
ao `main`; `sem branch` = cartão ainda em `todo`/`ready`; `bloqueado` = espera ação do Joaquim.

### 2.1 Front (série E)

| Achado | Defeito (o que o usuário vê) | Onde (conferido) | Cartão / branch | Estado |
|---|---|---|---|---|
| E-3 | Compartilhar monta o `wa.me` **com a imagem dentro do texto** do link — data URL quebra o link e URL http é efêmera | `src/hooks/intelligence/useMagicUpGeneration.ts:480,487` | m01 · `t_2aba974a` · `v2/m01-2610082247` | branch (1 commit) |
| E-4 | Pontuação de qualidade chamada direto por `supabase.functions.invoke<T>`, sem tempo limite nem nova tentativa: score pendurado trava o estado "gerando" com a imagem já paga e invisível | `useMagicUpGeneration.ts:99-100` (contra `src/lib/edge/safeInvokeCall.ts:181-182`, padrão 10 s × 2 tentativas) | m02 · `t_0577d6e9` | sem branch |
| E-7 | Geração **paga** com repetição automática e sem cancelamento: um `timeout` de 60 s dispara nova geração (custo dobrado); não há `AbortController` nem chave de idempotência | `safeInvokeCall.ts:181-182` + `useMagicUpGeneration.ts:157,171` | m03 · `t_93f62834` | sem branch |
| E-8 | Lote engole toda exceção internamente: a fila termina em "concluída" mesmo com 100 % de falha | `useMagicUpGeneration.ts:287-292` | m04 · `t_7329f125` | sem branch |
| E-10 | O prompt gravado (`prompt_text`) é o **resumo em português**, não o prompt que o servidor montou: reabrir o histórico mostra outro texto | `useMagicUpGeneration.ts:109,224` | m05 · `t_d05fb582` | sem branch |
| E-9 | O front tipa e lê campos que a edge não devolve (`model`, `outputChannel`, `qualityMode`, `compositionMode`): toda geração fica registrada como `magic-up-pro`, mesmo em modo rápido | `useMagicUpGeneration.ts:160-164` (tipos), `:186-189` (envio) | m06 · `t_3b42758f` | sem branch |
| E-6 | Efeito do Brand Kit depende de `loadedBrandKit` e re-seta o kit a cada troca de logo: apaga edições não salvas e desfaz a logo principal recém-marcada | `src/hooks/intelligence/useMagicUpState.ts:446-477` (uso em `:452-456`) | m07 · `t_c4be765b` · `v2/m07-2610082247` | branch (1 commit) |
| E-11 | Trocar de produto limpa as variações, mas a resposta **em voo** do produto anterior ainda entra no estado do novo | `useMagicUpState.ts:929-933` | m08 · `t_a4eea9e7` | sem branch |
| E-12 | Técnica e local selecionados vivem em dois estados sincronizados à mão — divergem ao trocar de produto | `useMagicUpState.ts:128-129` | m09 · `t_640274c5` | sem branch |
| E-18 | `useMagicUpState` (1025 linhas) devolve objeto novo a cada render, repassado inteiro aos painéis: cada tecla re-renderiza tudo | `useMagicUpState.ts:947` | m10 · `t_601fb150` | sem branch |
| E-14 | Tempo limite: o cliente `generate-ad-prompt` usa o padrão de **10 s** do `invokeEdge`, enquanto `generate-ad-image` já usa 60 s — prompt longo falha com 504 | `safeInvokeCall.ts:181` vs `useMagicUpGeneration.ts:171`; chamada sem `timeoutMs` em `src/components/magic-up/PromptGenerator.tsx:181` | m17 · `t_6481e595` · `v2/m17-2610082248` (correção revisada na branch de integração `v2/fix-ad-prompt-timeout-int`, ainda fora da `main`) | branch (1 commit) |
| E-20 | Toggle de modo rápido usa `amber-*`/`red-400` literais, fora dos tokens do Blue Premium | `src/pages/magic-up/MagicUpConfigPanel.tsx:614,622,629` | m11 · `t_8bd418ea` · `v2/m11-2610082248` | branch (1 commit) |
| E-22 | Botão que remove a empresa selecionada tem `aria-label="Fechar"` (não diz o que fecha) e limpa a seleção sem confirmação | `MagicUpConfigPanel.tsx:157` | m12 · `t_9eed5f8e` · `v2/m12-2610082248` | branch (1 commit) |
| E-21 | Rótulo "Negative prompt" em inglês e badge de humor da IA mostrando a palavra crua (`warm`) | `src/components/magic-up/MagicUpCreativeControls.tsx:86,98` | m13 · `t_86457ce2` · `v2/m13-2610082248` | branch (1 commit) |
| E-23 | Curadoria não segue o padrão `radiogroup`: contêiner com `tabIndex={0}` e todos os botões tabuláveis, sem navegação por setas | `src/components/magic-up/MagicUpCurationStatus.tsx:26,28,40` | m14 · `t_82e4d63a` · `v2/m14-2610082248` | branch (1 commit) |
| E-24 | Regra de teclado divergente: o comparador faz *wrap* e os dots/thumbnails do resultado param no fim | `src/components/magic-up/MagicUpVariationComparator.tsx:48-50` (com `% total`) vs `src/pages/magic-up/MagicUpResultPanel.tsx:31-45` (sem ciclar) | m15 · `t_6c60b76b` · `v2/m15-2610082248` | branch (1 commit) |
| E-25 | Galeria do histórico: `<div role="button">` **contendo** os botões de favoritar e excluir — interativo aninhado que o axe acusa (`nested-interactive`) | `src/components/magic-up/AdImageResult.tsx:180-181` | m16 · `t_3da5f864` · `v2/m16-2610082248` | branch (1 commit) |

### 2.2 Backend / edge (série F)

| Achado | Defeito | Onde (conferido) | Cartão / branch | Estado |
|---|---|---|---|---|
| F-13 | Import morto (`handleCorsPreflightIfNeeded`) e zod vindo de caminho diferente do módulo compartilhado | `supabase/functions/generate-ad-image/index.ts:1,4`; `supabase/functions/generate-ad-prompt/index.ts:1` | m18 · `t_3746c6d0` · `v2/m18-2610082248` | branch (1 commit) |
| F-05 | Texto livre do usuário (`scenePrompt`, `brandKit`, `campaignBrief` cru, `refinementInstruction`) entra no prompt sem delimitação nem teto: dá para tentar sobrescrever instruções | `generate-ad-image/index.ts:13-41` (schema) e uso no prompt | m19 · `t_9c019135` · `v2/m19-2610082248` | branch (1 commit) |
| F-05/F-07 | `magic-up-score` aceita `imageUrl` e textos sem limite de tamanho: um payload enorme consome custo e memória | `supabase/functions/magic-up-score/index.ts:17-27` (nenhum `max` no schema) | m20 · `t_357bbb90` · `v2/m20-2610082248` | branch (1 commit) |
| F-07 | `logoBase64` sem limite de tamanho decodificado nem lista de formatos | `generate-ad-image/index.ts:15,102` | m30 · `t_d788d80e` · `v2/m30-2610082251` | sem commit |
| F-08 | `word-magic` chama o provedor sem limite por minuto, sem cota (`acquire_ai_quota` não aparece em nenhuma edge de copy) e sem registro de consumo: um laço com `force_regenerate` esgota a chave | `supabase/functions/word-magic/index.ts:22-25,138` | m21 · `t_6b861386` · `v2/m21-2610082248` | branch (1 commit) |
| F-09 | Só existe índice simples por usuário no histórico do Magic Up; faltam os compostos (`user_id, created_at desc`) usados na lista de 50 mais recentes | proposta SQL (nenhum arquivo de código) | m28 · `t_df50fb77` · `v2/m28-2610082249` | sem commit (proposta) |
| F-02 / E-1 | A imagem gerada volta em base64 e é **gravada inteira** em `magic_up_generations.generated_image_url`; o histórico baixa 50 dessas linhas por vez | `useMagicUpGeneration.ts:222` (gravação), `:545` (leitura) | m27 | **bloqueado** (aplicação da proposta SQL de bucket privado é do Joaquim) |
| B F-18 | Acoplamento por *barrel*: o Magic Up importa `@/hooks/mockup` inteiro (re-exporta o gerador de mockup) só para usar um helper | `useMagicUpState.ts:14` vs `src/hooks/mockup/index.ts:2-4` | m29 · `t_2d96aa38` | sem branch |

### 2.3 Achados de teste (verde que não prova)

| Achado | Defeito | Onde (conferido) | Cartão / branch | Estado |
|---|---|---|---|---|
| E-2 | Teste de integração imagina uma função (`product_id`, `factors`, `tier`, `eligible_for_magic_up`) que não existe e asserta contra o próprio mock | `tests/edge-functions/integration/magic-up-score.test.ts:19-28` vs `magic-up-score/index.ts:17-27` | m22 · `t_67ee27ba` · `v2/m22-2610082248` | branch (1 commit) |
| E-15 | O teste "live" era só o shim: nenhum descritor próprio, nenhuma chamada real | `tests/edge-functions/live/magic-up-score.test.ts:9` | m23 · `t_8d850695` · `v2/m23-2610082249` | branch (1 commit) |
| E-5 | E2E intercepta `/rest/v1/magic_up_jobs`, tabela que não existe: os cenários de falha nunca disparam | `e2e/routes/app/magic-up.spec.ts:2` | m24 · `t_e0b31885` · `v2/m24-2610082249` | branch (1 commit) |
| E-16 | `import type { VariationItem } from "@/hooks/useMagicUpState"` aponta para arquivo que não existe mais (o hook mora em `hooks/intelligence`); o `typecheck` só passa porque o teste fica ignorado | `tests/components/magic-up-onda5.test.tsx:9` | m25 · `t_3b5d1e74` · `v2/m25-2610082249` | branch (1 commit) |
| E-26 | Smoke da página só prova "não quebrou": mocka hooks por caminhos que não existem e não exercita o fluxo real | `tests/components/pages/MagicUp.test.tsx:9,15,28,35` | m26 · `t_8098641d` · `v2/m26-2610082249` | branch (1 commit) |

## 3. Decisões de produto ainda sem resposta

Perguntas para a entrevista. Cada uma parte de um fato conferido no código — não de suposição.

**3.1 Onde mora a imagem gerada (hoje: base64 dentro da tabela)**
- Fato: a imagem é gravada inteira em `magic_up_generations.generated_image_url`
  (`useMagicUpGeneration.ts:222`) e o histórico lê 50 linhas por vez (`:545`). O adendo 4 do plano do
  Mockup registra "Magic Up: NÃO usa bucket; imagem base64 dentro de `magic_up_generations`"
  (`docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md:104`), e a etapa 89 (`:119`) decide **só a estrutura**
  de pasta (`magic-up-private/{uid}/…`), deixando "o resto" para esta entrevista.
- Perguntas: a imagem passa a viver em `magic-up-private/{uid}/…` com o caminho no banco? O histórico
  antigo em base64 continua legível para sempre ou tem migração/expurgo? Quem vê a imagem de quem
  (vendedor × coordenador)? O link de compartilhamento vira URL assinada (e com que validade)?

**3.2 Custo por geração**
- Fato: existe modo rápido × pro só na tela (`MagicUpConfigPanel.tsx:614-630`), a geração paga pode
  repetir sozinha (`safeInvokeCall.ts:181-182`), o lote pode falhar inteiro dizendo que concluiu
  (`useMagicUpGeneration.ts:287-292`) e o copy de catálogo (`word-magic`) não tem cota nem registro
  (`word-magic/index.ts:22-25`). O provedor efetivo de cada função vive na tabela `ai_function_routing`
  (`src/hooks/intelligence/useAiRouter.ts:319`), fora do repo.
- Perguntas: qual é o teto de gerações pagas por vendedor/dia? Quem pode usar o modo pro? O que fazer
  quando a cota estoura (fila, aviso, bloqueio)? Existe métrica de custo por cliente?

**3.3 Moderação do criativo gerado**
- Fato: **não existe nenhuma moderação automática** no caminho do Magic Up (nenhuma ocorrência de
  "moderation/moderacao" em `src/components/magic-up`, `src/pages/magic-up`, `generate-ad-image`,
  `generate-ad-prompt`, `magic-up-score`); o único controle é o checklist manual
  `src/components/magic-up/MagicUpBrandSafetyChecklist.tsx:42` ("Checklist de segurança de marca").
- Perguntas: o criativo passa por revisão humana antes de ir ao cliente? Quem aprova? O que é proibido
  (marca de terceiro, pessoa famosa, promessa de preço)? O que acontece com um criativo recusado —
  fica arquivado, some, gera crédito?

**3.4 Compartilhamento público**
- Fato: hoje o compartilhamento é um link de WhatsApp com a imagem embutida
  (`useMagicUpGeneration.ts:487`); no Mockup, a decisão equivalente da entrevista de 08/10 (Q20) é
  enviar link assinado de validade de 7 dias do PDF timbrado, nunca trocando imagem por ficha em
  silêncio. Não existe página pública do criativo do Magic Up.
- Perguntas: o cliente aprova o criativo por link público ou só por WhatsApp? O link carrega a imagem,
  a ficha, ou só um pedido de aprovação? Expira? Quem pode reenviar?

**3.5 Vínculo com orçamento e proposta**
- Fato: `git grep -i magic_up` em `src/components/quotes`, `src/hooks/quotes` e `src/lib/quotes`
  **não retorna nada**: o Magic Up hoje não entra em orçamento nem em proposta (só o Mockup entra, via
  `quote_items.mockup_urls`).
- Perguntas: o criativo aprovado deve ser anexado ao orçamento/proposta? Vira item de custo? Quem paga a
  geração — a empresa ou o cliente?

**3.6 Curadoria**
- Fato: existe status de curadoria por variação (`draft`, `good`, `favorite`, `needs-adjustment`,
  `internal-approved`, `client-approved`, `client-rejected`, `sent-to-client` em
  `src/pages/magic-up/magicUpStrategy.ts:61-69`), gravado na linha (`useMagicUpGeneration.ts:326`) e
  editável na tela (`MagicUpCurationStatus.tsx`). Não há regra de quem pode mudar cada estado, nem
  histórico de quem mudou.
- Perguntas: qual é o fluxo oficial de curadoria (quem marca o quê e em que ordem)? `client-approved`
  pode ser marcado pelo vendedor? O que um estado implica (entra no orçamento, vai para lixeira)?

**3.7 Pendências de módulo que a entrevista deve fechar junto**
- `magic_up` é uma flag que hoje não governa nada e descreve o módulo errado
  (`src/lib/feature-flags.ts:96-98`; cartão `t_bc0b9366`, plano `s49b`).
- O módulo não tem plano próprio documentado (MU-001 em
  `docs/auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md`).
- O provedor/modelo efetivo de IA do Magic Up não está documentado (MU-006, mesma fonte).

## 4. Achados da auditoria que **não** têm cartão rastreável aqui

Códigos citados pelos cartões deste lote: front **E-1, E-2, E-3, E-4, E-5, E-6, E-7, E-8, E-9, E-10,
E-11, E-12, E-14, E-15, E-16, E-18, E-20, E-21, E-22, E-23, E-24, E-25, E-26** (23 dos 27) e backend
**F-02, F-05, F-07, F-08, F-09, F-13** (6 dos 13). Os que **nenhum** cartão deste lote cita são:
front **E-13, E-17, E-19, E-27**; backend **F-01, F-03, F-04, F-06, F-10, F-11, F-12**.

Ressalvas de leitura:
- Cuidado com a numeração: **"B F-nn"** é a auditoria de backend do **Mockup** (aparece, por exemplo, em
  `B F-18`, que virou o cartão `m29` por tocar código do Magic Up). Os códigos acima referem-se só aos
  cartões deste lote, que citam o Magic Up.
- Não encontrar o cartão **não** significa que o achado não exista: os relatórios originais não estão no
  repo. Antes da entrevista vale recuperá-los e responder: **esses achados ainda são válidos? viraram
  cartão em outro lote? algum deles é decisão de produto (e por isso ficou fora) ou defeito esquecido?**

## 5. Estado das correções e como reconferir

- 18 cartões do lote têm **commit próprio em branch** (`v2/m01`, `v2/m07` e `v2/m11`–`v2/m26`);
  **nenhum está integrado ao `main`** nesta data (`git log main --oneline | grep -c "magic-up"` = 0, e
  a branch de integração de E-14, `v2/fix-ad-prompt-timeout-int`, também está fora da `main`). `m28` e
  `m30` ainda não têm commit; `m27` nasceu bloqueado (proposta SQL de bucket privado) e `m29` está em
  `todo`.
- Reconferir um único achado: `grep -n "<linha citada>" <arquivo>` no clone; reconferir o estado de um
  cartão: `git rev-list --count main..<branch>` (1 = corrigido no branch, 0 = ainda não).
- Tipo de divergência esperado neste documento: as linhas foram conferidas no HEAD `3ebd35e6d`; se o
  Lovable commitar mudanças no módulo, os números mudam (o defeito, não necessariamente).
