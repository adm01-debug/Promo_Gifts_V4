# origin/importado/vps-fabrica/v2/s48b-2610081950

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada no sistema — e so correcao de texto nos relatorios internos sobre o gerador de mockup (onde os arquivos ficam guardados e se ele usa IA ou nao). Esse acerto ja esta valendo na versao de producao.
- **Tip / merge-base / main:** tip `532c9f3e2714333e2e3a96b3db6017ab5b4bbc48` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`532c9f3e27`, 09/10/2026): `docs(mockup): corrigir bucket de storage, nanobanana e BUG-016`.
A branch **nao toca uma linha de codigo**: `git diff --name-status c194982c5 532c9f3e2` devolve 4 arquivos, todos
em `docs/` (nenhum `src/`, nenhum `supabase/`). A intencao era acertar quatro registros errados na documentacao
interna do fluxo de mockup:

1. corrigir o nome do bucket de arte (`art-files` estava errado; o certo e `mockup-art-files`), separando-o do
   bucket do fluxo de orcamento/Bitrix;
2. derrubar o BUG-016 ("`generate-mockup/index.ts` e PLACEHOLDER — feature completamente quebrada"), que estava
   como "Documentado / pendente" sendo que a funcao existe e funciona;
3. reclassificar o item N10 (motor de IA "NanoBanana" separado) de "parcial" para "morto/abandonado", porque a
   rota de IA foi removida e a edge separada nunca existiu — hoje o gerador e um compositor de canvas sem IA;
4. atualizar os numeros de linha das rotas, que tinham saido do lugar.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Numeros de linha das rotas de ferramentas (`tools-routes.tsx:48-79`, `product-routes.tsx:22-44`, `/mockup-generator` → `:59`, `/simulador` → `:50` etc.) | **Esta, identico** em `docs/estado/04_FERRAMENTAS_IA.md` | `git show origin/main:docs/estado/04_FERRAMENTAS_IA.md \| sed -n '17,33p'` devolve exatamente os valores que a branch escreveu (48-79, 22-44, 56, 59, 60, 61, 62, 63, 50). O diff (B) do pacote nem lista essa secao como divergente — a main e a branch sao iguais ali |
| Bucket certo do mockup (`mockup-assets` para a composicao, `mockup-art-files` para a arte enviada) | **Esta** em `docs/estado/04_FERRAMENTAS_IA.md:50` e `:51`, com mais detalhe que a branch (aponta o upload na edge em `supabase/functions/generate-mockup/index.ts:498` e a limpeza em `mockupGenerationService.ts:521`) | `git show origin/main:docs/estado/04_FERRAMENTAS_IA.md \| grep -n "mockup-art-files\|mockup-assets"` → linhas 50 e 51. O nome errado `` `art-files` `` nao aparece mais nesse arquivo na main (contagem 0) |
| "O gerador de mockup nao usa IA; e compositor de canvas determinístico" | **Esta** na main em tres lugares — `04_FERRAMENTAS_IA.md:50`, e em `12_PLANEJADO_E_SUGERIDO.md` nos itens N09, N10 e I03 e na linha "Must Have — Mockups IA" | diff (B) do pacote, arquivo `docs/estado/12_PLANEJADO_E_SUGERIDO.md`: a main **acrescenta** a mesma ressalva em N09, I03 e "Must Have (`:605`)", todos citando `supabase/functions/generate-mockup/index.ts:13`, `:446` |
| N10 reclassificado para ⬛ MORTO_OU_ABANDONADO + citacao da migration `20260510152131_cleanup_orphan_routing_generate_mockup_nanobanana.sql` | **Esta, texto identico** em `docs/estado/12_PLANEJADO_E_SUGERIDO.md:56` | `git show origin/main:docs/estado/12_PLANEJADO_E_SUGERIDO.md \| grep -n "N10"` → linha 56 com a frase da branch palavra por palavra. A migration citada existe na main (`git cat-file -e origin/main:supabase/migrations/20260510152131_...sql` → ok) |
| Recontagem do resumo (parcial 14→13, morto 6→7) | **Esta** em `docs/estado/12_PLANEJADO_E_SUGERIDO.md:405` e `:407` | `grep -n` na main: `🟨 IMPLEMENTADO_PARCIAL \| 13` (linha 405) e `⬛ MORTO_OU_ABANDONADO \| 7` (linha 407) — exatamente os numeros da branch |
| BUG-016 deixa de ser pendente | **Esta**, em versao melhor: `docs/bugs/BUG_AUDIT_INTEGRATION_ROUND3_20260526.md:19` e `:101` | `grep -n "BUG-016"` na main → "✅ Resolvido depois do Round 3 (ver nota)". A main documenta a cronologia em git (`3c74e2840` tinha o placeholder, `a2032a700` virou stub 501, `ed77949ed` restaurou o compositor), enquanto a branch dizia "falso positivo". Mesmo resultado pratico (bug fechado), com prova melhor na main |
| Correcao do bucket dentro de `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-26.md` | **O arquivo nao existe mais na main** — foi apagado de proposito, junto com outros 92 documentos de `docs/`, no commit `46275a9b27` (19/10/2026, PR #2284). O fato corrigido sobreviveu em `docs/estado/04_FERRAMENTAS_IA.md:51` | `git log --diff-filter=D origin/main -- docs/MATRIZ_FLUXOS_CRITICOS_2026-08-26.md` → `46275a9b27`; `git show --diff-filter=D --name-only 46275a9b27 -- docs/ \| wc -l` → 93 |

## A resgatar

Nada. Os quatro pontos da branch estao na main de hoje: tres deles com o mesmo texto ou texto melhor, e o
quarto dentro de um documento que a main arquivou de proposito (o fato corrigido migrou para `docs/estado/`).

## Risco de fechar esta branch

Praticamente zero. A branch so mexe em texto de documentacao interna — nao altera tela, regra de negocio,
banco de dados nem integracao. O unico "risco" seria perder a frase corrigida dentro do documento
`MATRIZ_FLUXOS_CRITICOS_2026-08-26.md`, e esse documento foi retirado do projeto de proposito em 19/10/2026
num arquivamento de 93 documentos antigos; a informacao certa (qual pasta guarda a arte do mockup) continua
registrada no documento que esta em uso.

## Nao verificado

- Nao foi conferido se a divergencia de redacao do BUG-016 ("falso positivo", na branch, contra "era real e
  foi corrigido depois", na main) tem algum efeito em relatorio de auditoria externo. Nenhuma das duas versoes
  deixa o bug aberto, por isso nao foi tratado como decisao de negocio.
- 0 arquivos ficaram sem leitura: o pacote nao indicou TRUNCADO e os 4 arquivos da branch tiveram os dois diffs
  lidos integralmente.
