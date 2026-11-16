# origin/claude/fix-email-remetente-resend-261112-0034

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante que os relatorios automaticos por e-mail saiam de verdade (pelo dominio que o provedor aceita) e que um relatorio que falhou seja tentado de novo, em vez de ser dado como enviado.
- **Tip / merge-base / main:** tip `eb756894533a132d439fb952e017f780ba1d4f09` · merge-base `caeb61be00a4eeef04ef5f5cde5869d9d3719183` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos sobre o envio de e-mail pelo Resend:

- `111562745e` — tres coisas: (1) trocar o remetente de `noreply@promogifts.com.br` para
  `noreply@promobrindes.com.br`, porque esse e o unico dominio verificado na conta Resend e o antigo
  era recusado com 403; (2) em `process-scheduled-reports`, desestruturar `{ value }` do retorno de
  `resolveCredential`, que antes era usado como objeto e mandava o header literal
  `Bearer [object Object]` (correcao vinda da PR #3375); (3) um teste de regressao que varre
  `supabase/functions` procurando esse padrao, com escape completo de regex para nao reabrir o alerta
  CodeQL `js/incomplete-sanitization`.
- `f0595eb5c4` — parar de marcar o relatorio como enviado quando o envio nao aconteceu: sem chave, ou
  com resposta de recusa do Resend, o codigo antigo seguia adiante e atualizava `last_sent_at` e
  `next_run_at` como se o e-mail tivesse saido. A branch passa a lancar erro nos dois casos, o que cai
  no `catch` por relatorio (status `error`) e preserva o agendamento para a proxima tentativa.

Dos 4 arquivos que a branch mexeu, 3 estao hoje byte a byte identicos a main
(`git diff eb756894 origin/main -- <arquivo>` vazio para `send-scheduled-reports/index.ts`,
`send-transactional-email/index.ts` e `tests/scripts/resolve-credential-usage.test.mjs`). O unico que
difere e `process-scheduled-reports/index.ts`, e a diferenca e a main tendo **mais** do que a branch,
nao menos.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Remetente `noreply@promobrindes.com.br` em `process-scheduled-reports` | esta | `origin/main:supabase/functions/process-scheduled-reports/index.ts:111` — `from: "Promo Gifts <noreply@promobrindes.com.br>"` |
| Remetente trocado em `send-scheduled-reports` | esta | `origin/main:supabase/functions/send-scheduled-reports/index.ts:175` |
| Remetente trocado em `send-transactional-email` | esta | `origin/main:supabase/functions/send-transactional-email/index.ts:117` |
| Dominio antigo totalmente removido | esta (nao sobrou nenhuma ocorrencia) | `git grep -n "noreply@promogifts.com.br" origin/main -- supabase tests src` → sem resultado (exit 1) |
| Quando o dominio entrou na main | 2026-11-13 | `git log -S"noreply@promobrindes.com.br" origin/main -- supabase/functions/process-scheduled-reports/index.ts` → `835fee0c1e fix(edge): corrige dominio de e-mail Resend promogifts → promobrindes (#3521)` |
| Desestruturar `{ value }` de `resolveCredential` (fim do `Bearer [object Object]`) | esta | `origin/main:supabase/functions/process-scheduled-reports/index.ts:96` — `const { value: resendKey } = await resolveCredential("RESEND_API_KEY");` |
| Teste de regressao `resolve-credential-usage.test.mjs`, com escape completo de regex | esta, identico ao da branch | `git show origin/main:tests/scripts/resolve-credential-usage.test.mjs` contem `name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`; `git log` do arquivo em `origin/main` → `8d9f08969d` (2026-11-09) e `0c9bc510da` (2026-11-11) |
| Sem chave → nao marcar como enviado | esta | `origin/main:...process-scheduled-reports/index.ts:99` — `if (!resendKey) throw new Error("RESEND_API_KEY nao configurado");` · entrou por `5e59cb9c79` (2026-11-15, PR #3660) |
| Recusa do Resend → nao marcar como enviado | esta | `origin/main:...process-scheduled-reports/index.ts:117-119` — `if (!sendRes.ok) { throw new Error(\`Resend ${sendRes.status}: ...\`) }` · entrou por `5e59cb9c79` (2026-11-15, PR #3660) |
| (a main tem a mais) log do motivo da falha | a main adicionou, a branch nao tinha | `origin/main:...process-scheduled-reports/index.ts:134-139` — `console.error("process-scheduled-reports: falha no envio do relatorio", { reportId, message })` |

O diff `branch -> main` desse unico arquivo divergente nao remove nada da branch: muda a redacao de um
comentario, tira o bloco `{ }` que a branch havia deixado sobrando apos trocar o `if (resendKey)` por
`throw`, e acrescenta o `console.error`. As quatro linhas de comportamento da branch (destructuring,
throw sem chave, throw em resposta ruim, remetente novo) aparecem intactas no lado da main.

## A resgatar

Nada. Os tres objetivos dos commits estao na main de hoje, com evidencia item por item acima.

## Risco de fechar esta branch

Nenhum risco identificado. Fechar nao desfaz nada: o conteudo ja esta na main e ja passou por PRs
(#3521 e #3660). A main inclusive esta um passo a frente da branch (registra o motivo da falha nos
logs), entao reabrir ou mergear esta branch hoje seria retrocesso, nao ganho.

## Nao verificado

- **Se a correcao esta no ar.** Conferi que o codigo esta na main, nao que a edge function
  `process-scheduled-reports` em producao foi redeployada com essa versao. Existe pendencia conhecida
  no projeto de edge functions em producao divergentes do repositorio. Verificar isso exige comparar o
  deploy em producao com o repo, fora do escopo desta analise.
- **Se o dominio `promobrindes.com.br` segue verificado na conta Resend.** A afirmacao vem da mensagem
  de commit do agente anterior; nao consultei o Resend.
