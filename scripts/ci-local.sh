#!/usr/bin/env bash
# shellcheck disable=SC2317  # funções job_* são chamadas por nome dinâmico
# scripts/ci-local.sh — Promo_Gifts_V4
# Gerado em 2026-11-07 a partir de .github/workflows/{deploy-gates.yml}
# Checks obrigatórios na main em 07/11/2026: Gate Final - Deploy Ready
# LEMBRETE: ao mudar um workflow obrigatório, atualize este script (steps literais abaixo).
#
# Reproduz localmente (WSL) os jobs que rodam em pull_request: cada step roda o `run:` literal do
# workflow com o env do job+step, o shell do CI (defaults.run.shell) e o timeout do job; actions sem
# equivalente local viram SKIP com motivo e deixam o job INCONCLUSIVO. GITHUB_* são emuladas como um PR
# contra origin/main (CI_BASE_SHA = merge-base; --base/--all-changed para outros casos). Nada é instalado
# globalmente (npm ci/bun install/playwright install usam os caches de usuário; --with-deps é removido).
# Hash dos workflows na geração: 16978128583d67c6 (o script avisa em runtime se eles mudarem).
# Gate Final - Deploy Ready é o único check obrigatório e agrega 14 jobs; aqui é emulado a partir dos
# resultados locais. 5 jobs são cloud-only (dependency-review, secrets-check, restore-cart-rpc-gate,
# schema-drift-gate e as partes --require-live do Gate 1/2.5): ficam como 'não verificado'.
# Gate 3 (e2e-smoke) roda em modo público (E2E_MOCK_AUTH=1, VITE_* públicos do canônico) como no CI sem segredos.

set -euo pipefail

CI_REPO='Promo_Gifts_V4'
CI_GERADO_EM='07/11/2026'
CI_WF_HASH='16978128583d67c6'
CI_WF_FILES='.github/workflows/deploy-gates.yml .github/actions/check-min-executed/action.yml .github/actions/check-min-tests/action.yml .github/actions/ci-issue/action.yml .github/actions/e2e-setup/action.yml .github/actions/setup-node-ci/action.yml .github/scripts/e2e-relevance.mjs .github/workflows/_e2e-relevance.yml .github/workflows/_secrets-check.yml'
CI_WORKFLOWS='deploy-gates.yml'
CI_REQUIRED_CHECKS='Gate Final - Deploy Ready'
CI_LIST_NOTAS='Gate Final agrega os jobs [REQ*]; cloud-only = não verificado localmente.'

# ───────────────────────── runtime comum (idêntico nos 9 repos) ─────────────────────────
usage() {
  cat <<'EOF'
Uso: scripts/ci-local.sh [--list] [--fast] [--only <job>[,<job>]] [--skip <job>] [--no-docker] [--keep-going]
                         [--strict] [--verbose] [--base <ref>] [--all-changed]

  --list         lista os jobs: id, se é obrigatório na main ([REQ]), classe e o que cada um pula
  (sem flags)    roda todos os jobs obrigatórios reproduzíveis, na ordem dos needs, parando no 1º erro
  --fast         pula jobs/steps opcional-pesado (E2E/browsers/lighthouse/mutação) e os que precisam de docker
  --only a,b     roda só esses jobs (coluna "job" do --list) + os jobs provedores de outputs de que dependem
  --skip a,b     pula esses jobs
  --no-docker    pula só os steps que sobem Postgres/containers
  --keep-going   não para no primeiro erro; resume tudo no fim
  --strict       exit 3 quando algum check obrigatório ficou INCONCLUSIVO (pulado por segredo/docker/--fast/cloud)
  --verbose      mostra o stdout de todos os steps (padrão: só dos que falham) e cada SKIP na hora
  --base <ref>   base do "PR" emulado (padrão: merge-base de origin/main com HEAD)
  --all-changed  trata todos os arquivos como alterados (útil na própria main, onde a base == HEAD)
  --no-reuse     não reaproveita node_modules entre jobs (padrão: pula `npm ci`/`bun install` repetidos
                 quando o lockfile não mudou desde o último install feito por este script)

Detecção de mudanças (paths-filter, docs-only etc.) considera commits desde a base + working tree + arquivos novos.
Segredos: exporte-os no ambiente (ex.: `SUPABASE_ACCESS_TOKEN=... scripts/ci-local.sh`); sem eles o step
é pulado com "segredo X ausente" e o job fica INCONCLUSIVO. Saída: 0 = nenhum check obrigatório falhou
(mesmo com inconclusivos; 3 com --strict), 1 = falha, 2 = uso incorreto.
EOF
}

LIST=0 FAST=0 NO_DOCKER=0 KEEP_GOING=0 STRICT=0 VERBOSE=0 ALL_CHANGED=0 REUSE=1 ONLY="" SKIPS="" BASE_REF=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) LIST=1 ;;
    --fast) FAST=1 ;;
    --no-docker) NO_DOCKER=1 ;;
    --keep-going) KEEP_GOING=1 ;;
    --strict) STRICT=1 ;;
    --verbose|-v) VERBOSE=1 ;;
    --all-changed) ALL_CHANGED=1 ;;
    --no-reuse) REUSE=0 ;;
    --only) ONLY="${ONLY:+$ONLY,}${2:-}"; shift ;;
    --only=*) ONLY="${ONLY:+$ONLY,}${1#*=}" ;;
    --skip) SKIPS="${SKIPS:+$SKIPS,}${2:-}"; shift ;;
    --skip=*) SKIPS="${SKIPS:+$SKIPS,}${1#*=}" ;;
    --base) BASE_REF=${2:-}; shift ;;
    --base=*) BASE_REF=${1#*=} ;;
    -h|--help) usage; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT=$(pwd)
export ROOT

if [[ -t 1 ]]; then
  C_G=$'\e[32m' C_R=$'\e[31m' C_Y=$'\e[33m' C_B=$'\e[1m' C_D=$'\e[2m' C_0=$'\e[0m'
else
  C_G="" C_R="" C_Y="" C_B="" C_D="" C_0=""
fi

CI_TMP=""
CLEANUPS=()
cleanup() {
  trap '' INT TERM
  trap - EXIT
  local c
  for c in "${CLEANUPS[@]}"; do eval "$c" >/dev/null 2>&1 || true; done
  [[ -n "$CI_TMP" && -d "$CI_TMP" ]] && rm -rf "$CI_TMP"
  return 0
}
trap cleanup EXIT
trap 'echo; echo "interrompido (SIGINT)"; exit 130' INT
trap 'echo; echo "encerrado (SIGTERM)"; exit 143' TERM
# só registre um cleanup DEPOIS de o recurso existir (nunca no início do job)
add_cleanup() { CLEANUPS+=("$1"); }

# node da versão que o repo pede (nvm, se instalada); estrito => aborta em vez de "seguir com a instalada"
ci_use_node() { # major estrito(0|1) motivo
  local want=$1 strict=$2 why=$3 have
  have=$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')
  [[ "$have" == "$want" ]] && return 0
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    # shellcheck disable=SC1091
    source "$NVM_DIR/nvm.sh" --no-use >/dev/null 2>&1 || true
    if nvm use "$want" --silent >/dev/null 2>&1; then
      echo "${C_D}node: usando v$(node -v | tr -d v) via nvm (o repo pede node ${want}: ${why})${C_0}"
      return 0
    fi
  fi
  if (( strict )); then
    echo "${C_R}✘ node ${want} é exigido por este repo (${why}) e node $(node -v 2>/dev/null) não serve (engine-strict).${C_0}" >&2
    echo "   instale com: nvm install ${want}   (ou fnm/volta) e rode de novo." >&2
    exit 2
  fi
  echo "${C_Y}⚠ versão:${C_0} node instalado = $(node -v 2>/dev/null), o repo pede node ${want} (${why}); nvm não tem essa versão — seguindo com a instalada"
  return 0
}

# ── registro de jobs ──
declare -a JOB_ORDER=()
declare -A JOB_NAME JOB_WF JOB_REQ JOB_CLASS JOB_NEEDS JOB_STATIC_SKIPS JOB_RESULT JOB_TIME JOB_RUNTIME_SKIPS JOB_HEAVY JOB_DOCKER JOB_CLOUD JOB_AGG JOB_PROVIDER
# reg_job id nome workflow req(req|via:<agg>|ci|opt) classe needs "o que pula" heavy docker cloud agg provider
reg_job() {
  JOB_ORDER+=("$1")
  JOB_NAME[$1]=$2; JOB_WF[$1]=$3; JOB_REQ[$1]=$4; JOB_CLASS[$1]=$5; JOB_NEEDS[$1]=$6
  JOB_STATIC_SKIPS[$1]=$7; JOB_HEAVY[$1]=$8; JOB_DOCKER[$1]=$9; JOB_CLOUD[$1]=${10}; JOB_AGG[$1]=${11}; JOB_PROVIDER[$1]=${12:-0}
  JOB_RESULT[$1]=pending; JOB_TIME[$1]=0; JOB_RUNTIME_SKIPS[$1]=""
}
# resultados: success | failure | inconclusive (steps bloqueantes pulados) | assumed (cloud-only) |
#             skipped_ci (if do job falso, como no CI) | skipped_local (--fast/--no-docker/pré-condição) |
#             deselected (--only/--skip) | pending

# ── estado do job corrente ──
CUR_JOB="" CUR_LABEL="" JOB_FAILED=0 JOB_ANY_FAILED=0 JOB_INCONCL=0 QUIET_SKIPS=0 JOB_T0=0
STEP_OK=0 STEP_FAIL=0 STEP_SKIP=0
JOB_PATH_PREPEND="" JOB_PATH_PREFIX=""
declare -A STEP_OUT JOB_OUT SKIP_GROUP ENV_SAVED ENV_WAS_SET
declare -a JOB_ENV_KV=() JOB_ENV_NAMES=() SKIP_ORDER=()
ACTIONLINT_FAILED=0

