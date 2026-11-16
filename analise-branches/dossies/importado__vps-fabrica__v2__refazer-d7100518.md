# origin/importado/vps-fabrica/v2/refazer-d7100518

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** no histórico de mockups, pede confirmação antes de apagar um mockup (evita exclusão acidental sem volta) e faz a busca aceitar vírgula, parênteses e % sem quebrar a tela — já está no ar.
- **Tip / merge-base / main:** tip `e8f38246b9b9d036ee082b5db2455a0c6b7da4e1` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Mensagem do único commit da branch (`e8f38246b9`, "Fabrica Hermes 2026-10-08"):
`fix(mockups): exclusão segura e busca sanitizada no histórico de mockups`.

A branch mexeu em exatamente 2 arquivos (`git diff --name-status c194982c5 e8f38246b`):

- `M src/pages/mockups/MockupHistoryPage.tsx`
- `A src/pages/mockups/__tests__/MockupHistoryPage.test.tsx`

Quatro intenções:

1. Trocar a exclusão imediata (`supabase.from('generated_mockups').delete()` direto na página) por um
   diálogo de confirmação (`AlertDialog`) + o serviço `deleteMockupFromDb`, que também limpa as imagens
   no storage.
2. Sanitizar o termo de busca antes do filtro `.or()/.ilike()` do PostgREST (`sanitizeSearchTerm`),
   porque `% _ \ ( ) , . *` mudam a semântica do filtro.
3. Criar o arquivo de testes da página (4 testes).
4. Detalhe declarado no corpo do commit: reescrever o texto do diálogo de "as imagens" para
   "suas imagens", para não contar como asserção `as <Tipo>` no ratchet `check-as-assertions-baseline`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| `sanitizeSearchTerm` (regex `[%_\\(),.*]`) | `src/pages/mockups/MockupHistoryPage.tsx:39` | `git show origin/main:src/pages/mockups/MockupHistoryPage.tsx` → linha 39 idêntica à da branch |
| Uso do termo sanitizado no filtro `.or()` | mesmo arquivo, linhas 75 e 81 | `const term = sanitizeSearchTerm(debouncedSearch);` (75) e `product_name.ilike.%${term}%,...` (81) |
| Import de `deleteMockupFromDb` | mesmo arquivo, linha 25 | linha 25; a função existe em `src/hooks/mockup/mockupGenerationService.ts:474` (`export async function deleteMockupFromDb`) |
| Imports do `AlertDialog` (8 símbolos) | mesmo arquivo, linhas 27-34 | bloco de import idêntico ao da branch |
| Estado `pendingDeleteId` / `isDeleting` | mesmo arquivo, linhas 112-113 | `const [pendingDeleteId, setPendingDeleteId] = useState<string \| null>(null);` |
| Botão de excluir abre o diálogo em vez de apagar | mesmo arquivo, linha 295 e seguintes (`data-testid="mockup-history-delete-btn"`) | diff (B) do pacote não mostra nenhuma alteração nesse trecho: branch e main são iguais ali |
| Diálogo "Excluir mockup?" com Cancelar/Excluir | mesmo arquivo, linhas 334-360 | `AlertDialogTitle` em 342, `AlertDialogCancel` em 348, `AlertDialogAction` em 349 |
| Texto "suas imagens" (correção do ratchet) | mesmo arquivo, linha 344 | `Esta ação não pode ser desfeita. O mockup e suas imagens associadas serão removidos.` — já com "suas", não "as" |
| Teste "filtra a consulta pelo user_id do usuário logado" | `src/pages/mockups/__tests__/MockupHistoryPage.test.tsx:64` | `git show origin/main:...test.tsx \| grep "  it("` |
| Teste "excluir abre confirmação e só chama deleteMockupFromDb após confirmar" | mesmo arquivo, linha 70 | idem |
| Teste "cancelar não exclui" | mesmo arquivo, linha 80 | idem |
| Teste "busca com vírgula, parênteses e % não vaza para o filtro .or()" | mesmo arquivo, linha 139 | idem |

Como o conteúdo entrou: `git log -S"sanitizeSearchTerm" --oneline origin/main -- src/pages/mockups/MockupHistoryPage.tsx`
retorna um único commit — `2a07825034 fix: confirmação de exclusão e sanitização de busca no histórico de mockups (#2108)`,
de 2026-10-09 (`git log -1 --format='%H %ad %s' --date=short 2a07825034`). O mesmo commit trouxe a linha
"suas imagens associadas" (`git log -S"suas imagens associadas" ...` → só `2a07825034`). É o squash-merge
desta branch (daí a branch não ser ancestral da main).

A main hoje é **superconjunto** da branch: o diff (B) do pacote mostra que a main só **adicionou** coisas
em cima do que a branch fez, nada foi removido —

- trata sessão expirada com o diálogo aberto (avisa "Sessão expirada..." e fecha, em vez de falhar calado);
- reconcilia a paginação ao excluir o último item da última página;
- mais 2 testes para esses dois casos (linhas 88 e 103 do arquivo de testes na main).

Essas duas melhorias também vieram no mesmo `2a07825034` (`git log -S"Sessão expirada. Entre novamente"`
→ só esse commit), isto é, foram acrescentadas ao revisar a PR antes do merge.

Os 16 arquivos que aparecem em `git diff e8f38246b origin/main --stat -- src/pages/mockups/` são trabalho
posterior da main em outros arquivos (MockupGenerator, ClientMockupsMenu etc.); a branch nunca os tocou
(ela só tocou 2 arquivos, vide `--name-status` acima).

## A resgatar

Nada. Todos os 12 itens da tabela acima estão na main de hoje, com evidência de arquivo:linha.

## Risco de fechar esta branch

Nenhum risco prático. O comportamento que a branch entregava — confirmar antes de excluir e busca que não
quebra com símbolos — está em produção, e a versão em produção é mais completa que a da branch (trata
sessão expirada e paginação). Manter a branch aberta só cria risco inverso: alguém reaplicar a versão
antiga por cima e **perder** as duas proteções extras que a main ganhou.

## Nao verificado

- Não foi executado nenhum teste nem build nesta análise (tarefa é somente leitura); a conferência foi por
  leitura do conteúdo da main (`git show origin/main:<arquivo>`) e histórico (`git log -S`).
- Não foi verificado o estado do ratchet `check-as-assertions-baseline` em si; apenas que a main já contém
  o texto "suas imagens" que a branch queria deixar lá.
