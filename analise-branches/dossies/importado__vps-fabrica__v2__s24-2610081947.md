# origin/importado/vps-fabrica/v2/s24-2610081947

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Arruma a tela de histórico de mockups — o grosso já entrou em produção no dia 14/11; sobra só um atalho de navegação e uma fragilidade que pode deixar a medida do logo e o nome do cliente aparecerem vazios na lista completa.
- **Tip / merge-base / main:** tip `3b9208471afcdd23f9dd0be4d1194e46459ff2f9` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um commit só (`3b9208471a`, 08/10/2026, "Fabrica Hermes"):
`feat(mockup): historico unico paginado no servidor (aba do gerador vira atalho com os 10 ultimos)`.

Seis intenções, nesta ordem de importância:

1. **Criar um ponto único de leitura do histórico** (`src/hooks/mockup/mockupHistoryAdapter.ts`, arquivo
   novo, 113 linhas): uma lista de colunas, um conversor de linha do banco → objeto de tela
   (`mapMockupHistoryRow`, com queda para o JSONB `area_config` em linhas antigas), uma função de
   exclusão. Antes havia duas leituras diferentes da mesma tabela — a da aba do gerador e a da página
   completa, cada uma com o seu próprio conversor.
2. **Paginar a página completa no servidor** pelo adaptador (`fetchMockupHistoryPage`, `range` +
   `count: 'exact'`, 20 por página).
3. **Transformar a aba do gerador em atalho**: pedir só os 10 mais recentes ao servidor
   (`MOCKUP_HISTORY_PANEL_LIMIT = 10`), mostrar só esses 10 e pôr um link "Ver histórico completo"
   apontando para `/mockups/historico`.
4. **Limpar o texto da busca** antes de montar o filtro `or(...)` do PostgREST (`sanitizeMockupSearch`),
   para não gerar erro HTTP 400.
5. **Tirar o filtro de dono do lado do cliente** (`.eq('user_id', ...)`) nas duas telas, deixando a
   decisão de "quem vê o quê" só para a RLS do banco.
6. **Travar tudo em teste**: `tests/hooks/mockupHistoryAdapter.test.ts` (novo) e um caso novo em
   `tests/components/mockup/MockupHistoryPanel.test.tsx`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| O módulo `mockupHistoryAdapter.ts` | **ESTÁ** — entrou na main em 14/11/2026 pela PR #3647, que no próprio título diz "3 resgates ... gerador de mockup" | `git log origin/main -- src/hooks/mockup/mockupHistoryAdapter.ts` → `e5afe82459 2026-11-14 fix: trem das 5 correções já verdes — recibos, código morto do CRM, 3 resgates, gerador de mockup e aba Marketing (#3647)` |
