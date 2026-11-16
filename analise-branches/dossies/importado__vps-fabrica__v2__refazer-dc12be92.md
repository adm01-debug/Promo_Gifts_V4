# origin/importado/vps-fabrica/v2/refazer-dc12be92

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante que a limpeza automatica da conta de teste apague tambem o
  historico de mockups e as imagens guardadas desse usuario, para que os testes do sistema nao deixem
  sujeira acumulada nem imagens antigas atrapalhando a proxima rodada.
- **Tip / merge-base / main:** tip `53473e932aa427e4061b4ab5b20c862cd0f784ef` · merge-base
  `4cf61adaee399733236be7a418b54ae5a154cf9f` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos sobre a edge function `e2e-cleanup` (a rotina que zera os dados do usuario de teste):

1. `ecc9a6ff22` — *fix(e2e-cleanup): apaga generated_mockups e objetos de mockup do usuario de teste*.
   A lista de tabelas limpas nao incluia `generated_mockups`, e nenhum arquivo do bucket `mockup-assets`
   era apagado. O commit (a) acrescenta `generated_mockups` a lista, (b) lista e remove os objetos sob
   `${userId}/logos` e `${userId}/mockups` — e so esses dois prefixos, para nunca alcancar arquivos de
   outro usuario, (c) passa a devolver um campo `errors` na resposta quando o storage falha, em vez de
   engolir o erro.
2. `53473e932a` — *test(e2e-cleanup): asserção real no carregador da suíte co-localizada*. Cria o teste
   co-localizado `index.mockups.test.ts` e faz o carregador em `tests/edge-functions/` afirmar de verdade
   que a suite carregou o codigo de producao (export `mockupSuiteHandlerLoaded`), em vez de passar vazio.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `generated_mockups` na lista de tabelas limpas | `supabase/functions/e2e-cleanup/index.ts:445` | `git show origin/main:supabase/functions/e2e-cleanup/index.ts \| grep -n generated_mockups` → `445: { table: 'generated_mockups', column: 'user_id' },` |
| Constantes do bucket de mockups | `index.ts:95-97` | `const MOCKUP_BUCKET = 'mockup-assets';` / `const MOCKUP_USER_SUBDIRS = ['logos', 'mockups'] as const;` / `const STORAGE_LIST_LIMIT = 1000;` |
| Bloco "6. Storage" que lista e remove os objetos do prefixo do usuario | `index.ts:467-496`, dentro de `if (!nameFilterPrefix)` (modo usuario completo — o unico modo que a branch conhecia) | `index.ts:471` `if (!nameFilterPrefix) {`; `index.ts:473` `for (const subdir of MOCKUP_USER_SUBDIRS)`; `index.ts:491` `await supabase.storage.from(MOCKUP_BUCKET).remove(mockupPaths)` |
| Erro de storage reportado em `errors` em vez de engolido | `index.ts:479` e `index.ts:492` | `errors[\`storage:${MOCKUP_BUCKET}/${subdir}\`] = error.message;` e `errors[\`storage:${MOCKUP_BUCKET}\`] = error.message;` |
| Item 7 do cabecalho documentando a limpeza de mockups | `index.ts:13` | `* 7. Tambem remove os mockups do usuario de teste: linhas de \`generated_mockups\`` |
| Teste co-localizado `index.mockups.test.ts` | existe na main, com os 3 casos da branch (apaga/dryRun/erro de storage) mais casos novos | `git log --diff-filter=A origin/main -- supabase/functions/e2e-cleanup/index.mockups.test.ts` → `c86bf07b39` |
| Export `mockupSuiteHandlerLoaded` (prova de que a suite carrega o codigo real) | `supabase/functions/e2e-cleanup/index.mockups.test.ts:81` | `export const mockupSuiteHandlerLoaded = typeof handler === 'function';` |
| Asserção real no carregador `tests/edge-functions/e2e-cleanup.mockups.test.ts` | identico na main, byte a byte | `git diff --stat 53473e932a origin/main -- tests/edge-functions/e2e-cleanup.mockups.test.ts` → saida vazia; `origin/main:tests/edge-functions/e2e-cleanup.mockups.test.ts:11` `expect(mockupSuiteHandlerLoaded).toBe(true);` |

Por onde entrou: squash-merge `c86bf07b39` — *"[NÃO MESCLAR sem OK do dono] fix(edge): limites e tempo do
Magic Up, word-magic F-08, e2e-cleanup (entregas VPS) (#2744)"*. `git log -S"MOCKUP_BUCKET" --oneline
origin/main -- supabase/functions/e2e-cleanup/index.ts` devolve esse unico commit, e o arquivo de teste
nasceu na main no mesmo commit. Como o repo usa squash-merge, a branch nao e ancestral da main e o
patch-id nao bate — isso nao contradiz nada.

Por que os 2 arquivos ainda "diferem da main": a main seguiu endurecendo a mesma funcao depois
(`51519ef5ac`). As diferencas sao todas acrescimos ou escolhas mais rigorosas da main, nao perda do
trabalho da branch:
- import trocado de `https://esm.sh/@supabase/supabase-js@2.49.4` para `npm:@supabase/supabase-js@2.49.4`;
- CORS por origem (`getCorsHeaders(req)`) em vez de CORS publico;
- allowlist de email agora falha fechada quando a variavel esta vazia (`index.ts`, comentario `E019`);
- auditoria estruturada (`writeAudit`) e falha fechada quando a trilha de auditoria nao responde;
- busca de usuario paginada (a branch usava so a primeira pagina);
- novo modo de escopo por prefixo de nome (`nameFilterPrefix`, `cleanupProtocol: 'quotes-prefix-v2'`);
- no caso "erro de storage", a main responde `500` com `ok: false` (a branch respondia `200` com `ok: true`
  mais `errors`) — mudanca deliberada para nao dar falso verde, e mais segura que a da branch.

## A resgatar

Nada. Todos os itens dos dois commits estao na main, com evidencia linha a linha na tabela acima.

## Risco de fechar esta branch

Praticamente nulo. A limpeza do historico de mockups e dos arquivos do usuario de teste ja esta ativa na
main, e o teste que prova esse comportamento tambem. Fechar a branch nao remove nenhum comportamento do
sistema. O unico ponto de atencao e informativo: a versao da main e mais rigorosa que a da branch quando o
armazenamento de imagens falha — ela devolve erro em vez de dizer "deu tudo certo". Se alguem quiser de
volta o comportamento antigo (mais tolerante), isso seria um pedido novo, nao um resgate desta branch.

## Nao verificado

- Nao executei a suite (`npm test` / o teste co-localizado) nesta sessao: a verificacao foi por leitura do
  codigo da main e comparacao de conteudo, nao por execucao. O comportamento em producao da edge function
  tambem nao foi exercitado.
- O diff (B) de `index.ts` no pacote de evidencia termina antes do fim do arquivo; cobri a lacuna lendo
  `git show origin/main:supabase/functions/e2e-cleanup/index.ts` diretamente, que e a fonte da verdade para
  "esta na main?". Nenhum arquivo ficou sem leitura.