job_begin() {
  CUR_JOB=$1; CUR_LABEL=$1; JOB_FAILED=0; JOB_ANY_FAILED=0; JOB_INCONCL=0; QUIET_SKIPS=0
  STEP_OK=0; STEP_FAIL=0; STEP_SKIP=0
  JOB_ENV_KV=(); JOB_ENV_NAMES=(); JOB_PATH_PREPEND=""; JOB_PATH_PREFIX=${2:-}
  SKIP_GROUP=(); SKIP_ORDER=(); ENV_SAVED=(); ENV_WAS_SET=()
  JOB_T0=$SECONDS
  echo
  echo "${C_B}━━ ${CUR_JOB} — ${JOB_NAME[$CUR_JOB]} ${C_D}(${JOB_WF[$CUR_JOB]})${C_0}"
}
job_end() {
  local n r
  if (( ! VERBOSE )); then   # em --verbose cada SKIP já saiu na hora
    for r in "${SKIP_ORDER[@]}"; do
      echo "  ${C_Y}↷ SKIP${C_0} ${CUR_JOB} — ${r}: ${SKIP_GROUP[$r]}"
    done
  fi
  if (( QUIET_SKIPS > 0 )); then
    echo "  ${C_D}↷ ${QUIET_SKIPS} step(s) de infraestrutura pulados (checkout/setup/cache/artefatos)${C_0}"
  fi
  JOB_TIME[$CUR_JOB]=$(( ${JOB_TIME[$CUR_JOB]} + SECONDS - JOB_T0 ))
  if (( JOB_FAILED || JOB_ANY_FAILED )); then JOB_RESULT[$CUR_JOB]=failure
  elif (( JOB_INCONCL )); then JOB_RESULT[$CUR_JOB]=inconclusive
  else JOB_RESULT[$CUR_JOB]=success; fi
  echo "  ${C_D}${CUR_JOB}: ${STEP_OK} ✔ · ${STEP_SKIP} ↷ · ${STEP_FAIL} ✘ (${JOB_TIME[$CUR_JOB]}s) → ${JOB_RESULT[$CUR_JOB]}${C_0}"
  for n in "${JOB_ENV_NAMES[@]}"; do
    if [[ "${ENV_WAS_SET[$n]:-0}" == 1 ]]; then export "$n=${ENV_SAVED[$n]}"; else unset "$n"; fi
  done
  return 0
}
_job_skip() { # resultado motivo
  JOB_RESULT[$CUR_JOB]=$1
  JOB_RUNTIME_SKIPS[$CUR_JOB]="job inteiro: $2"
  echo "  ${C_Y}↷ SKIP${C_0} ${CUR_JOB} — $2"
  JOB_TIME[$CUR_JOB]=$(( ${JOB_TIME[$CUR_JOB]} + SECONDS - JOB_T0 ))
}
job_skip_ci() { _job_skip skipped_ci "$1"; }        # if: do job falso — o CI também pularia
job_skip_local() { _job_skip skipped_local "$1"; }  # limitação local (--fast/--no-docker/pré-condição/porta)
job_precheck() { # cmd motivo
  if ! eval "$1" >/dev/null 2>&1; then job_skip_local "$2"; return 1; fi
  return 0
}
matrix_end() { # fim de uma combinação da matriz (fail-fast: false)
  (( JOB_FAILED )) && JOB_ANY_FAILED=1
  JOB_FAILED=0
}
job_set_output() { JOB_OUT["$1.$2"]=$3; }
job_out() { printf '%s' "${JOB_OUT[$1.$2]:-}"; }
step_out() { printf '%s' "${STEP_OUT[$1.$2]:-}"; }
job_status() { if (( JOB_FAILED || JOB_ANY_FAILED )); then echo failure; else echo success; fi; }
job_result() { # resultado como o GitHub veria (inconclusivo/cloud-only/deselecionado contam como success p/ needs)
  case "${JOB_RESULT[$1]:-pending}" in
    success|failure) printf '%s' "${JOB_RESULT[$1]}" ;;
    inconclusive|assumed|deselected) printf 'success' ;;
    *) printf 'skipped' ;;
  esac
}
docker_ok() { (( ! NO_DOCKER && ! FAST && ! ${NO_DOCKER_JOB:-0} )); }

quiet_skip() { QUIET_SKIPS=$((QUIET_SKIPS + 1)); STEP_SKIP=$((STEP_SKIP + 1)); }
# skip_step nome motivo tipo   (tipo: secret|fast|docker|cloud|precheck => job INCONCLUSIVO; if|info => não)
skip_step() {
  local name=$1 reason=$2 kind=${3:-info}
  STEP_SKIP=$((STEP_SKIP + 1))
  case "$kind" in secret|fast|docker|cloud|precheck) JOB_INCONCL=1 ;; esac
  if [[ -z "${SKIP_GROUP[$reason]:-}" ]]; then SKIP_ORDER+=("$reason"); SKIP_GROUP[$reason]=$name
  else SKIP_GROUP[$reason]+="; $name"; fi
  (( VERBOSE )) && echo "  ${C_Y}↷ SKIP${C_0} ${CUR_LABEL}/${name} — ${reason}"
  JOB_RUNTIME_SKIPS[$CUR_JOB]+="$name ($reason); "
  return 0
}