| A aba do gerador passar a ler pelo adaptador (`fetchRecentMockupHistory`) | **ESTÁ** | `origin/main:src/hooks/mockup/useMockupGenerator.ts:356` → `const data = await fetchRecentMockupHistory(user?.id);` |
| Conversor único linha→tela, com queda para `area_config` | **ESTÁ, movido de lugar**: vive em `mockupGenerationService.ts`, não no adaptador | `origin/main:src/hooks/mockup/mockupGenerationService.ts:97` (`MOCKUP_HISTORY_COLUMNS`), `:137-183` (`fetchMockupHistory`, `logo_width_cm: row.logo_width_cm ?? cfg.logoWidth ?? null`) |
| Lista de colunas explícita no SELECT (em vez de `*`) | **ESTÁ** para a aba do gerador | `origin/main:src/hooks/mockup/mockupGenerationService.ts:139` → `.select(MOCKUP_HISTORY_COLUMNS)` |
| Página completa paginada no servidor | **ESTÁ** — e já estava antes da branch; main faz direto na página, não pelo adaptador | `origin/main:src/pages/mockups/MockupHistoryPage.tsx:70-74` → `.select('*', { count: 'exact' }).range((page-1)*pageSize, page*pageSize-1)` |
| Limpar o texto da busca antes do `or(...)` | **ESTÁ, com outro nome e mais rigoroso** (main remove também `_ . `) | `origin/main:src/pages/mockups/MockupHistoryPage.tsx:36` → `const sanitizeSearchTerm = (raw) => raw.replace(/[%_\\(),.*]/g, '').trim();` |
| Exclusão por uma só função | **ESTÁ, e melhor**: main chama `deleteMockupFromDb(id, userId)` e ainda pede confirmação em diálogo e reconcilia a página depois | `origin/main:src/pages/mockups/MockupHistoryPage.tsx:112-145` e `:331-360` (`AlertDialog` "Excluir mockup?") |
| Aba do gerador mostrar só os **10** últimos | **NÃO ESTÁ — recusado de propósito, com justificativa escrita e teste** | `origin/main:src/hooks/mockup/mockupHistoryAdapter.ts:24` → `export const MOCKUP_HISTORY_PANEL_LIMIT = 200;` e o comentário acima: "com 10 itens a busca e os filtros só alcançariam os 10 últimos". `git log -S"MOCKUP_HISTORY_PANEL_LIMIT = 10" origin/main` → **vazio**: o 10 nunca existiu na main |
| Teste que trava o 10 | **NÃO ESTÁ — a main tem o teste contrário** | `origin/main:src/hooks/mockup/__tests__/mockupHistoryAdapter.test.ts` → `it('pede os 200 do teto T8 ao servidor...')`, `expect(MOCKUP_HISTORY_PANEL_LIMIT).toBe(200)` |
| Tirar o filtro de dono do cliente (só RLS) | **NÃO ESTÁ — recusado de propósito**; main mantém o filtro e trava em teste | `origin/main:src/hooks/mockup/mockupGenerationService.ts:142` → `if (userId) query = query.eq('user_id', userId);`; teste `it('mantém o filtro de dono quando há usuário (guarda do main)')` |
| Botões numerados da paginação da aba (a branch apagou) | **ESTÃO na main** (main manteve e melhorou: quebra de linha em 375px, alvo de toque de 44px) | diff (B) do pacote, `MockupHistoryPanel.tsx`, bloco `Array.from({ length: Math.min(5, totalPages) }` restaurado |
| Link "Ver histórico completo" dentro do painel do histórico | **NÃO ESTÁ no painel** — mas o acesso à tela existe pela barra de ferramentas do gerador | `git grep "historico" origin/main -- src/components/mockup/MockupHistoryPanel.tsx` → vazio; `origin/main:src/pages/mockups/mockup-generator/MockupToolbar.tsx:64` → `historyHref = '/mockups/historico'`; rota em `origin/main:src/routes/tools-routes.tsx:83` |
| `fetchMockupHistoryPage` / `MOCKUP_HISTORY_PAGE_SIZE` / `deleteMockupHistoryItem` / `mapMockupHistoryRow` / `sanitizeMockupSearch` como símbolos | **NÃO ESTÃO** (o comportamento está, os símbolos não) | `git grep -l "fetchMockupHistoryPage" origin/main -- src tests scripts supabase` → vazio (idem os outros quatro) |
| Página completa ler medidas e cliente da coluna própria da tabela | **NÃO ESTÁ**: a main sobrescreve a coluna da tabela pelo valor do JSONB | `origin/main:src/pages/mockups/MockupHistoryPage.tsx:92-97` → `client_name: (cfg.clientName) ?? null, logo_width_cm: (cfg.logoWidth) ?? null, ..., layout_url: null` |
| `data-testid="mockup-history-card"` nos cartões | **NÃO ESTÁ** | diff (B) do pacote, `MockupHistoryPanel.tsx`: a main remove a linha |

