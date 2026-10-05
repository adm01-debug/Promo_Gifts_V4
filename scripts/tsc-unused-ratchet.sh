#!/usr/bin/env sh
# scripts/tsc-unused-ratchet.sh
#
# Ratchet para noUnusedLocals: falha se a contagem de erros crescer além da baseline.
# Não exige corrigir as ~48k ocorrências existentes de uma vez — apenas impede regressão.
#
# Uso:
#   sh scripts/tsc-unused-ratchet.sh                # verifica contra .tsc-ratchet-baseline
#   sh scripts/tsc-unused-ratchet.sh --update       # atualiza baseline (falha se regredir vs main)
#   sh scripts/tsc-unused-ratchet.sh --check-ratchet  # E41: falha se baseline FILE aumentou em PR
#     Env: GITHUB_BASE_SHA (sha do base branch), GITHUB_LABELS (labels separadas por vírgula)

BASELINE_FILE=".tsc-ratchet-baseline"

# E41: --check-ratchet — verifica se o ARQUIVO de baseline aumentou em relação ao base do PR.
# Não roda TSC; compara apenas o conteúdo do arquivo. Rápido e sem custo de compilação.
if [ "$1" = "--check-ratchet" ]; then
  if [ ! -f "$BASELINE_FILE" ]; then
    echo "INFO: $BASELINE_FILE não encontrado — nada a verificar."
    exit 0
  fi

  current_baseline=$(cat "$BASELINE_FILE")
  base_ref="${GITHUB_BASE_SHA:-origin/main}"

  base_baseline=$(git show "${base_ref}:${BASELINE_FILE}" 2>/dev/null || echo "")

  if [ -z "$base_baseline" ]; then
    echo "INFO: $BASELINE_FILE não encontrado em ${base_ref} — nada a comparar."
    exit 0
  fi

  # Compara numericamente (ambos são inteiros)
  if [ "$current_baseline" -gt "$base_baseline" ] 2>/dev/null; then
    labels="${GITHUB_LABELS:-}"
    case "$labels" in
      *ratchet-override*)
        printf "ℹ️  .tsc-ratchet-baseline aumentou (%s → %s) — label 'ratchet-override' presente; permitido.\n" \
          "$base_baseline" "$current_baseline"
        exit 0
        ;;
      *)
        printf "❌ .tsc-ratchet-baseline aumentou de %s para %s sem label 'ratchet-override'.\n" \
          "$base_baseline" "$current_baseline"
        echo "   Isso é uma regressão na baseline de TypeScript não utilizado."
        echo "   Para permitir explicitamente, adicione 'ratchet-override' ao PR."
        exit 1
        ;;
    esac
  fi

  printf "✅ .tsc-ratchet-baseline não aumentou (%s ≤ %s).\n" "$current_baseline" "$base_baseline"
  exit 0
fi

# -p tsconfig.app.json: sem ele o tsc usa tsconfig.json (solution-style com
# references) e compila praticamente só vite.config.ts — o ratchet era um
# vácuo e nunca enxergava variáveis mortas em src/ (auditoria 2026-10).
# Binário local do node_modules — npx pode baixar/executar pacote arbitrário
# se o binário sumir (SonarCloud shell:S6505).
TSC_BIN="./node_modules/.bin/tsc"
if [ ! -x "$TSC_BIN" ]; then
  echo "ERRO: $TSC_BIN não encontrado — rode 'npm ci' antes do ratchet."
  exit 1
fi
count=$("$TSC_BIN" -p tsconfig.app.json --noUnusedLocals --noEmit 2>&1 | grep -c "error TS" || true)

if [ "$1" = "--update" ]; then
  # Guarda de regressão: se a baseline em main for menor, recusar o aumento
  # a menos que o label ratchet-override esteja presente (verificado pelo
  # workflow via RATCHET_OVERRIDE=1).
  if [ -f "$BASELINE_FILE" ]; then
    current_baseline=$(cat "$BASELINE_FILE")
    if [ "$count" -gt "$current_baseline" ] && [ "${RATCHET_OVERRIDE:-0}" != "1" ]; then
      echo "ERRO: --update aumentaria a baseline de $current_baseline para $count erros."
      echo "Isso é uma regressão. Para permitir explicitamente, adicione o label"
      echo "'ratchet-override' ao PR ou exporte RATCHET_OVERRIDE=1."
      exit 1
    fi
  fi
  echo "$count" > "$BASELINE_FILE"
  echo "Baseline atualizada: $count erros noUnusedLocals"
  exit 0
fi

if [ ! -f "$BASELINE_FILE" ]; then
  echo "ERRO: $BASELINE_FILE não encontrado. Execute com --update para criar."
  exit 1
fi

baseline=$(cat "$BASELINE_FILE")

if [ "$count" -gt "$baseline" ]; then
  echo "FALHA noUnusedLocals ratchet: $count erros (baseline: $baseline)"
  echo "Novos erros introduzidos: $((count - baseline))"
  echo "Corrija as variáveis/imports não utilizados ou atualize a baseline com --update."
  exit 1
else
  echo "OK noUnusedLocals ratchet: $count erros (baseline: $baseline)"
  if [ "$count" -lt "$baseline" ]; then
    echo "Melhoria detectada! Atualize a baseline: sh scripts/tsc-unused-ratchet.sh --update"
  fi
  exit 0
fi