parse_github_output() { # arquivo step_id
  local f=$1 sid=$2 line k v delim l2
  [[ -s "$f" && -n "$sid" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    if [[ "$line" == *'<<'* ]]; then
      k=${line%%<<*}; delim=${line#*<<}; v=""
      while IFS= read -r l2 && [[ "$l2" != "$delim" ]]; do v+="${v:+$'\n'}$l2"; done
    else
      k=${line%%=*}; v=${line#*=}
    fi
    STEP_OUT["$sid.$k"]=$v
  done <"$f"
}
parse_github_env() { # arquivo (GITHUB_ENV: vale p/ os steps seguintes do job; valor anterior é restaurado no fim)
  local f=$1 line k v delim l2
  [[ -s "$f" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    if [[ "$line" == *'<<'* ]]; then
      k=${line%%<<*}; delim=${line#*<<}; v=""
      while IFS= read -r l2 && [[ "$l2" != "$delim" ]]; do v+="${v:+$'\n'}$l2"; done
    else
      k=${line%%=*}; v=${line#*=}
    fi
    if [[ "$k" == PATH ]]; then echo "  ${C_Y}⚠ step tentou alterar PATH via GITHUB_ENV — ignorado (use GITHUB_PATH)${C_0}"; continue; fi
    if [[ -z "${ENV_WAS_SET[$k]+x}" ]]; then
      if [[ -n "${!k+x}" ]]; then ENV_WAS_SET[$k]=1; ENV_SAVED[$k]=${!k}; else ENV_WAS_SET[$k]=0; fi
      JOB_ENV_NAMES+=("$k")
    fi
    JOB_ENV_KV+=("$k=$v")
    export "$k=$v"
  done <"$f"
}
parse_github_path() { # arquivo (GITHUB_PATH: prepend para os steps seguintes)
  local f=$1 line
  [[ -s "$f" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -n "$line" ]] && JOB_PATH_PREPEND="$line:$JOB_PATH_PREPEND"
  done <"$f"
}

# run_step NOME [--id ID] [--env K=V]... [--cwd DIR] [--secrets "A B"] [--if COND TEXTO] [--always]
#          [--heavy] [--docker] [--coe] [--shell "-eo pipefail"] [--timeout MIN] [--cleanup CMD] [--note TEXTO] -- CORPO
run_step() {
  local name=$1; shift
  local -a envs=() secrets=() flags=(-e)
  local cwd="." sid="" coe=0 docker=0 heavy=0 always=0 cond="" condtext="" body="" note="" tmo="" cleanup_cmd="" install=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env) envs+=("$2"); shift 2 ;;
      --cwd) cwd=$2; shift 2 ;;
      --id) sid=$2; shift 2 ;;
      --coe) coe=1; shift ;;
      --docker) docker=1; shift ;;
      --heavy) heavy=1; shift ;;
      --always) always=1; shift ;;
      --shell) read -r -a flags <<<"$2"; shift 2 ;;
      --timeout) tmo=$2; shift 2 ;;
      --cleanup) cleanup_cmd=$2; shift 2 ;;
      --install) install=$2; shift 2 ;;
      --note) note=$2; shift 2 ;;
      --secrets) read -r -a secrets <<<"$2"; shift 2 ;;
      --if) cond=$2; condtext=$3; shift 3 ;;
      --) shift; body=$1; shift; break ;;
      *) echo "run_step: opção interna inválida: $1" >&2; exit 70 ;;
    esac
  done
  if (( JOB_FAILED )) && (( ! always )); then quiet_skip; return 0; fi
  local -a missing=()
  local s
  for s in "${secrets[@]}"; do [[ -n "${!s:-}" ]] || missing+=("$s"); done
  if (( ${#missing[@]} > 0 )); then skip_step "$name" "segredo ${missing[*]} ausente" secret; return 0; fi
  if [[ -n "$cond" ]] && ! eval "$cond"; then skip_step "$name" "if: ${condtext} = false" if; return 0; fi
  if (( heavy && FAST )); then skip_step "$name" "opcional-pesado (--fast)" fast; return 0; fi
  if (( docker )) && ! docker_ok; then skip_step "$name" "sobe containers (docker) — --no-docker/--fast" docker; return 0; fi
  # reuso de node_modules: marca = hash(lockfile + comando de install) gravado após o último install bem-sucedido
  local lockhash="" marker="$ROOT/$cwd/node_modules/.ci-local-lockhash"
  if [[ -n "$install" && -f "$ROOT/$cwd/$install" ]]; then
    lockhash=$( { cat "$ROOT/$cwd/$install" "$ROOT/$cwd/package.json" "$ROOT/$cwd/.npmrc" "$ROOT/$cwd/bunfig.toml" 2>/dev/null; printf '%s\n' "$body" "${envs[@]}"; } | sha256sum | cut -c1-16)
    if (( REUSE )) && [[ -f "$marker" && "$(cat "$marker")" == "$lockhash" ]]; then
      skip_step "$name" "node_modules reutilizado (${install} inalterado desde o último install; --no-reuse desliga)" info
      return 0
    fi
  fi

  echo "${C_B}▶ ${CUR_LABEL} / ${name}${C_0}${note:+ ${C_D}(${note})${C_0}}"
  local t0=$SECONDS rc=0
  local out="$CI_TMP/step_output" envf="$CI_TMP/step_env" pathf="$CI_TMP/step_path" summ="$CI_TMP/step_summary" log="$CI_TMP/step.log"
  : >"$out"; : >"$envf"; : >"$pathf"; : >"$summ"; : >"$log"
  local -a tcmd=()
  tcmd=(timeout --foreground -k 15 "${tmo:-360}m")
  if (( VERBOSE )); then
    {
    (
      cd "$ROOT/$cwd" || exit 1
      PATH="${JOB_PATH_PREPEND}${JOB_PATH_PREFIX}${PATH}" \
      GITHUB_OUTPUT="$out" GITHUB_ENV="$envf" GITHUB_PATH="$pathf" GITHUB_STEP_SUMMARY="$summ" \
        exec "${tcmd[@]}" setsid "$CI_TMP/launch.sh" env "${JOB_ENV_KV[@]}" "${envs[@]}" bash --noprofile --norc "${flags[@]}" -c "$body"
    ) 2>&1 | tee "$log"; rc=${PIPESTATUS[0]}; } || true
  else
    (
      cd "$ROOT/$cwd" || exit 1
      PATH="${JOB_PATH_PREPEND}${JOB_PATH_PREFIX}${PATH}" \
      GITHUB_OUTPUT="$out" GITHUB_ENV="$envf" GITHUB_PATH="$pathf" GITHUB_STEP_SUMMARY="$summ" \
        exec "${tcmd[@]}" setsid "$CI_TMP/launch.sh" env "${JOB_ENV_KV[@]}" "${envs[@]}" bash --noprofile --norc "${flags[@]}" -c "$body"
    ) >"$log" 2>&1 || rc=$?
  fi
  [[ -n "$cleanup_cmd" ]] && add_cleanup "$cleanup_cmd"
  parse_github_output "$out" "$sid"
  parse_github_env "$envf"
  parse_github_path "$pathf"
  local dt=$((SECONDS - t0))
  if (( rc == 0 )); then
    echo "${C_G}✔${C_0} ${CUR_LABEL} / ${name} ${C_D}(${dt}s)${C_0}"
    STEP_OK=$((STEP_OK + 1))
    [[ -n "$sid" ]] && STEP_OUT["$sid.outcome"]=success
    [[ -n "$lockhash" && -d "$ROOT/$cwd/node_modules" ]] && printf '%s' "$lockhash" >"$marker"
  else
    local why="rc=${rc}"
    (( rc == 124 )) && why="timeout ${tmo}m (como no CI)"
    if (( coe )); then
      echo "${C_Y}✔${C_0} ${CUR_LABEL} / ${name} ${C_D}(${dt}s; ${why}, continue-on-error)${C_0}"
      STEP_OK=$((STEP_OK + 1))
    else
      echo "${C_R}✘${C_0} ${CUR_LABEL} / ${name} ${C_D}(${dt}s; ${why})${C_0}"
      STEP_FAIL=$((STEP_FAIL + 1))
      JOB_FAILED=1
    fi
    if (( ! VERBOSE )); then
      echo "${C_D}── últimas linhas de ${name}:${C_0}"
      tail -n 60 "$log" | sed 's/^/    /'
    fi
    [[ -n "$sid" ]] && STEP_OUT["$sid.outcome"]=failure
  fi
  return 0
}

# agregador emulado (lógica real de cada gate): "job:regra ..." (regra: must | skipok | docs_only) "advisory ..."
job_aggregate() {
  local item j rule r ok inconcl=0 docs_only
  docs_only=$(job_out changes docs_only)
  echo "  ${C_D}(agregador emulado com a lógica do workflow sobre os resultados locais; o script literal não roda)${C_0}"
  for item in $1; do
    j=${item%%:*}; rule=${item#*:}; [[ "$rule" == "$item" ]] && rule=must
    r=${JOB_RESULT[$j]:-pending}
    case "$r" in
      success) echo "  ${C_G}✔${C_0} $j: success" ;;
      failure) echo "  ${C_R}✘${C_0} $j: failure"; JOB_FAILED=1 ;;
      skipped_ci)
        ok=0
        [[ "$rule" == skipok ]] && ok=1
        [[ "$rule" == docs_only && "$docs_only" == true ]] && ok=1
        if (( ok )); then echo "  ${C_G}✔${C_0} $j: skipped (aceito pelo gate)"
        else echo "  ${C_R}✘${C_0} $j: skipped — o gate exige success"; JOB_FAILED=1; fi ;;
      inconclusive) echo "  ${C_Y}?${C_0} $j: INCONCLUSIVO (steps bloqueantes pulados localmente)"; inconcl=1 ;;
      assumed) echo "  ${C_Y}?${C_0} $j: não verificado (cloud-only)"; inconcl=1 ;;
      *) echo "  ${C_Y}?${C_0} $j: não verificado (pulado localmente)"; inconcl=1 ;;
    esac
  done
  for j in ${2:-}; do
    r=${JOB_RESULT[$j]:-pending}
    case "$r" in
      success) echo "  ${C_G}✔${C_0} $j: success (advisory)" ;;
      failure) echo "  ${C_Y}!${C_0} $j: failure (advisory — não bloqueia)" ;;
      *) echo "  ${C_Y}?${C_0} $j: não verificado (advisory)" ;;
    esac
  done
  (( inconcl )) && JOB_INCONCL=1
  return 0
}

service_pg_start() { # imagem porta-map env...  → 0 ok | 1 falhou | 2 porta ocupada (inconclusivo)
  local image=$1 ports=$2; shift 2
  local hostport=${ports%%:*} name="ci-local-pg-$$-$RANDOM" e i
  local -a envargs=()
  for e in "$@"; do envargs+=(-e "$e"); done
  /usr/bin/docker ps -aq --filter label=ci-local=1 --filter status=exited 2>/dev/null | xargs -r /usr/bin/docker rm -f >/dev/null 2>&1 || true
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${hostport}$"; then
    echo "  ${C_Y}⚠ porta ${hostport} já está em uso (Postgres/Supabase local?) — serviço postgres não sobe${C_0}"
    return 2
  fi
  echo "  ${C_D}▶ serviço postgres: /usr/bin/docker run -d --name $name -p $ports ${image}${C_0}"
  if ! /usr/bin/docker run -d --name "$name" --label ci-local=1 -p "$ports" "${envargs[@]}" "$image" >/dev/null; then
    echo "  ${C_R}✘ não consegui subir o serviço postgres${C_0}"
    return 1
  fi
  add_cleanup "/usr/bin/docker rm -f $name"
  for i in $(seq 1 60); do
    if /usr/bin/docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then
      echo "  ${C_D}serviço postgres pronto (${i}s)${C_0}"; return 0
    fi
    sleep 1
  done
  echo "  ${C_R}✘ serviço postgres não ficou pronto em 60s${C_0}"
  return 1
}

ver_check() { # ferramenta esperado atual
  if [[ -z "$3" ]]; then
    echo "${C_Y}⚠ versão:${C_0} $1 não encontrado no PATH (workflow usa $2)"
  elif [[ "$3" != "$2"* ]]; then
    echo "${C_Y}⚠ versão:${C_0} $1 instalado = $3, workflow usa $2 (seguindo com a instalada)"
  fi
}

wf_hash_check() {
  local atual f
  local -a files=()
  for f in $CI_WF_FILES; do [[ -f "$f" ]] && files+=("$f"); done
  (( ${#files[@]} )) || return 0
  atual=$(cat "${files[@]}" | sha256sum | cut -c1-16)
  if [[ "$atual" != "$CI_WF_HASH" ]]; then
    echo "${C_Y}⚠ os workflows (${CI_WF_FILES}) mudaram desde a geração deste script (${CI_GERADO_EM}): regenere com gera_ci_local.py — o resultado pode divergir do CI${C_0}"
  fi
}

in_csv() { # valor lista,csv
  local IFS=,; local x
  for x in $2; do [[ "$x" == "$1" ]] && return 0; done
  return 1
}
validate_ids() { # lista,csv rótulo
  local IFS=,; local x bad=""
  for x in $1; do [[ -n "${JOB_NAME[$x]+x}" ]] || bad="$bad $x"; done
  if [[ -n "$bad" ]]; then echo "$2: job(s) inexistente(s):$bad (veja --list)" >&2; exit 2; fi
}

print_list() {
  local id req mark
  printf '%s\n' "ci-local — ${CI_REPO}  (gerado ${CI_GERADO_EM} a partir de ${CI_WORKFLOWS})"
  printf '%s\n' "Checks obrigatórios na main (${CI_GERADO_EM}): ${CI_REQUIRED_CHECKS}"
  [[ -n "${CI_LIST_NOTAS:-}" ]] && printf '%s\n' "${CI_LIST_NOTAS}"
  wf_hash_check
  echo
  printf '%-26s %-7s %-15s %s\n' "job" "obrig." "classe" "check — o que pula"
  printf '%-26s %-7s %-15s %s\n' "---" "------" "------" "------------------"
  for id in "${JOB_ORDER[@]}"; do
    req=${JOB_REQ[$id]}
    case "$req" in
      req) mark="[REQ]" ;;
      via:*) mark="[REQ*]" ;;
      ci) mark="[ci]" ;;
      *) mark="[opt]" ;;
    esac
    printf '%-26s %-7s %-15s %s\n' "$id" "$mark" "${JOB_CLASS[$id]}" "${JOB_NAME[$id]}${JOB_STATIC_SKIPS[$id]:+ — pula: ${JOB_STATIC_SKIPS[$id]}}"
  done
  echo
  echo "[REQ] check obrigatório na main · [REQ*] exigido via agregador obrigatório · [ci] sem proteção na main (espelho) · [opt] só com --only"
}

