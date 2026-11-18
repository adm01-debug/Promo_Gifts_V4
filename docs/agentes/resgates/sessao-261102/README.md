# Sessão de 2026-11-02 — texto preservado da branch `salvo/261117-laughing-cori-o9w35e`

Estes dois arquivos são **cópia integral e congelada** do que outro agente de IA
escreveu na branch `salvo/261117-laughing-cori-o9w35e` (PR #3028, fechada sem merge).
Estão aqui porque a auditoria de 2026-11-18 mediu que são o **único conteúdo daquela
branch genuinamente ausente da `main`** — todo o resto (migration, fixes de código,
baselines, workflows) ou já está na `main`, ou foi deliberadamente superado por ela.

## Por que não foram aplicados sobre os arquivos atuais

- `PENDENCIAS.md`: a versão da branch tem 3.034 linhas e a numeração própria **P45–P65**.
  A `main` reescreveu o arquivo (1.090 linhas, cabeçalho "Gerado em: 2026-11-08",
  numeração `## NN.` até `## 53.`), e os itens 45–52 de hoje tratam de assuntos
  **diferentes** dos P45–P52 da branch. Sobrescrever perderia o atual; mesclar
  inventaria uma numeração que nenhum dos dois autores usou.
- `RELATORIO_CI.md`: a versão da branch tem 203 linhas e descreve a sessão de
  2026-11-02. A `main` tem 1.193 linhas, de outra sessão (2026-11-08), último commit
  `1da62abb6` de 2026-11-12.

`AGENTS.md` trata `PENDENCIAS.md` como **histórico, não ordem** — então o valor
destes arquivos é de registro, e registro é o que esta pasta faz.

## O que eles contam

O essencial do relato daquela sessão é o bloqueio da **GitHub Actions policy**: só
actions `actions/*` e `github/*` eram permitidas, então aquele agente substituiu
`dorny/paths-filter` por `git diff` manual, removeu `anchore/sbom-action` e
`actions/attest-build-provenance`, e trocou `supabase/setup-cli` por `wget`+`tar`.

Essa condição **já não vale**: a `main` reativou as três actions pinadas por SHA
(`deploy-gates.yml:86`, `:840`, `:851`) e usa `supabase/setup-cli@689adcfb` em 10
pontos. Por isso o diff de workflows daquela branch não foi resgatado — reaplicá-lo
seria regressão, não ganho.