**Leitura de conjunto:** esta branch **já passou por resgate**. A PR #3647 (14/11/2026) levou para produção
o módulo, a fiação da aba do gerador e o conversor único. O que ficou fora não ficou por esquecimento: um
agente posterior olhou as três decisões de desenho da branch (10 itens, sem filtro de dono, painel sem
paginação) e decidiu o contrário, escreveu o motivo no código e prendeu em teste. Isso é o cenário (a) do
enunciado — entrou e foi remodelado — somado a uma recusa explícita.

## A resgatar

Só o que **não** contradiz a decisão já tomada na main. Dois itens, ambos pequenos:

1. **`src/pages/mockups/MockupHistoryPage.tsx` — medida do logo, nome do cliente e arquivo de layout lidos
   apenas do JSONB.** Linhas 92-97 sobrescrevem o que veio da tabela pelo que está em `area_config`
   (`logo_width_cm: (cfg.logoWidth) ?? null`) e fixam `layout_url: null`. A branch resolvia isso mandando a
   página pelo mesmo conversor da aba do gerador, que lê a coluna da tabela e só cai para o JSONB quando a
   coluna está vazia (`mapMockupHistoryRow`, linhas 36-61 do arquivo da branch). **Por que importa:** se um
   mockup for gravado sem o espelho no JSONB, a lista completa mostra "—" no tamanho do logo e no cliente,
   e o vendedor perde a informação na tela que usa para consultar o histórico. Hoje isso **não está
   quebrado** — a gravação da main escreve os dois lugares (`mockupGenerationService.ts:239-262`,
   `logo_width_cm: area.logoWidth` **e** `area_config: { logoWidth: ... }`) —, então é fragilidade, não
   defeito vivo.
2. **`src/components/mockup/MockupHistoryPanel.tsx` — link "Ver histórico completo" no cabeçalho do
   painel.** A branch punha o link na descrição do cartão. **Por que importa:** quem está na aba
   "Histórico" dentro do gerador não tem, ali, caminho para a lista completa; o link existe só na barra de
   ferramentas do topo. É um acréscimo de 3 linhas que não briga com a escolha dos 200 itens.

**Explicitamente NÃO resgatar** (seria desfazer decisão já tomada e documentada na main):
o teto de 10 itens na aba do gerador; a retirada dos botões numerados de página; a remoção do filtro
`user_id` do lado do cliente; os dois testes da branch que travam esses pontos.

## Risco de fechar esta branch

Baixo. Fechar e apagar esta branch não derruba nada em produção e não perde a parte principal do trabalho —
ela está na main desde 14/11 (PR #3647). Perde-se apenas a referência dos dois itens acima e o texto do
raciocínio original. Como os dois itens estão descritos aqui com arquivo e linha, o risco prático é o de
ninguém ler este dossiê.

O risco maior é o inverso: alguém reabrir esta branch e mergeá-la como está. Isso (i) voltaria a aba do
gerador para 10 mockups, fazendo a busca e os filtros dessa aba só alcançarem os 10 últimos — o vendedor
"perderia" mockups que existem; e (ii) tiraria o filtro de dono do lado do cliente, deixando a separação
entre usuários dependendo só da RLS do banco. O segundo ponto é decisão de negócio ("quem vê o quê") e não
deve ser mexido sem o dono.

## Nao verificado

- **Se a fragilidade do item 1 já machuca alguém em produção.** Para afirmar isso seria preciso contar, na
  tabela `generated_mockups`, as linhas com `logo_width_cm` preenchido e `area_config->>'logoWidth'` nulo.
  Não fiz essa consulta: a tarefa era decidir o destino da branch, e a resposta não muda o veredito.
- **Se a RLS de `generated_mockups` isola corretamente por usuário.** A branch apostava que sim ao remover o
  filtro do cliente; eu não li as policies. Como a main mantém o filtro explícito, a dúvida não cria risco
  hoje — mas ela precisa ser respondida antes de qualquer tentativa futura de remover aquele filtro.
- **Arquivos sem leitura:** nenhum. O pacote trouxe os dois diffs dos 6 arquivos e não veio truncado
  (`grep -c TRUNCADO` no pacote → 0).