only_closure() { # acrescenta ao --only os jobs provedores de outputs (needs transitivos) dos selecionados
  local changed=1 id n extra=""
  while (( changed )); do
    changed=0
    for id in "${JOB_ORDER[@]}"; do
      in_csv "$id" "$ONLY" || continue
      for n in ${JOB_NEEDS[$id]}; do
        if [[ "${JOB_PROVIDER[$n]}" == 1 ]] && ! in_csv "$n" "$ONLY" && ! in_csv "$n" "$SKIPS"; then
          ONLY="$ONLY,$n"; extra="$extra $n"; changed=1
        fi
      done
    done
  done
  [[ -n "$extra" ]] && echo "${C_D}--only: incluindo jobs provedores de outputs:${extra}${C_0}"
  return 0
}

selected() { # id -> 0 se deve rodar
  local id=$1
  in_csv "$id" "$SKIPS" && return 1
  if [[ -n "$ONLY" ]]; then in_csv "$id" "$ONLY"; return $?; fi
  [[ "${JOB_REQ[$id]}" != opt ]]
}
only_forced() { # job nomeado explicitamente em --only: roda mesmo com if: dependente de outro job
  [[ -n "$ONLY_EXPLICIT" ]] && in_csv "$CUR_JOB" "$ONLY_EXPLICIT"
}

run_jobs() {
  local id n fn dep_failed
  for id in "${JOB_ORDER[@]}"; do
    if ! selected "$id"; then
      JOB_RESULT[$id]=deselected   # p/ needs/if dos outros jobs conta como success (como no CI)
      if in_csv "$id" "$SKIPS"; then JOB_RUNTIME_SKIPS[$id]="--skip"
      elif [[ -n "$ONLY" ]]; then JOB_RUNTIME_SKIPS[$id]="fora de --only"
      else JOB_RUNTIME_SKIPS[$id]="opcional (rode com --only $id)"; fi
      continue
    fi
    if [[ "${JOB_CLOUD[$id]}" == 1 ]] && ! { [[ -n "$ONLY" ]] && in_csv "$id" "$ONLY"; }; then
      JOB_RESULT[$id]=assumed
      JOB_RUNTIME_SKIPS[$id]="cloud-only: ${JOB_STATIC_SKIPS[$id]}"
      echo
      echo "${C_Y}↷ SKIP${C_0} ${id} — ${JOB_NAME[$id]}: cloud-only (${JOB_STATIC_SKIPS[$id]}) — não verificado localmente"
      continue
    fi
    if [[ "${JOB_HEAVY[$id]}" == 1 ]] && (( FAST )); then
      JOB_RESULT[$id]=skipped_local; JOB_RUNTIME_SKIPS[$id]="opcional-pesado (--fast)"
      echo; echo "${C_Y}↷ SKIP${C_0} ${id} — ${JOB_NAME[$id]}: opcional-pesado (--fast)"
      continue
    fi
    if [[ "${JOB_DOCKER[$id]}" == 1 ]] && ! docker_ok; then
      JOB_RESULT[$id]=skipped_local; JOB_RUNTIME_SKIPS[$id]="precisa de docker (--no-docker/--fast)"
      echo; echo "${C_Y}↷ SKIP${C_0} ${id} — ${JOB_NAME[$id]}: precisa de docker (--no-docker/--fast)"
      continue
    fi
    dep_failed=""
    for n in ${JOB_NEEDS[$id]}; do
      [[ "${JOB_RESULT[$n]:-pending}" == failure ]] && dep_failed="$n"
    done
    if [[ -n "$dep_failed" && "${JOB_AGG[$id]}" != 1 ]]; then
      JOB_RESULT[$id]=skipped_ci; JOB_RUNTIME_SKIPS[$id]="dependência ${dep_failed} falhou"
      echo; echo "${C_Y}↷ SKIP${C_0} ${id} — ${JOB_NAME[$id]}: dependência ${dep_failed} falhou"
      continue
    fi
    fn="job_${id//[^A-Za-z0-9_]/_}"
    "$fn"
    if [[ "${JOB_RESULT[$id]}" == failure ]] && (( ! KEEP_GOING )); then
      echo; echo "${C_R}✘ ${id} falhou — parando (use --keep-going para continuar)${C_0}"
      return 0
    fi
  done
}

run_actionlint() {
  local f files=()
  echo
  if ! git rev-parse -q --verify origin/main >/dev/null 2>&1; then
    echo "actionlint: origin/main não existe localmente — pulado"; return 0
  fi
  while IFS= read -r f; do
    [[ -n "$f" && -f "$f" ]] && files+=("$f")
  done < <({ git diff --name-only origin/main -- .github/workflows/ 2>/dev/null; git ls-files --others --exclude-standard -- .github/workflows/; } | grep -E '\.ya?ml$' | sort -u || true)
  if (( ${#files[@]} == 0 )); then echo "actionlint: nenhum workflow alterado"; return 0; fi
  if ! command -v actionlint >/dev/null 2>&1; then
    echo "${C_Y}actionlint: não instalado — ${#files[@]} workflow(s) alterado(s) sem lint${C_0}"; return 0
  fi
  echo "${C_B}▶ actionlint${C_0} ${files[*]}"
  if actionlint "${files[@]}"; then
    echo "${C_G}✔${C_0} actionlint"
  else
    echo "${C_R}✘${C_0} actionlint"; ACTIONLINT_FAILED=1
  fi
}

print_summary() { # define EXIT_CODE
  local id r t s res col fail=0 inconcl=""
  echo
  printf '%s\n' "${C_B}Resumo${C_0}"
  printf '%-26s | %-14s | %7s | %s\n' "job" "resultado" "tempo" "o que pulou"
  printf '%-26s-+-%-14s-+-%7s-+-%s\n' "--------------------------" "--------------" "-------" "-----------"
  for id in "${JOB_ORDER[@]}"; do
    r=${JOB_RESULT[$id]}; t=${JOB_TIME[$id]}; s=${JOB_RUNTIME_SKIPS[$id]}
    case "$r" in
      success) res="✔ ok"; col=$C_G ;;
      failure) res="✘ FALHOU"; col=$C_R; [[ "${JOB_REQ[$id]}" != opt ]] && fail=1 ;;
      inconclusive) res="? inconcl."; col=$C_Y; [[ "${JOB_REQ[$id]}" != opt ]] && inconcl="$inconcl $id" ;;
      assumed) res="? cloud-only"; col=$C_Y; [[ "${JOB_REQ[$id]}" != opt ]] && inconcl="$inconcl $id" ;;
      skipped_local) res="↷ pulado"; col=$C_Y; [[ "${JOB_REQ[$id]}" != opt ]] && inconcl="$inconcl $id" ;;
      skipped_ci) res="↷ pulado (CI)"; col=$C_D ;;
      deselected) res="— fora"; col=$C_D ;;
      *) res="↷ pulado"; col=$C_Y ;;
    esac
    printf '%-26s | %s%-14s%s | %6ss | %s\n' "$id" "$col" "$res" "$C_0" "$t" "${s:-—}"
  done
  (( ACTIONLINT_FAILED )) && { echo "${C_R}✘ actionlint falhou nos workflows alterados${C_0}"; fail=1; }
  echo
  local escopo="todos os checks obrigatórios"
  [[ -n "$ONLY" ]] && escopo="os jobs selecionados (--only ${ONLY}; os demais não foram verificados)"
  if (( fail )); then
    echo "${C_R}✘ ci-local: há falhas em checks obrigatórios${C_0}"; EXIT_CODE=1
  elif [[ -n "$inconcl" ]]; then
    echo "${C_Y}? ci-local INCONCLUSIVO: checks obrigatórios não verificados localmente:${inconcl}${C_0}"
    EXIT_CODE=0
    if (( STRICT )); then EXIT_CODE=3; fi
  else
    echo "${C_G}✔ ci-local: ${escopo} rodaram e passaram${C_0}"; EXIT_CODE=0
  fi
  return 0
}

