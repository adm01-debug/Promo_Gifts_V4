# Onde o trabalho parou — 2026-11-16

Documento de passagem. A sessão que produziu isto acabou por limite de tokens; o dono
continua em outra conta. Aqui está o que está feito, o que falta e onde cada coisa mora.

## Feito e confirmado em produção

| O quê | Prova |
|---|---|
| Edge `mockup-assistant` publicada | `index.ts` em produção com sha256 `10243c20eaeb9b1c`, idêntico ao da `main`. Run `43778742553`, 4 jobs verdes. |
| Migration SEC-001 aplicada | Run `43840519779`, 4 jobs verdes. Efeito medido: funções de gatilho de `public` executáveis por `anon` caíram de **115 para 9** (106 revogadas). `authenticated` segue em 115 — a migration não mexe nele, de propósito. |
| Mouse move o destaque na lista de empresas | PR #3690 mergeada em `22db4dcbe7`. Sem a correção o `Enter` gravava o mockup no nome da empresa errada. |

## Aberto

**PR #3689** (`claude/chore-dossies-branches-261116-0154`) — 160 dossiês + dados brutos.
Não mergeada. O `Gate E23 (gitleaks)` reprovou com "leaks found: 5"; as 5 eram a mesma
string de exemplo (um Access Key ID que dois dossiês citavam ao explicar o que as branches
`recuperado/fix-gitleaks-*` queriam liberar). Não é credencial viva — a mesma string está
na `main` em `docs/redeploy/`, onde passa porque `.gitleaks.toml:39` isenta `docs/.*`.
Foi redigida nos dois dossiês, sem ampliar a allowlist. Conferir o gate e mergear.

## As 7 pendências que não estavam em arquivo nenhum

1. **Levar ao dono as 18 decisões de negócio** com evidência. Estão em
   `analise-branches/dados/vereditos-160-branches.json`, veredito `DECISAO_HUMANA`.
   Exemplos: senha de 8 caracteres no login, quantos mockups comparar lado a lado,
   produto sem medidas cadastradas pode gerar mockup, acesso `anon` a `fn_check_item_fits`.
2. **Rascunho de orçamento em edição.** A `main` **já** devolve o rascunho em orçamento
   NOVO (`src/hooks/quotes/useQuoteBuilderState.ts:257` `restoreEnabled: !isEditMode &&
   !hasIncomingHandoff`, `onRestore` com `if (!isEditMode)`). Falta só no orçamento EM
   EDIÇÃO: quem fecha a aba editando um orçamento existente refaz na mão. A branch
   `claude/resgate-3390-261113` tem 272 linhas de teste prontas.
3. **SHA digitado errado em `.github/SENTINEL_SHA_ALLOWLIST.txt:18`** — defeito vivo na
   `main`. É governança, então a PR fica aberta para o dono.
4. **Dossiê do Magic Up**: 7 defeitos abertos + 6 decisões de negócio, a consolidar.
5. **Recibos E15**: trazer link de execução e MD5, e corrigir sha256 errados no ledger.
6. **Roteador de IA**: filtrar candidatos ANTES da chamada paga, e corrigir a dupla
   contagem de cota por reserva `pending` não finalizada. Afeta 18 funções; o
   `trends-insights` precisa entrar no mesmo commit.
7. **19 edge functions em produção divergem do repositório** (deploy feito por fora do
   workflow). Enquanto durar, qualquer deploy amplo apaga correção que só existe em
   produção — por isso o deploy do `mockup-assistant` foi feito com `function_name`,
   uma função só.

## Dois defeitos achados e ainda não corrigidos

- **Filtro de catálogo por voz está pronto e desligado.**
  `src/pages/products/applyVoiceFilters.ts` tem 37 casos de teste e cobre 12 filtros
  (cor, categoria, material, gênero, público-alvo, faixa de preço, estoque mínimo, kit,
  destaque, novidade, personalizável, promoção) — e **nenhum chamador**: as únicas
  referências no repositório são o arquivo e o teste dele. A função foi extraída em
  18/06 de `FiltersPage.handleVoiceAction`; em 21/08 o commit `8bd948eb37` **criou do
  zero** `src/pages/products/FiltersPage.tsx` (819 inserções, 0 remoções), sem a voz, e
  o antigo `src/pages/FiltersPage.tsx` deixou de existir. As rotas `/produtos` e
  `/filtros` renderizam a página nova (`src/routes/lazy-pages.ts:37`). Hoje, falar
  "camiseta azul em estoque" só joga `category`, `color` e `material` como texto na
  caixa de busca (`src/components/search/useGlobalSearch.ts:189-196`); nenhum filtro é
  marcado e "em estoque" nem entra na conta.
- **`fn_check_item_fits(uuid,uuid,numeric)`**: produção tem `GRANT EXECUTE` para
  `authenticated` e **nenhuma migration da `main` o declara** — um banco reconstruído a
  partir das migrations nasceria sem a permissão. A mesma consulta mostrou `anon` com
  `EXECUTE` também. A função não é `SECURITY DEFINER`, então o RLS continua valendo.

## Não mergear inteira

**`codex/fix-gate1-kit-pdf-types-261109-2252`** reverteria 4 coisas em produção. A pior:
`src/lib/kit-builder/snapshot/read-draft.ts` perde o `.default({enabled:false})`, e kit
salvo com personalização vazia (`{}`) para de abrir — formato de **15 dos 21 kits em
produção**. Também desfaz a guarda de exclusão de orçamento negada pelo banco e o
`usage_count: 0` na cópia de template. Dela, copiar só itens isolados.

## Onde está cada coisa

- `analise-branches/dossies/` — 169 dossiês, um por branch, com veredito e evidência.
- `analise-branches/dados/` — a medição bruta. Comece pelo `LEIA-ME.md`.
- Refs de preservação no GitHub (árvore igual à da `main`; o que importa são os pais;
  **não são para mergear**): `salvo/261116-pc-tips` (379 pontas do PC do dono),
  `salvo/261116-container` (36 pontas do container), `salvo/261115-preservacao` (61),
  e o ref de órfãos criado em 16/11.

## A armadilha, para quem continuar

"O arquivo difere da `main`" **não** quer dizer que o trabalho ficou de fora. A `main`
andou muito e o repositório usa squash-merge, então toda branch de PR já mergeada aparece
como divergente e com patch-id diferente. Em 7 branches grandes, 191 arquivos que pareciam
ausentes existiam no merge-base e foram apagados pela própria `main` depois.

Por isso todo veredito que autorizava fechar passou por um segundo agente encarregado de
refutá-lo. Ele derrubou **15 de 87**. Sem ele, 15 branches teriam sido apagadas com
trabalho de outro agente dentro.
