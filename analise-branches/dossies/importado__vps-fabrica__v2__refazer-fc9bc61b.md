# origin/importado/vps-fabrica/v2/refazer-fc9bc61b

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** guarda a unica lista que existe dos 40 problemas encontrados no modulo Magic Up (o gerador de imagens de anuncio) e as 7 perguntas de negocio que o dono ainda precisa responder sobre ele — os relatorios originais nao estao no repositorio e este arquivo nao esta na `main`.
- **Tip / merge-base / main:** tip `baec0686ba616cabf530c7c7540fc05d02e92df1` · merge-base `0a64ef316e4fed7a44c0b8791b8058fae2bb43bd` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, os dois de documentacao (`c5038e4b15` "docs(magic-up): resumo das auditorias de front e
backend para a entrevista do modulo" e `baec0686ba` "docs(magic-up): corrige 3 fatos verificaveis do
resumo"). O conteudo e um unico arquivo novo, `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` (159 linhas), que:

1. consolida duas auditorias do Magic Up de 08/10/2026 — front (serie **E**, 27 achados) e backend/edge
   (serie **F**, 13 achados) — cujos relatorios originais, diz o proprio documento, "nao existem no repo:
   ficaram em arquivos temporarios da sessao que os produziu";
2. amarra cada achado a um defeito conferido linha a linha no codigo e ao cartao de correcao (`m01`…`m30`);
3. lista os achados que **nenhum** cartao cobriu (front E-13, E-17, E-19, E-27; backend F-01, F-03, F-04,
   F-06, F-10, F-11, F-12);
4. registra **7 decisoes de negocio** em aberto para a entrevista do dono (onde mora a imagem gerada, teto
   de custo por geracao, moderacao do criativo, compartilhamento publico, vinculo com orcamento,
   curadoria, pendencias do modulo).

Zero codigo: a branch nao toca `src/`, `supabase/`, `scripts/` nem `.github/`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O arquivo `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` | **NAO ESTA** — nunca existiu na main | pacote, diff (B): `deleted file mode 100644 ... -159 linhas`; `git log --oneline origin/main -- docs/MAGIC_UP_AUDITORIA_2026-10-08.md` → vazio; `git ls-tree -r --name-only origin/main -- docs \| grep -i magic` → so `ADR_FRONTEIRA_MOCKUP_MAGICUP.md` e `MAGIC_UP_ONDA5_A11Y.md` |
| Equivalente: doc de decisoes/entrevista do modulo | **NAO ESTA** para o Magic Up (existe para o Mockup) | `origin/main:docs/MOCKUP_DECISOES_2026-10-08.md` existe; nenhum `MAGIC_UP_DECISOES*` em `git ls-tree -r --name-only origin/main -- docs` |
| Lista dos achados E-/F- (inclusive os sem cartao) | **NAO ESTA** em nenhum outro arquivo da main | `git grep -n "MAGIC_UP_AUDITORIA" origin/main` só retorna os veredictos de branch (`analise-branches/auditoria-261115/*`), que citam o arquivo mas nao reproduzem o conteudo |
| Defeito E-3 (link de WhatsApp com a imagem dentro do texto) | **CORRIGIDO na main** | `git grep -n "wa.me" origin/main -- src/hooks/intelligence/useMagicUpGeneration.ts` → zero |
| Defeito E-7 (geracao paga repetindo sem chave de idempotencia) | **CORRIGIDO na main** | `origin/main:src/lib/edge/safeInvokeCall.ts:30,60,180,193-194` (`idempotencyKey`, header de idempotencia) |
| Defeitos E-20/E-21/E-22 (cores fora do padrao, rotulo em ingles, botao sem rotulo claro) | **CORRIGIDOS na main** | `git grep -n "amber-\|red-400" origin/main -- src/pages/magic-up/MagicUpConfigPanel.tsx` → zero; `aria-label="Fechar"` → zero; `"Negative prompt"` em `src/components/magic-up` → zero |
| Defeito E-23 (curadoria sem padrao de radiogroup) | **CORRIGIDO na main** | `origin/main:src/components/magic-up/MagicUpCurationStatus.tsx:62` `role="radiogroup"`, `:79` `tabIndex={active ? 0 : -1}` |
| Defeito E-25 (botao dentro de botao na galeria) | **CORRIGIDO na main** | `git grep -n 'role="button"' origin/main -- src/components/magic-up/AdImageResult.tsx` → zero |
| Defeito E-16 (teste apontando para arquivo que nao existe) | **CORRIGIDO na main** | `git grep -n "hooks/useMagicUpState" origin/main -- tests` → zero |
| Defeito E-5 (E2E interceptando tabela inexistente) | **TRATADO na main** | `origin/main:e2e/routes/app/magic-up.spec.ts:5` documenta "uma tabela que NAO existe no" |
| Defeito F-13 (import morto nas edges) | **CORRIGIDO na main** | `git grep -n "handleCorsPreflightIfNeeded" origin/main -- supabase/functions/generate-ad-image/index.ts supabase/functions/generate-ad-prompt/index.ts` → zero |
| Defeito F-08 (copy de catalogo sem cota) | **CORRIGIDO na main** | `origin/main:supabase/functions/word-magic/index.ts:185` "Quota atomica do usuario (`acquire_ai_quota`…)" |
| Defeito F-07 (logo sem limite de tamanho) | **CORRIGIDO na main** | `origin/main:supabase/functions/generate-ad-image/index.ts:85-91` "Guarda do `logoBase64`" |
| Defeito E-4 (pontuacao de qualidade sem tempo limite nem nova tentativa) | **NAO ESTA — defeito vivo** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:100` chama `supabase.functions.invoke<MagicUpQualityDiagnosis>` direto, fora do padrao `safeInvokeCall` |
| Defeito F-02/E-1 (imagem inteira em base64 gravada na tabela) | **NAO ESTA — defeito vivo** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:223` `generated_image_url: data.imageUrl` e leitura em `:543` |
| Defeito E-10 (historico mostra o resumo em portugues, nao o prompt enviado) | **NAO ESTA — defeito vivo** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:225` `prompt_text: deps.fullPromptPreview \|\| deps.effectivePrompt` |
| Defeito E-8 (falha engolida: a tela avisa erro mas quem chamou nao sabe) | **NAO ESTA — defeito vivo** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:288-291` `catch` → `toast.error(...)` sem repropagar |
| Decisao 3.3 (moderacao do criativo gerado) | **NAO ESTA — segue em aberto** | `git grep -ni "moderation\|moderacao" origin/main -- src/components/magic-up src/pages/magic-up supabase/functions/generate-ad-image supabase/functions/magic-up-score` → zero |
| Decisao 3.5 (criativo entra no orcamento/proposta?) | **NAO ESTA — segue em aberto** | `git grep -rni "magic_up" origin/main -- src/components/quotes src/hooks/quotes src/lib/quotes` → zero |
| Veredito anterior desta branch | main registra **DESCARTAR** (de 15/11), decisao que este dossie revisa | `origin/main:analise-branches/auditoria-261115/veredito_lote03.md:148` e `VEREDITO_106_APAGADAS.md:168,176` |

## A resgatar

1. **`docs/MAGIC_UP_AUDITORIA_2026-10-08.md` — o documento inteiro, com cabecalho de data e aviso de
   "retrato de 13/10/2026".** Por que importa: e a unica copia que existe no repositorio da lista dos 40
   achados das auditorias de 08/10 (os relatorios originais foram perdidos, §1 do proprio documento) e dos
   11 achados que nenhum cartao cobriu (`E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10, F-11,
   F-12`). Fechar sem resgatar apaga a memoria desses 11 achados para sempre.
2. **As 7 perguntas de negocio da secao 3** (onde mora a imagem gerada e quem ve a de quem; teto de
   gasto por vendedor/dia e quem usa o modo "pro"; se o criativo passa por aprovacao humana e o que e
   proibido; se o cliente aprova por link publico e se ele expira; se o criativo entra no orcamento e
   quem paga a geracao; qual e o fluxo oficial de curadoria; a flag e a documentacao do modulo). Por que
   importa: duas delas (moderacao e vinculo com orcamento) foram reconferidas hoje e continuam sem
   nenhuma implementacao na main — sao decisoes do dono, nao trabalho de codigo.
3. **Os 4 defeitos ainda vivos** (`E-4`, `E-8`, `E-10`, `F-02/E-1`), com as linhas atualizadas de
   `src/hooks/intelligence/useMagicUpGeneration.ts` citadas na tabela acima. Por que importa: `F-02` e
   custo e lentidao reais (cada imagem inteira guardada dentro da tabela, 50 por pagina no historico) e
   `E-4` pode travar a tela em "gerando" com a imagem ja paga.

Observacao de escopo: o mesmo arquivo, byte a byte, esta em outras tres branches (`refazer-0b0b9032`,
`refazer-b14fb844`, `refazer-d295390f` — `origin/main:analise-branches/auditoria-261115/veredito_lote03.md:148`).
Resgatar uma vez resolve as quatro; as outras tres passam a ser duplicata.

## Risco de fechar esta branch

Perde-se a unica lista existente dos problemas encontrados no gerador de imagens de anuncio e das
perguntas que o dono ainda nao respondeu sobre ele. Treze dos achados listados ja foram corrigidos na
main (evidencia acima), entao o prejuizo nao e "codigo perdido": e **memoria perdida**. Em especial:
os 11 achados que nunca viraram cartao deixam de ter qualquer registro no repositorio, e as decisoes de
negocio (quem ve a imagem de quem, teto de gasto, aprovacao do criativo, link para o cliente) voltam a
ser invisiveis — o modulo continua gerando imagem paga sem teto de custo documentado e sem nenhuma
moderacao, e ninguem lembra que isso esta pendente. Risco de resgatar: baixo e so de documentacao (PR
docs-only, os gates de codigo nao rodam — E14 do AGENTS.md); o unico cuidado e deixar claro no cabecalho
que as linhas citadas sao de 13/10/2026 e que 13 itens ja foram corrigidos, para ninguem reabrir
correcao feita.

## Nao verificado

- Os achados **E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10, F-11, F-12** nao tem como ser
  conferidos: o documento so diz que nenhum cartao os cita, nao diz qual e o defeito. Os relatorios
  originais nao estao no repositorio (§1 e §4 do documento). Sem eles nao da para afirmar se cada um
  e defeito vivo, decisao de produto ou ja resolvido.
- **E-6, E-9, E-11, E-12, E-14, E-15, E-18, E-24, E-26, F-05, F-09, m29** nao foram reconferidos um a um
  nesta sessao (so os 17 itens da tabela acima foram). `E-18` ficou parcial: o hook citado como tendo
  1025 linhas hoje tem 851 (`git show origin/main:src/hooks/intelligence/useMagicUpState.ts | wc -l`),
  mas nao verifiquei se a causa (objeto novo a cada render) mudou.
- Se as 18 branches de cartao (`v2/m01`, `v2/m07`, `v2/m11`–`v2/m26`) ainda existem e qual delas carrega
  a correcao que entrou na main: as correcoes estao na main (evidencia por comportamento, acima), mas nao
  rastreei por qual caminho entraram.