EXIT_CODE=0
ONLY_EXPLICIT=""
main() {
  local age
  ci_register_jobs
  if (( LIST )); then print_list; exit 0; fi
  [[ -n "$ONLY" ]] && validate_ids "$ONLY" "--only"
  [[ -n "$SKIPS" ]] && validate_ids "$SKIPS" "--skip"
  ONLY_EXPLICIT=$ONLY
  [[ -n "$ONLY" ]] && only_closure
  export TZ=UTC LANG=C.UTF-8 LC_ALL=C.UTF-8   # runners do GitHub são UTC
  CI_TMP=$(mktemp -d -t ci-local.XXXXXX)
  export CI_TMP
  printf '%s\n' '#!/usr/bin/env bash' 'trap '"'"'kill -TERM -- -$$ 2>/dev/null; sleep 2; kill -KILL -- -$$ 2>/dev/null'"'"' TERM INT' '"$@" & wait $!' >"$CI_TMP/launch.sh"
  chmod +x "$CI_TMP/launch.sh"
  GITHUB_SHA=$(git rev-parse HEAD)
  GITHUB_REF_NAME=$(git branch --show-current 2>/dev/null || true)
  GITHUB_REF_NAME=${GITHUB_REF_NAME:-HEAD}
  CI_FORCE_ALL=0
  if (( ALL_CHANGED )); then
    CI_BASE_SHA=$(git rev-list --max-parents=0 HEAD | tail -n1); CI_FORCE_ALL=1
    echo "${C_Y}--all-changed: todos os arquivos contam como alterados (base = commit raiz)${C_0}"
  elif [[ -n "$BASE_REF" ]]; then
    CI_BASE_SHA=$(git merge-base "$BASE_REF" HEAD 2>/dev/null) || { echo "--base: ref inválida: $BASE_REF" >&2; exit 2; }
  elif git rev-parse -q --verify origin/main >/dev/null 2>&1; then
    CI_BASE_SHA=$(git merge-base origin/main HEAD)
    age=$(( $(date +%s) - $(git log -1 --format=%ct origin/main) ))
    (( age > 7*86400 )) && echo "${C_Y}⚠ origin/main local tem $((age/86400)) dias — rode 'git fetch origin main' para uma base atual${C_0}"
  else
    CI_BASE_SHA=$GITHUB_SHA
  fi
  GITHUB_REPOSITORY=$(git remote get-url origin 2>/dev/null | sed -E 's#\.git$##; s#^.*[:/]([^/]+/[^/]+)$#\1#' || true)
  # arquivos alterados p/ os filtros de caminho: commits desde a base + working tree + novos não rastreados
  CI_CHANGED_FILES="$CI_TMP/changed-files.txt"
  { git diff --name-only "$CI_BASE_SHA" 2>/dev/null; git ls-files --others --exclude-standard; } | grep -v '^scripts/ci-local\.sh$' | sort -u >"$CI_CHANGED_FILES" || true
  if [[ "$CI_BASE_SHA" == "$GITHUB_SHA" ]] && (( ! ALL_CHANGED )); then
    echo "${C_Y}⚠ a base do PR emulado é o próprio HEAD (main, branch já mesclada ou sem commits): só mudanças não commitadas e arquivos novos contam${C_0}"
  fi
  if [[ ! -s "$CI_CHANGED_FILES" ]] && (( ! ALL_CHANGED )); then
    echo "${C_R}✘ nenhum arquivo alterado em relação à base ${CI_BASE_SHA:0:10} (nem commits, nem working tree, nem arquivos novos):${C_0}" >&2
    echo "   os filtros de caminho pulariam todos os jobs e o resultado seria vazio. Use --base <ref> (ex.: --base HEAD~1) ou --all-changed." >&2
    exit 2
  fi
  export GITHUB_SHA GITHUB_REF_NAME CI_BASE_SHA CI_FORCE_ALL CI_CHANGED_FILES GITHUB_REPOSITORY
  export GITHUB_REF="refs/heads/${GITHUB_REF_NAME}" GITHUB_BASE_REF=main GITHUB_HEAD_REF="$GITHUB_REF_NAME"
  export GITHUB_EVENT_NAME=pull_request GITHUB_ACTOR=local GITHUB_RUN_ID=local GITHUB_WORKSPACE="$ROOT"
  export RUNNER_OS=Linux RUNNER_TEMP="$CI_TMP" CI=true
  echo "${C_B}ci-local — ${CI_REPO}${C_0} ${C_D}(${GITHUB_REF_NAME} @ ${GITHUB_SHA:0:10}; base ${CI_BASE_SHA:0:10}; PR emulado)${C_0}"
  wf_hash_check
  ci_version_checks
  ci_env_setup
  run_jobs
  run_actionlint
  print_summary
  exit "$EXIT_CODE"
}

# ───────────────────────── versões (avisa uma vez; não instala) ─────────────────────────
ci_version_checks() {
  ver_check 'npm' '10.9' "$({ npm -v; } 2>/dev/null || true)"
  return 0
}
ci_env_setup() {
  ci_use_node '22' 0 '.nvmrc=22.22.1 / engines >=22.22.1 <25'
  return 0
}

# ───────────────────────── jobs (steps literais dos workflows) ─────────────────────────

job_changes() {
  job_begin 'changes' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  b=$(cat <<'CI_EOF'
# arquivos alterados: commits desde a base + working tree + novos (lista montada pelo runtime)
changed=$(cat "$CI_CHANGED_FILES")
[[ "${CI_FORCE_ALL:-0}" == 1 ]] && changed="(--all-changed)"
if [[ "${CI_FORCE_ALL:-0}" == 1 ]] || printf '%s\n' "$changed" | grep -qE '^src/.*$|^scripts/.*$|^supabase/.*$|^tests/.*$|^e2e/.*$|^playwright/.*$|^\.github/workflows/.*$|^\.github/actions/.*$|^package\.json$|^package-lock\.json$|^tsconfig[^/]*\.json$|^vite\.config\.[^/]*$|^playwright\.config\.[^/]*$|^\.nvmrc$|^eslint\.config[^/]*$'; then
  echo "code=true" >> "$GITHUB_OUTPUT"; echo "code=true"
else
  echo "code=false" >> "$GITHUB_OUTPUT"; echo "code=false"
fi
CI_EOF
)
  run_step 'Run dorny/paths-filter' --id 'filter' --shell '-eo pipefail' --timeout '2' --note 'paths-filter → git diff origin/main...HEAD' -- "$b"
  b=$(cat <<'CI_EOF'
CODE_CHANGED="@@E1@@"
if [[ "pull_request" == "pull_request" && "$CODE_CHANGED" == "false" ]]; then
  echo "docs_only=true" >> "$GITHUB_OUTPUT"
  echo "::notice::E14 — docs-only PR detectado; gates de código bypassados (success)"
else
  echo "docs_only=false" >> "$GITHUB_OUTPUT"
fi
CI_EOF
)
  b=${b//"@@E1@@"/"$(step_out filter code)"}
  run_step 'Determinar docs_only' --id 'result' --shell '-eo pipefail' --timeout '2' -- "$b"
  job_set_output 'changes' 'docs_only' "$(step_out result docs_only)"
  job_end
}

job_e2e_relevance() {
  job_begin 'e2e-relevance' ''
  local b=""
  b=$(cat <<'CI_EOF'
CHANGED_FILES=$(python3 -c 'import json,sys; print(json.dumps([l.strip() for l in open(sys.argv[1]) if l.strip()]))' "$CI_CHANGED_FILES")
export CHANGED_FILES
node .github/scripts/e2e-relevance.mjs | tee -a "$GITHUB_OUTPUT"
CI_EOF
)
  run_step 'Detectar impacto de runtime/E2E (reusable _e2e-relevance.yml)' --id 'result' --shell '-eo pipefail' -- "$b"
  job_set_output 'e2e-relevance' 'relevant' "$(step_out result relevant)"
  job_end
}

job_ssot_gate() {
  job_begin 'ssot-gate' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=true, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  quiet_skip  # Check lockfile sync (if dos inputs do composite = false)
  quiet_skip  # Install dependencies (if dos inputs do composite = false)
  b=$(cat <<'CI_EOF'
node scripts/validate-supabase-config.mjs
CI_EOF
)
  run_step 'Validate SSOT — client.ts deve apontar para doufsxqlfjyuvxuezpln' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder' --shell '-eo pipefail' --timeout '3' -- "$b"
  job_end
}

job_dependency_audit() {
  job_begin 'dependency-audit' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --shell '-eo pipefail' --timeout '5' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env 'IGNORE_SCRIPTS=false' --shell '-eo pipefail' --timeout '5' --install package-lock.json -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-dependency-audit.mjs
CI_EOF
)
  run_step 'Auditar dependências (advisory ≥ high bloqueia deploy)' --shell '-eo pipefail' --timeout '5' -- "$b"
  job_end
}

job_dependency_review() {
  job_begin 'dependency-review' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  skip_step 'Dependency Review — falha em deps com CVE severity ≥ high (E97)' 'action que depende da API/artefatos do GitHub' cloud
  job_end
}

job_lint_typecheck() {
  job_begin 'lint-typecheck' ''
  local b=""
  if ! only_forced && ! ( [[ "$(job_result ssot-gate)" == "success" ]] && ( [[ "$(job_result changes)" == "skipped" ]] || [[ "$(job_out changes docs_only)" != "true" ]] ) ); then job_skip_ci 'if do job = false: always() && needs.ssot-gate.result == '\''success'\'' && (needs.changes.result == '\''skipped'\'' || needs.changes.outputs.docs_only != '\''true'\'')'; return 0; fi
  if [[ "$(job_out changes docs_only)" == "true" ]]; then skip_step 'E14 — bypass docs-only PR' 'so escreve GITHUB_STEP_SUMMARY' info; else quiet_skip; fi
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'IGNORE_SCRIPTS=false' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' --install package-lock.json -- "$b"
  b=$(cat <<'CI_EOF'
npm run typecheck
CI_EOF
)
  run_step 'Run npm run typecheck' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
npm run lint:baseline
CI_EOF
)
  run_step 'Run npm run lint:baseline' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-product-type-fields.mjs
CI_EOF
)
  run_step 'Gate 1.1 — Product type fields (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
BASE="@@E1@@"
node scripts/check-types-inventory-drift.mjs --base "$BASE"
CI_EOF
)
  b=${b//"@@E1@@"/"$(v="${CI_BASE_SHA}"; if [[ -n "$v" ]]; then printf %s "$v"; else printf %s "HEAD~1"; fi)"}
  run_step 'Gate 1.2 — Types inventory drift (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
node scripts/check-migration-path-references.mjs
node scripts/check-supabase-reference-catalog.mjs
node scripts/check-migration-filename-contract.mjs
CI_EOF
)
  run_step 'Gate 1.3 — Migration contracts (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-visual-baselines.mjs
CI_EOF
)
  run_step 'Gate 1.4 — Visual baselines commitados (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-no-salvar-alteracoes-draft.mjs
CI_EOF
)
  run_step 'Gate 1.5 — Sem "Salvar Alterações" em fluxos de rascunho (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
sh scripts/tsc-unused-ratchet.sh --check-ratchet
CI_EOF
)
  run_step 'Gate 1.7 — TSC ratchet file guard (bloqueante em PR)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env "GITHUB_BASE_SHA=${CI_BASE_SHA}" --env 'GITHUB_LABELS=' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\'' && github.event_name == '\''pull_request'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [[ "$EVENT" == "pull_request" ]]; then
  git diff --name-only --diff-filter=AM "$BASE_SHA" "$HEAD_SHA" > ${RUNNER_TEMP}/b64-files.txt
elif [[ "$EVENT" == "push" ]]; then
  git diff --name-only --diff-filter=AM HEAD~1 HEAD > ${RUNNER_TEMP}/b64-files.txt \
    || git ls-files > ${RUNNER_TEMP}/b64-files.txt
else
  git ls-files > ${RUNNER_TEMP}/b64-files.txt
