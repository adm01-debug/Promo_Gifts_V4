# origin/importado/vps-fabrica/v2/refazer-d3b19f40

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** impede que o cliente envie um arquivo de arte ou de logo no formato ou no tamanho errado (e que dois envios se atropelem), tanto arrastando quanto escolhendo o arquivo — ja esta valendo em producao.
- **Tip / merge-base / main:** tip `23fba842686c2e2a90d15a48be3e8145f3408ae8` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos de 2026-10-08 ("Fabrica Hermes"):

- `e996275112` — "fix(mockup): mesmas regras de upload no seletor e no arraste, dropzone acessivel e sem envio concorrente": aplicar a mesma regra de formato/tamanho nos dois caminhos de envio (clicar e escolher o arquivo, ou arrastar), deixar a area de arraste utilizavel pelo teclado e impedir que um segundo envio comece enquanto o primeiro esta em andamento.
- `23fba84268` — "fix(mockup): trava de envio num wrapper em vez de reindentar o laco do ArtFileUpload (refazer de t_d3b19f40: 402 > 400 linhas)": o *refazer* do titulo. A trava de envio concorrente foi posta num wrapper, em vez de reindentar o laco inteiro, para o arquivo caber no limite de 400 linhas do portao de tamanho.

A branch mexeu em exatamente 3 arquivos (`git diff --name-status c194982c 23fba842`):
`src/components/mockup/AreaCard.tsx` (M), `src/components/mockup/ArtFileUpload.tsx` (M) e
`src/components/mockup/__tests__/ArtFileUpload.test.tsx` (A, 164 linhas).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| **Reaplicacao da entrega inteira** | `main:6246f117a1` (2026-10-29), mesmo assunto do tip da branch | corpo do commit: "Origem: entrega da fabrica VPS v2/refazer-d3b19f40 (**23fba8426**), revisada e reaplicada sobre a main" — cita o SHA do tip desta branch. `git merge-base --is-ancestor 6246f117a1 e4ab7f85` → esta na main. Mesmos 3 arquivos, 267 insercoes |
| **Codigo de `ArtFileUpload.tsx` (todo)** | identico, byte a byte | blob do arquivo: branch `a7ff1c409c1fdf64f665872f0fc1f1bc44e83bc8` = main `a7ff1c409c1fdf64f665872f0fc1f1bc44e83bc8`; `git diff --stat 23fba842 e4ab7f85 -- src/components/mockup/ArtFileUpload.tsx` → vazio |
| **Codigo de `AreaCard.tsx` (todo)** | identico, byte a byte | blob: branch `52640ca96344f220d9360410833eaa1d5b755575` = main `52640ca96344f220d9360410833eaa1d5b755575`; `git diff --stat` → vazio |
| Validacao do original de arte (`validateArtFile`) | `src/components/mockup/ArtFileUpload.tsx:26` | `export function validateArtFile(file: File): string \| null {` |
| Trava sincrona contra envio concorrente (o "wrapper" do commit de refazer) | `src/components/mockup/ArtFileUpload.tsx:92,187-196` | `const uploadingRef = useRef(false)` (L92); `if (uploadingRef.current) { toast.error('Aguarde o envio em andamento terminar'); }` (L187-188); `uploadingRef.current = true/false` (L191, L196). `git log -S"Aguarde o envio em andamento terminar"` na main → unico commit: `6246f117a1` |
| Dropzone acessivel por teclado | `src/components/mockup/ArtFileUpload.tsx:242-250` | `tabIndex={0}` (L242), `aria-busy={isUploading}` (L243), `aria-disabled` (L244), `onKeyDown` que faz `inputRef.current?.click()` so se `!isUploading` (L246-250) |
| Marcador do dropzone usado pelo teste | `src/components/mockup/ArtFileUpload.tsx:263` | `data-testid="mockup-art-file-dropzone"` |
| Aviso de progresso para leitor de tela | `src/components/mockup/ArtFileUpload.tsx:290` | `<p className="text-sm" role="status">` |
| Mesma regra de formato no seletor de logo (PNG/JPG/WebP) | `src/components/mockup/AreaCard.tsx:166,212` | `accept="image/png,image/jpeg,image/webp"` nos dois pontos. `git log -S'accept="image/png,image/jpeg,image/webp"'` na main → unico commit: `6246f117a1` |
| Validacao de logo compartilhada entre seletor e arraste | `src/components/mockup/AreaCard.tsx:18,57` | `export function validateLogoFile(...)` (L18) chamada em `handleFileChange` (L57) |
| Mensagens padrao de recusa de logo | `src/components/mockup/AreaCard.tsx:14-15` | `LOGO_FORMAT_ERROR = 'Formato nao suportado. Use JPG, PNG ou WebP.'`, `LOGO_SIZE_ERROR = 'Arquivo muito grande. Tamanho maximo: 10 MB.'` |
| Marcador do seletor de logo usado pelo teste | `src/components/mockup/AreaCard.tsx:217` | atributo `data-testid` com o valor `mockup-logo-upload-input-<id da area>` |
| **Os 6 testes do arquivo novo (em 3 blocos)** | todos os 6 presentes, com os mesmos nomes | `git show e4ab7f85:.../ArtFileUpload.test.tsx \| grep -E "^\s*(it\|describe)\("` devolve os mesmos 3 `describe` e 6 `it` da branch, na mesma ordem; so os numeros de linha andam (+5) |
| Unica diferenca viva: 2 trechos de estilo no arquivo de teste | `main:41de52be16` (2026-10-29), "chore(mockup): lote das telas dentro dos gates (tamanho, lint e tipos dos testes)" | esse commit é *exatamente* o diff (B) do pacote: `(res) => (release = res)` virou bloco com `{ release = res; }`, e `as HTMLInputElement` virou `querySelector<HTMLInputElement>(...)!`. Nenhum teste, assercao ou mensagem mudou — é lint/tipos |

Resumo da aritmetica: dos 3 arquivos da branch, 2 (os de codigo de producao) sao **identicos** a main por hash de blob; o 3o (teste) difere apenas pelos 2 trechos de formatacao que a propria main aplicou depois, num commit de lint posterior a entrada do trabalho.

## A resgatar

Nada. Nenhum item desta branch ficou de fora da main.

## Risco de fechar esta branch

Nenhum risco pratico. O comportamento que a branch entrega — recusar arquivo de formato/tamanho errado no seletor e no arraste, dropzone utilizavel por teclado, nenhum envio em paralelo — ja esta na main desde 2026-10-29 e o commit da main cita o SHA desta branch como origem. Os 6 testes que protegem esse comportamento tambem estao na main. Apagar a branch nao muda nada no sistema nem desprotege nada.

Unico efeito de fechar: perde-se o historico de que os 2 commits originais vieram da fabrica VPS em 2026-10-08. Esse rastro ja esta preservado no corpo de `main:6246f117a1`, que nomeia a branch e o SHA.

## Nao verificado

- Nao foi executado `npm test` nem `npm run lint` nesta sessao: a tarefa é somente leitura, e a decisao nao depende de os testes passarem hoje (a comparacao é de conteudo entre branch e main, nao de saude da suite). Se o portao de testes da main estiver vermelho, isso é problema da main, nao desta branch.
- Nao foi checado se existe PR aberta associada a esta branch; a decisao se sustenta pelo conteudo do git.
