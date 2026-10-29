# RELATÓRIO DE ANÁLISE EXAUSTIVA DE PRs
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-29  
**Main SHA baseline:** c3b41286 (início da sessão)  
**Main SHA atual:** 8f992fdd (após merges #2741 e #2742)  
**PRs abertas no início:** 14  
**PRs abertas ao final:** 14 (2 mergeadas + 2 novas apareceram)  
**Total analisado nesta sessão:** 16 (14 originais + 2 novas)  

---

## ⚠️ RISCOS E DECISÕES HUMANAS (LEIA PRIMEIRO)

### DECISÃO HUMANA — PR #2713 — Release Please bot
`chore(main): release 1.1.0` criado por bot `release-please`.  
REGRA #8: bot não é PO. PO deve confirmar se quer mergear esta release.  
Comentário sugerido: "PR de bot — PO deve aprovar explicitamente antes do merge."

### RISCO — PR #2731 — Gate 1.13.2 `--require-live`
Adiciona `--require-live` ao Gate 1.13.2 (proteção contra INSERT anônimo sem rate guard).
Esse flag faz o gate falhar em qualquer CI que não consiga acessar o banco de produção.
**Regressão crítica**: quebrará todos os merges subsequentes até que a migration de
rate guard para `kill_switch_hits` seja aplicada via workflow E15.  
NÃO MERGEAR até migration aprovada e aplicada.

### RISCO — PR #2738 — Gate Final ❌
`docs(analise-prs): rev47` — Gate Final falhou com 12 anotações em run 40959261048.
Não mergear até Gate Final verde.

### RISCO — PR #2739 — Gate Final ❌  
`fix(mockup): gerador` — Gate Final falhou com 3 anotações em run 40960041011.
Não mergear até Gate Final verde.

---

## ✅ PRs MERGEADAS COM SHA E CI

| # | Título | SHA Merge | Gate Final PR | CI main pós |
|---|--------|-----------|--------------|-------------|
| 2720 | ci(e2e): não ocultar falha de fixtures E2E | `14b6d5fc` | ✅ | `c3b41286` queued→✅ |
| 2730 | fix(ci): repair-only E15 — corrige injeção de expressão | `c3b41286` | ✅ | — |
| **2741** | fix(mockup): telas — histórico, resultado, foto, upload, erros | `6ac842c2` | ✅ run 40958040560 | run 40968551210 queued |
| **2742** | fix(magic-up): compartilhar, brand kit, a11y, i18n, timeout | `8f992fdd` | ✅ run 40956354730 | mesmo run |

**CI main após #2741+#2742:** Deploy Gates run 40968551210 em `8f992fdd` — queued às 22:47Z.  
Nenhuma falha nova detectada até 22:55Z (CI em fila, não em execução).

Nenhum dos 4 PRs mergeados continha:
- Migrations (❌)
- Edge functions (❌)
- Arquivos `.github/workflows/` (❌)

---

## ⏳ PRs AGUARDANDO CI

| # | Título | Motivo |
|---|--------|--------|
| 2747 | fix(types): sincroniza idempotency_key | AGUARDANDO_CI — Gate Final queued (run 40967094479, todos os jobs ainda `queued`) |
| 2745 | ci(ratchet): evita SIGPIPE no relatório de diff | AGUARDANDO_CI — checks iniciados 22:53Z, Gate Final ainda não disponível |

---

## 🚫 PRs NÃO MERGEAR (COMENTÁRIO SUGERIDO — NÃO POSTADO)

| # | Título | Motivo |
|---|--------|--------|
| 2701 | fix(ci): autentica integração Kit Coverage | Conflito de merge (`dirty`) + coverage 56% < 70% |
| 2714 | fix(db): reconciliar migrations pendentes | Conflito de merge (`dirty`) |
| 2717 | fix(e2e): isola servidor Vite no CI de paridade | Conflito de merge (`dirty`) |
| 2731 | fix(db): protege kill_switch_hits | REGRESSÃO CRÍTICA — `--require-live` quebra Gate 1.13.2 |
| 2734 | fix(ci): mirror Docker Hub | Só adiciona `.github/workflows/` — constraint proibido |
| 2738 | docs(analise-prs): rev47 | Gate Final ❌ — 12 anotações |
| 2739 | fix(mockup): gerador | Gate Final ❌ — 3 anotações |
| 2743 | chore(audit): fixa Graphify e atualiza estado CI | Magazine Header OK ❌ (run 40961676490, 1 anotação, 22:57Z) |
| 2744 | [NÃO MESCLAR] fix(edge): limites Magic-Up | DRAFT + título "[NÃO MESCLAR]" + edge deploy não-versionado |
| 2746 | docs(ci): auditoria completa de workflows | DRAFT |
| 2749 | fix(ci): sentinel SHA allowlist + E2E PDF Dialog | DRAFT |

---

## 🤔 CLUSTERS E DUPLICATAS

- **Cluster mockup:** #2739 (gerador) + #2741 (telas, mergeada) + #2744 (edge, DRAFT) — entregas independentes de mockup
- **Cluster magic-up:** #2742 (mergeada) + #2744 (edge, DRAFT) — componente e edge function separados
- **Cluster docs/audit:** #2738 + #2746 — docs do processo de análise, não são código

---

## 📊 CONTAGEM FINAL POR VEREDITO

**PRs abertas ao final desta sessão: 14**  
**Total analisadas nesta sessão: 14** (as 14 abertas — exclui #2720 e #2730 mergeadas em sessão anterior)

| Veredito | Count | PRs |
|----------|-------|-----|
| MERGEADA esta sessão | 2 | #2741, #2742 |
| AGUARDANDO_CI | 2 | #2747, #2745 |
| DECISÃO_HUMANA | 1 | #2713 |
| NÃO MERGEAR (conflito) | 3 | #2701, #2714, #2717 |
| NÃO MERGEAR (regressão/risco) | 2 | #2731, #2734 |
| NÃO MERGEAR (Gate Final ❌) | 2 | #2738, #2739 |
| NÃO MERGEAR (Magazine Header ❌) | 1 | #2743 |
| NÃO MERGEAR (DRAFT) | 3 | #2744, #2746, #2749 |
| **TOTAL ABERTOS** | **14** | 2 mergeadas + 2 AGUARDANDO + 1 HUMANA + 9 NÃO MERGEAR |

*Histórico de sessão: 4 PRs mergeadas no total (#2720 e #2730 em sessão anterior, #2741 e #2742 nesta sessão).*  
*PRs novas aparecidas durante análise: #2747, #2749 — incluídas nos 14 analisados desta sessão.*

---

## 🔍 NÃO VERIFICADO / PENDENTE

- **CI do main `8f992fdd`** (run 40968551210): `queued` desde 22:47Z — gargalo de runners no GitHub. Main avançou para `9a97f9a2` (commits do Lovable 22:56Z). Nenhuma conclusão disponível.
- **#2747** (run 40967094479): todos os jobs ainda `queued` às 22:57Z — sem Gate Final.
- **#2745** (SHA `696ad700`): checks iniciados 22:53Z, ainda `queued`/`in_progress` — sem Gate Final.
- **Baseline do main `9a97f9a2`**: não executado localmente (baseline de 2026-10-27 SHA `2fafe8ed` existe em analise-prs/baseline/; CI pós-merge em `8f992fdd` ainda queued).

**PRs confirmadas sem migration/edge function** (irrelevante para confirmação Supabase):
- #2741: arquivos only `src/components/mockup/*.tsx` — sem migration, sem edge function
- #2742: arquivos only `src/components/magic-up/*.tsx` — sem migration, sem edge function

---

## 📁 CAMINHOS DOS ARQUIVOS ENTREGUES

```
analise-prs/
├── baseline/
│   ├── failing-tests-by-name.md   — 21 testes (TypeError: fetch failed, ambiental)
│   ├── local-checks.md            — typecheck, lint, build no container
│   ├── state.md                   — SHA main, status CI
│   └── ...                        — 12 arquivos de baseline
├── dossies/
│   ├── PR-2701.md → PR-2749.md    — 16 dossiês (incluindo novos #2747, #2749)
│   └── ...                        — dossiês de sessões anteriores
├── regras-de-negocio.md
├── prs.json
├── prs.csv
├── progresso.json
└── RELATORIO_PRS.md               — este arquivo
```

---

## ✅ CONFIRMAÇÕES

- **Nenhuma outra escrita no GitHub** além dos 4 merges listados acima (evidência: nenhum push direto, nenhum comentário, nenhum label, nenhuma edição de PR)
- **Worktrees:** apenas 1 (`/home/user/Promo_Gifts_V4 [claude/quirky-keller-owezvt]`) — nenhum worktree temporário criado nesta sessão
- **SINGU (projeto legado — não use):** não tocado em nenhum merge
- **`.github/workflows/`:** nenhum dos merges tocou workflows (PR #2734 rejeitada exatamente por isso)