fi
INCLUDE='\.(ts|tsx|js|jsx|json|sql|sh|md|yaml|yml|html|css|env|env\.example|toml|conf|rc)$'
EXCLUDE='(package-lock\.json|pnpm-lock\.yaml|bun\.lock|yarn\.lock|\.min\.|\.bundle\.|^supabase/migrations-snapshot/ALL_IN_ONE\.sql$)'
FOUND=0
while IFS= read -r F; do
  [[ -z "$F" || ! -f "$F" ]] && continue
  [[ "$F" =~ $INCLUDE ]] || continue
  [[ "$F" =~ $EXCLUDE ]] && continue
  N=0
  while IFS= read -r L || [[ -n "$L" ]]; do
    N=$((N+1)); LEN=${#L}
    if (( LEN >= 200 )) && [[ "$L" =~ ^[A-Za-z0-9+/=]+$ ]]; then
      FOUND=$((FOUND+1))
      echo "::error file=$F,line=$N::${LEN} chars de alfabeto base64 puro — arquivo possivelmente encodado acidentalmente."
    fi
  done < "$F"
done < ${RUNNER_TEMP}/b64-files.txt
exit $(( FOUND > 0 ))
CI_EOF
)
  run_step 'Gate 1.8 — Detect accidentally base64-encoded files (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'EVENT=pull_request' --env "BASE_SHA=${CI_BASE_SHA}" --env "HEAD_SHA=${GITHUB_SHA}" --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' --note '/tmp/ → $RUNNER_TEMP/' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
node scripts/check-todo-baseline.mjs
node scripts/check-as-assertions-baseline.mjs
node scripts/check-as-unknown-baseline.mjs
node scripts/check-file-size-baseline.mjs
node scripts/check-eslint-disable-baseline.mjs
CI_EOF
)
  run_step 'Gate 1.9 — Dívida técnica (ratchets TODO / as / file-size / eslint-disable)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-console-baseline.mjs
CI_EOF
)
  run_step 'Gate 1.9.1 — console.* baseline (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-boundary-baseline.mjs
CI_EOF
)
  run_step 'Gate 1.9.2 — boundary cross-domain entre pages (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
node scripts/check-contract-coverage.mjs
node scripts/check-soft-delete-policy.mjs
node scripts/check-edge-zod-ratchet.mjs
# Cobertura do manifest de autorização — o script existia órfão
# de workflow (achado da validação exaustiva 2026-10).
node scripts/check-edge-authorization.mjs
CI_EOF
)
  run_step 'Gate 1.12 — Contract coverage + soft-delete policy (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-policies-baseline.mjs --require-live
CI_EOF
)
  run_step 'Gate 1.13 — Policies baseline vs pg_policies live (obrigatório)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env "SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}" --env 'SUPABASE_PROJECT_REF=doufsxqlfjyuvxuezpln' --secrets 'SUPABASE_ACCESS_TOKEN' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\'' && (github.event_name != '\''pull_request'\'' || github.event.pull_request.head.repo.full_name == github.repository)' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-policies-baseline.mjs
CI_EOF
)
  run_step 'Gate 1.13 — Policies baseline estático em PR de fork' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'SUPABASE_PROJECT_REF=doufsxqlfjyuvxuezpln' --shell '-eo pipefail' --timeout '15' --note 'variante estática usada localmente no lugar de --require-live (SUPABASE_ACCESS_TOKEN)' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-rls-no-policy-drift.mjs --gate
CI_EOF
)
  run_step 'Gate 1.13.1 — RLS sem policy (E045)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env "SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}" --env 'SUPABASE_PROJECT_REF=doufsxqlfjyuvxuezpln' --secrets 'SUPABASE_ACCESS_TOKEN' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-anon-insert-rate-guard.mjs --gate --require-live
CI_EOF
)
  run_step 'Gate 1.13.2 — Anon-insert rate guard manifest (E049)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env "SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}" --env 'SUPABASE_PROJECT_REF=doufsxqlfjyuvxuezpln' --secrets 'SUPABASE_ACCESS_TOKEN' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-migration-receipts.mjs --gate
CI_EOF
)
  run_step 'Gate 1.13.3 — Migration receipts (E055)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env "SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}" --env 'SUPABASE_PROJECT_REF=doufsxqlfjyuvxuezpln' --secrets 'SUPABASE_ACCESS_TOKEN' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-indexed-access-ratchet.mjs
CI_EOF
)
  run_step 'Gate 1.10 — Indexed-access ratchet (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-workflow-contracts.mjs --gate
CI_EOF
)
  run_step 'Gate 1.11 — Workflow contracts (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-secrets-inventory.mjs --gate
CI_EOF
)
  run_step 'Gate 1.14 — Secrets inventory (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-overflow-x-clip.mjs
CI_EOF
)
  run_step 'Gate 1.15 — overflow-x-clip em MainLayout (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/validate-quotes-list.mjs
CI_EOF
)
  run_step 'Gate 1.16 — Quotes list invariants (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-codeowners-coverage.mjs --gate
CI_EOF
)
  run_step 'Gate 1.17 — CODEOWNERS coverage de gate files (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/ci-cron-table.mjs --min-spacing 20
CI_EOF
)
  run_step 'Gate E89 — Cron spacing ≥ 20 min entre workflows privilegiados (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
fail=0
for f in supabase/functions/bulk-random-passwords/index.ts \
         supabase/functions/audit-suite/index.ts \
         supabase/functions/e2e-cleanup/index.ts; do
  count=$(grep -c "buildPublicCorsHeaders" "$f" || true)
  if [ "$count" -gt 0 ]; then
    echo "FAIL: buildPublicCorsHeaders encontrado em $f ($count vez(es))"
    fail=1
  fi
done
# _shared/ é o helper aprovado — excluir da busca de literal wildcard (E95)
literal=$(grep -Frl "'Access-Control-Allow-Origin': '*'" supabase/functions/ \
           --exclude-dir=_shared || true)
if [ -n "$literal" ]; then
  echo "FAIL: literal 'Access-Control-Allow-Origin: *' em:"
  echo "$literal"
  fail=1
fi
[ "$fail" -eq 0 ] || exit 1
echo "OK: CORS snapshot limpo"
CI_EOF
)
  run_step 'Gate E95 — CORS snapshot (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-toast-leaks.mjs
CI_EOF
)
  run_step 'Gate E113 — Toast leaks (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-aschild-nesting.mjs
CI_EOF
)
  run_step 'Gate E118a — asChild nesting (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-route-ref-usage.mjs
CI_EOF
)
  run_step 'Gate E118b — route-ref-usage (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-route-error-element.mjs
CI_EOF
)
  run_step 'Gate E118c — route-error-element (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-no-inline-cors.mjs
CI_EOF
)
  run_step 'Gate E118d — no-inline-cors (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-summary-color-tokens.mjs
CI_EOF
)
  run_step 'Gate E118e — summary-color-tokens (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-seller-scope.mjs
CI_EOF
)
  run_step 'Gate E118f — seller-scope (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-client-structured-logging.mjs
CI_EOF
)
  run_step 'Gate E118g — client-structured-logging (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-schema-reference-drift.mjs
CI_EOF
)
  run_step 'Gate E118h — schema-reference-drift (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-public-views-drift.mjs
CI_EOF
)
  run_step 'Gate E118i — public-views-drift (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-eslint-config-current.mjs --strict
CI_EOF
)
  run_step 'Gate E118j — proposed-configs (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-product-type-duplicates.mjs
CI_EOF
)
  run_step 'Gate E119 — Product interface ratchet (bloqueante)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-conflict-ledger.mjs --gate
CI_EOF
)
  run_step 'Gate 1.18 — Ledger de conflitos semânticos (E188)' --env 'NODE_OPTIONS=--max-old-space-size=4096' --env 'GITHUB_BASE_REF=main' --env "GITHUB_HEAD_REF=${GITHUB_REF_NAME}" --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  job_end
}

job_unit_tests() {
  job_begin 'unit-tests' ''
  local b=""
  if ! only_forced && ! ( [[ "$(job_result ssot-gate)" == "success" ]] && ( [[ "$(job_result changes)" == "skipped" ]] || [[ "$(job_out changes docs_only)" != "true" ]] ) ); then job_skip_ci 'if do job = false: always() && needs.ssot-gate.result == '\''success'\'' && (needs.changes.result == '\''skipped'\'' || needs.changes.outputs.docs_only != '\''true'\'')'; return 0; fi
  if [[ "$(job_out changes docs_only)" == "true" ]]; then skip_step 'E14 — bypass docs-only PR' 'so escreve GITHUB_STEP_SUMMARY' info; else quiet_skip; fi
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '45' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env 'IGNORE_SCRIPTS=false' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '45' --install package-lock.json -- "$b"
  b=$(cat <<'CI_EOF'
npm run test:ci-core
CI_EOF
)
  run_step 'Run npm run test:ci-core' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '45' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
TZ=America/Sao_Paulo npx vitest run \
  tests/contracts/webhook-scenario-matrix.test.ts \
  --reporter=dot
CI_EOF
)
  run_step 'Webhook scenario matrix (contratos Zod, 0 HTTP)' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '45' -- "$b"
  job_end
}

job_database_integrity() {
  job_begin 'database-integrity' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  b=$(cat <<'CI_EOF'
scripts/test-approved-plan-database.sh
CI_EOF
)
  run_step 'Validate discount approval, grants and trigger races on PG17' --docker --shell '-eo pipefail' --timeout '10' -- "$b"
  b=$(cat <<'CI_EOF'
npm run test:quote-rpc:postgres
CI_EOF
)
  run_step 'Validate guarded quote RPC proposals on pinned isolated PG17' --docker --shell '-eo pipefail' --timeout '10' -- "$b"
  b=$(cat <<'CI_EOF'
npm run check:quote-rpc:canonical -- --require-live
CI_EOF
)
  run_step 'Block frontend promotion until canonical quote RPC contract is live' --env "SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}" --env 'SUPABASE_PROJECT_REF=doufsxqlfjyuvxuezpln' --secrets 'SUPABASE_ACCESS_TOKEN' --shell '-eo pipefail' --timeout '10' -- "$b"
  job_end
}

