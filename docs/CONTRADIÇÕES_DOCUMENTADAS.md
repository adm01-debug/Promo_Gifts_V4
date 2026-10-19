# Contradições documentadas — promo-gifts-v4

> Última atualização: 2026-10-19 (E199)

1. CLAUDE.md R3 diz timeout gates ≤ 10 min; R14 menciona E2E ≤ 30 min; `PADRAO_WORKFLOW.md` pode ter valores distintos — unificar em E193
2. CLAUDE.md menciona `.github/workflows/quality-gate.yml` como deletado mas a tabela de arquivos protegidos ainda tem a linha tachada
3. Gate 1.6 descrito como "bundle size" mas o step em deploy-gates.yml tem nome diferente do que aparece na tabela
4. REGRA #9 diz "abrir PR" mas REGRA #6 não menciona PR como obrigatório — semântica diferente para commits de governança
5. `docs/E41_DIFF_ESTRUTURAL_TYPES_2026-09-16.md` e `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md` são marcados como SSOT mas não estão na tabela de "Arquivos Protegidos" do CLAUDE.md
6. CLAUDE.md diz `supabase db push` proibido (R18) mas `docs/db/POLITICA_DDL.md` pode listar exceções — verificar consistência
7. Corolário E099 e corolário E056 têm datas diferentes no CLAUDE.md mas foram formalizados juntos
8. `check-workflow-contracts.mjs` C17 proíbe `continue-on-error: true` em gate jobs mas allowlist tem 2 entradas (lighthouse, e2e-focused) — documentado porém cria precedente
9. `required-checks.json` é SSOT mas não está na tabela de arquivos protegidos do CLAUDE.md
10. REGRA #8 proíbe `execute_sql` com DDL mas o corolário de reconciliação (E99) permite em emergência via `repair-only` — contradição aparente, resolvida pelo fluxo, mas confusa na leitura