job_secret_scan() {
  job_begin 'secret-scan' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  skip_step 'Install gitleaks' 'instalação global em /usr/local/bin (gitleaks já instalado no WSL)' info
  b=$(cat <<'CI_EOF'
# E172: bloqueante — falha se encontrar segredo
if [ -f .gitleaks.toml ]; then
  gitleaks detect --source . --config .gitleaks.toml --exit-code 1 --no-git
else
  gitleaks detect --source . --exit-code 1 --no-git
fi
CI_EOF
)
  run_step 'Run gitleaks' --shell '-eo pipefail' --timeout '5' -- "$b"
  job_end
}

job_secrets_check() {
  job_begin 'secrets-check' ''
  local b=""
  job_end
}

job_seo_sanity() {
  job_begin 'seo-sanity' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=true, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  quiet_skip  # Check lockfile sync (if dos inputs do composite = false)
  quiet_skip  # Install dependencies (if dos inputs do composite = false)
  b=$(cat <<'CI_EOF'
node scripts/seo-sanity-check.mjs
CI_EOF
)
  run_step 'Run SEO sanity check' --shell '-eo pipefail' --timeout '5' -- "$b"
  job_end
}

job_restore_cart_rpc_gate() {
  job_begin 'restore-cart-rpc-gate' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --shell '-eo pipefail' --timeout '5' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env 'IGNORE_SCRIPTS=false' --shell '-eo pipefail' --timeout '5' --install package-lock.json -- "$b"
  b=$(cat <<'CI_EOF'
npm run check:restore-seller-cart-rpc
CI_EOF
)
  run_step 'Verificar assinatura publicada da RPC' --env 'CANONICAL_SUPABASE_URL=https://doufsxqlfjyuvxuezpln.supabase.co' --env "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}" --env 'STRICT=1' --secrets 'SUPABASE_SERVICE_ROLE_KEY' --shell '-eo pipefail' --timeout '5' -- "$b"
  job_end
}

job_e2e_smoke() {
  job_begin 'e2e-smoke' ''
  local b=""
  if ! only_forced && ! ( ( [[ "$(job_result ssot-gate)" == "success" ]] && [[ "$(job_result secrets-check)" == "success" ]] ) && ( [[ "$(job_result changes)" == "skipped" ]] || [[ "$(job_out changes docs_only)" != "true" ]] ) ); then job_skip_ci 'if do job = false: always() && needs.ssot-gate.result == '\''success'\'' && needs.secrets-check.result == '\''success'\'' && (needs.changes.result == '\''skipped'\'' || needs.changes.outputs.docs_only != '\''true'\'')'; return 0; fi
  quiet_skip  # Run actions/checkout (actions/checkout)
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://doufsxqlfjyuvxuezpln.supabase.co}" --env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_tjH5qAbZ0e5HTTd872NijQ_s9m6JvYU}" --if '[[ "$(job_out e2e-relevance relevant)" != "false" ]]' 'needs.e2e-relevance.outputs.relevant != '\''false'\''' --shell '-eo pipefail' --timeout '20' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://doufsxqlfjyuvxuezpln.supabase.co}" --env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_tjH5qAbZ0e5HTTd872NijQ_s9m6JvYU}" --env 'IGNORE_SCRIPTS=false' --if '[[ "$(job_out e2e-relevance relevant)" != "false" ]]' 'needs.e2e-relevance.outputs.relevant != '\''false'\''' --shell '-eo pipefail' --timeout '20' --install package-lock.json -- "$b"
  quiet_skip  # Cache Playwright browsers (actions/cache)
  b=$(cat <<'CI_EOF'
npx playwright install chromium
CI_EOF
)
  run_step 'Install Playwright browsers' --env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://doufsxqlfjyuvxuezpln.supabase.co}" --env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_tjH5qAbZ0e5HTTd872NijQ_s9m6JvYU}" --if '( [[ "$(job_out e2e-relevance relevant)" != "false" ]] && [[ "$(step_out cache-playwright cache-hit)" != "true" ]] )' 'needs.e2e-relevance.outputs.relevant != '\''false'\'' && steps.cache-playwright.outputs.cache-hit != '\''true'\''' --heavy --shell '-eo pipefail' --timeout '20' --note 'sem --with-deps (sudo apt)' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/e2e-smoke-coverage-doc.mjs --check
CI_EOF
)
  run_step 'Validar doc de auditoria do smoke (drift check)' --env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://doufsxqlfjyuvxuezpln.supabase.co}" --env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_tjH5qAbZ0e5HTTd872NijQ_s9m6JvYU}" --if '[[ "$(job_out e2e-relevance relevant)" != "false" ]]' 'needs.e2e-relevance.outputs.relevant != '\''false'\''' --shell '-eo pipefail' --timeout '20' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-smoke-tags.mjs
CI_EOF
)
  run_step 'Validar tags @smoke no spec do gate' --env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://doufsxqlfjyuvxuezpln.supabase.co}" --env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_tjH5qAbZ0e5HTTd872NijQ_s9m6JvYU}" --if '[[ "$(job_out e2e-relevance relevant)" != "false" ]]' 'needs.e2e-relevance.outputs.relevant != '\''false'\''' --shell '-eo pipefail' --timeout '20' -- "$b"
  if [[ "$(job_out e2e-relevance relevant)" == "false" ]]; then skip_step 'Bypass E2E para mudança exclusivamente unitária' 'so escreve GITHUB_STEP_SUMMARY' info; else quiet_skip; fi
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ ! -d "e2e" ] && [ ! -d "tests/e2e" ] && [ ! -d "playwright" ]; then
  echo "::error::No e2e folder found — Gate 3 requires e2e tests (add e2e/ or tests/e2e/)"
  exit 1
fi
# E015: authed smoke quando credentials válidas e mock auth desativado; public-only caso contrário
if [ -n "$E2E_USER_EMAIL" ] && [ "${E2E_MOCK_AUTH:-0}" != "1" ]; then
  npm run test:e2e:smoke
else
  echo "::notice::E015 — mock auth ativo ou sem credenciais E2E: rodando smoke público (@smoke, chromium-public)"
  npx playwright test --project=chromium-public --grep @smoke --reporter=github,list
fi
CI_EOF
)
  run_step 'Run Playwright smoke tests' --env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://doufsxqlfjyuvxuezpln.supabase.co}" --env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_tjH5qAbZ0e5HTTd872NijQ_s9m6JvYU}" --env "E2E_USER_EMAIL=${E2E_USER_EMAIL:-}" --env "E2E_USER_PASSWORD=${E2E_USER_PASSWORD:-}" --env "E2E_ADMIN_EMAIL=${E2E_ADMIN_EMAIL:-}" --env "E2E_ADMIN_PASSWORD=${E2E_ADMIN_PASSWORD:-}" --if '[[ "$(job_out e2e-relevance relevant)" != "false" ]]' 'needs.e2e-relevance.outputs.relevant != '\''false'\''' --heavy --shell '-eo pipefail' --timeout '20' --note 'E2E_MOCK_AUTH=1 → smoke público sem segredos (como no CI)' -- "$b"
  quiet_skip  # Upload Playwright report (actions/upload-artifact)
  job_end
}

job_build() {
  job_begin 'build' ''
  local b=""
  if ! only_forced && ! ( ( ( ( [[ "$(job_result changes)" == "skipped" ]] || [[ "$(job_out changes docs_only)" != "true" ]] ) && [[ "$(job_result lint-typecheck)" == "success" ]] ) && [[ "$(job_result seo-sanity)" == "success" ]] ) && [[ "$(job_result restore-cart-rpc-gate)" != "failure" ]] ); then job_skip_ci 'if do job = false: always() && (needs.changes.result == '\''skipped'\'' || needs.changes.outputs.docs_only != '\''true'\'') && needs.lint-typecheck.result == '\''success'\'' && needs.seo-sanity.result == '\''success'\'' && needs.restore-cart-rpc-gate.result != '\''failure'\'''; return 0; fi
  if [[ "$(job_out changes docs_only)" == "true" ]]; then skip_step 'E14 — bypass docs-only PR' 'so escreve GITHUB_STEP_SUMMARY' info; else quiet_skip; fi
  quiet_skip  # Run actions/checkout (actions/checkout)
  if ( [[ "$(job_out changes docs_only)" != "true" ]] && [[ "${CI_BASE_SHA}" != "" ]] ); then skip_step 'Fetch base SHA for bundle ratchet' 'base (merge-base com origin/main) já está local' info; else quiet_skip; fi
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '10' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env 'IGNORE_SCRIPTS=false' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '10' --install package-lock.json -- "$b"
  b=$(cat <<'CI_EOF'
npm run build
CI_EOF
)
  run_step 'Run npm run build' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '10' -- "$b"
  b=$(cat <<'CI_EOF'
node scripts/check-bundle-size.mjs --check-ratchet
CI_EOF
)
  run_step 'Gate 1.6 — Bundle size dentro dos limites (bloqueante)' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder' --env "GITHUB_BASE_SHA=${CI_BASE_SHA}" --env 'GITHUB_LABELS=' --if '[[ "$(job_out changes docs_only)" != "true" ]]' 'needs.changes.outputs.docs_only != '\''true'\''' --shell '-eo pipefail' --timeout '10' -- "$b"
  quiet_skip  # Upload dist artifact (actions/upload-artifact)
  quiet_skip  # Generate SBOM (E99) (action com if=false no PR local)
  quiet_skip  # Attest build provenance (E99) (action com if=false no PR local)
  job_end
}

job_check_schema_paths() {
  job_begin 'check-schema-paths' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  b=$(cat <<'CI_EOF'
set -euo pipefail
changed=$(grep -cE '^supabase/(migrations/|baseline/|config\.toml)|^scripts/drift-baseline\.mjs|\.github/workflows/db-schema-drift-check\.yml' "$CI_CHANGED_FILES" || true)
if [ "${changed:-0}" -gt 0 ]; then
  echo "changed=true" >> "$GITHUB_OUTPUT"
  echo "::notice::${changed} arquivo(s) de schema/migration alterados — drift-check ativado."
else
  echo "changed=false" >> "$GITHUB_OUTPUT"
  echo "::notice::Nenhum arquivo de schema/migration alterado — drift-check dispensado."
fi
CI_EOF
)
  run_step 'Detect schema-relevant path changes' --id 'detect' --env "BASE_SHA=$(v="${CI_BASE_SHA}"; if [[ -n "$v" ]]; then printf %s "$v"; else printf %s ""; fi)" --env "HEAD_SHA=${GITHUB_SHA}" --shell '-eo pipefail' --timeout '2' --note 'detecção inclui working tree e arquivos novos (mesmo regex do workflow)' -- "$b"
  job_set_output 'check-schema-paths' 'changed' "$(step_out detect changed)"
  job_end
}

job_schema_drift_gate() {
  job_begin 'schema-drift-gate' ''
  local b=""
  if ! only_forced && ! [[ "$(job_out check-schema-paths changed)" == "true" ]]; then job_skip_ci 'if do job = false: needs.check-schema-paths.outputs.changed == '\''true'\'' && (github.event_name != '\''pull_request'\'' || github.event.pull_request.head.repo.full_name == github.repository)'; return 0; fi
  job_end
}

job_deploy_ready() {
  job_begin 'deploy-ready' ''
  local b=""
  job_aggregate 'ssot-gate:must dependency-audit:must dependency-review:must lint-typecheck:docs_only unit-tests:docs_only database-integrity:must e2e-smoke:docs_only secret-scan:must seo-sanity:must restore-cart-rpc-gate:must build:docs_only schema-drift-gate:skipok' ''
  job_end
}

job_lighthouse() {
  job_begin 'lighthouse' ''
  local b=""
  quiet_skip  # Run actions/checkout (actions/checkout)
  b=$(cat <<'CI_EOF'
BASE="@@E1@@"
if [ -z "$BASE" ]; then
  BASE=""
fi
if [ -z "$BASE" ] || ! git rev-parse "$BASE" >/dev/null 2>&1; then
  echo "changed=true" >> "$GITHUB_OUTPUT"
else
  CHANGED=$(git diff --name-only "$BASE" HEAD -- src/ | wc -l)
  if [ "$CHANGED" -gt 0 ]; then
    echo "changed=true" >> "$GITHUB_OUTPUT"
  else
    echo "changed=false" >> "$GITHUB_OUTPUT"
    echo "::notice::Nenhuma mudança em src/ — Lighthouse CI pulado."
  fi
fi
CI_EOF
)
  b=${b//"@@E1@@"/"${CI_BASE_SHA}"}
  run_step 'Check if src/ changed (E161)' --id 'src-check' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_PUBLISHABLE_KEY=lighthouse-placeholder-key' --shell '-eo pipefail' --timeout '15' -- "$b"
  # composite ./.github/actions/setup-node-ci (install=true, ignore-scripts=false, skip-install=false, working-directory=.)
  quiet_skip  # Run actions/setup-node (actions/setup-node)
  b=$(cat <<'CI_EOF'
node scripts/check-lockfile-sync.mjs
CI_EOF
)
  run_step 'Check lockfile sync' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_PUBLISHABLE_KEY=lighthouse-placeholder-key' --if '[[ "$(step_out src-check changed)" == "true" ]]' 'steps.src-check.outputs.changed == '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
set -euo pipefail
if [ "$IGNORE_SCRIPTS" = "true" ]; then
  npm ci --no-audit --no-fund --ignore-scripts
else
  npm ci --no-audit --no-fund
fi
CI_EOF
)
  run_step 'Install dependencies' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_PUBLISHABLE_KEY=lighthouse-placeholder-key' --env 'IGNORE_SCRIPTS=false' --if '[[ "$(step_out src-check changed)" == "true" ]]' 'steps.src-check.outputs.changed == '\''true'\''' --shell '-eo pipefail' --timeout '15' --install package-lock.json -- "$b"
  b=$(cat <<'CI_EOF'
npm run build
CI_EOF
)
  run_step 'Run npm run build' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_PUBLISHABLE_KEY=lighthouse-placeholder-key' --if '[[ "$(step_out src-check changed)" == "true" ]]' 'steps.src-check.outputs.changed == '\''true'\''' --shell '-eo pipefail' --timeout '15' -- "$b"
  b=$(cat <<'CI_EOF'
npx lhci autorun --config=.lighthouserc.json
CI_EOF
)
  run_step 'Run Lighthouse CI' --env 'VITE_SUPABASE_URL=https://placeholder.supabase.co' --env 'VITE_SUPABASE_PUBLISHABLE_KEY=lighthouse-placeholder-key' --env "LHCI_GITHUB_APP_TOKEN=${LHCI_GITHUB_APP_TOKEN:-}" --if '[[ "$(step_out src-check changed)" == "true" ]]' 'steps.src-check.outputs.changed == '\''true'\''' --heavy --shell '-eo pipefail' --timeout '15' -- "$b"
  quiet_skip  # Upload Lighthouse report (actions/upload-artifact)
  job_end
}

ci_register_jobs() {
  reg_job 'changes' 'Detectar mudanças (docs-only bypass E14)' 'deploy-gates.yml' 'via:deploy-ready' 'local' '' '' 0 0 0 0 1
  reg_job 'e2e-relevance' 'e2e-relevance' 'deploy-gates.yml' 'via:deploy-ready' 'local' '' '' 0 0 0 0 1
  reg_job 'ssot-gate' 'Gate 0 - SSOT Supabase (project ID canônico)' 'deploy-gates.yml' 'via:deploy-ready' 'local' '' '' 0 0 0 0 0
  reg_job 'dependency-audit' 'Gate 0.5 - Dependency Audit' 'deploy-gates.yml' 'via:deploy-ready' 'local' 'ssot-gate' '' 0 0 0 0 0
  reg_job 'dependency-review' 'Gate 0.6 - Dependency Review' 'deploy-gates.yml' 'via:deploy-ready' 'cloud-only' 'ssot-gate' 'Dependency Review — falha em deps com CVE severity ≥ high (E97) (action que depende da API/artefatos do GitHub)' 0 0 1 0 0
  reg_job 'lint-typecheck' 'Gate 1 - Lint + TypeScript' 'deploy-gates.yml' 'via:deploy-ready' 'parcial' 'ssot-gate changes' 'E14 — bypass docs-only PR (so escreve GITHUB_STEP_SUMMARY); segredos: SUPABASE_ACCESS_TOKEN' 0 0 0 0 0
  reg_job 'unit-tests' 'Gate 2 - Unit Tests' 'deploy-gates.yml' 'via:deploy-ready' 'local' 'ssot-gate changes' 'E14 — bypass docs-only PR (so escreve GITHUB_STEP_SUMMARY)' 0 0 0 0 0
  reg_job 'database-integrity' 'Gate 2.5 - PostgreSQL Transactional Integrity' 'deploy-gates.yml' 'via:deploy-ready' 'parcial' 'ssot-gate' '2 step(s) docker; segredos: SUPABASE_ACCESS_TOKEN' 0 0 0 0 0
  reg_job 'secret-scan' 'Gate E23 - Secret Scan (gitleaks)' 'deploy-gates.yml' 'via:deploy-ready' 'local' 'ssot-gate' 'Install gitleaks (instalação global em /usr/local/bin (gitleaks já instalado n)' 0 0 0 0 0
  reg_job 'secrets-check' 'Gate E23 - Verifica secrets E2E' 'deploy-gates.yml' 'via:deploy-ready' 'cloud-only' 'ssot-gate' '' 0 0 1 0 0
  reg_job 'seo-sanity' 'Gate 5 - SEO Sanity Check' 'deploy-gates.yml' 'via:deploy-ready' 'local' 'ssot-gate' '' 0 0 0 0 0
  reg_job 'restore-cart-rpc-gate' 'Gate 5.5 - RPC restore_seller_cart presente no canônico' 'deploy-gates.yml' 'via:deploy-ready' 'cloud-only' 'ssot-gate' 'segredos: SUPABASE_SERVICE_ROLE_KEY' 0 0 1 0 0
  reg_job 'e2e-smoke' 'Gate 3 - E2E Smoke' 'deploy-gates.yml' 'via:deploy-ready' 'opcional-pesado' 'ssot-gate secrets-check changes e2e-relevance' 'Bypass E2E para mudança exclusivamente unitária (so escreve GITHUB_STEP_SUMMARY); 2 step(s) pesados' 1 0 0 0 0
  reg_job 'build' 'Gate 6 - Build' 'deploy-gates.yml' 'via:deploy-ready' 'local' 'lint-typecheck seo-sanity restore-cart-rpc-gate changes' 'E14 — bypass docs-only PR (so escreve GITHUB_STEP_SUMMARY); Fetch base SHA for bundle ratchet (base (merge-base com origin/main) já está local)' 0 0 0 0 0
  reg_job 'check-schema-paths' 'Gate E40 - Detect schema file changes' 'deploy-gates.yml' 'via:deploy-ready' 'local' 'ssot-gate' '' 0 0 0 0 1
  reg_job 'schema-drift-gate' 'Gate E40 - Schema Drift Check' 'deploy-gates.yml' 'via:deploy-ready' 'cloud-only' 'check-schema-paths' '' 0 0 1 0 0
  reg_job 'deploy-ready' 'Gate Final - Deploy Ready' 'deploy-gates.yml' 'req' 'local' 'changes ssot-gate dependency-audit dependency-review lint-typecheck unit-tests database-integrity e2e-smoke secret-scan seo-sanity restore-cart-rpc-gate build check-schema-paths schema-drift-gate' 'agregador emulado (lógica do gate sobre os resultados locais)' 0 0 0 1 0
  reg_job 'lighthouse' 'Gate 4 - Lighthouse CI' 'deploy-gates.yml' 'opt' 'opcional-pesado' 'ssot-gate' '1 step(s) pesados' 1 0 0 0 0
}

main "$@"
