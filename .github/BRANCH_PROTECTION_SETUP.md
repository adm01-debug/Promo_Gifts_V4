# Como ligar Branch Protection em `main` (5 minutos)

> **Por que isso é necessário:** o `Branch Protection Sentinel` (workflow) é só
> um **alarme post-mortem** — ele detecta pushes direto em `main` depois que
> já aconteceram. A **prevenção real** vem da configuração nativa do GitHub.

## Pré-requisito

Permissão de **admin** no repositório `adm01-debug/promo-gifts-v4` (o owner já tem).

## Passo a passo

### 1. Acesse a configuração de branches

Vá em: <https://github.com/adm01-debug/promo-gifts-v4/settings/branches>

### 2. Clique em **Add branch ruleset** (ou "Add rule" se for UI antiga)

> A GitHub renomeou "branch protection rules" para "rulesets" em 2023.
> Ambos funcionam — o ruleset é mais flexível.

### 3. Configure o ruleset

**Nome:** `Protect main`

**Enforcement status:** `Active`

**Target branches:** clique em `Add target` → `Include default branch` (ou explicitamente `main`)

### 4. Marque estas regras

| Regra | Valor recomendado | Motivo |
|---|---|---|
| ✅ **Restrict deletions** | ON | Impede `git push --delete origin main` |
| ✅ **Block force pushes** | ON | Impede `git push --force` que reescreve histórico |
| ✅ **Require a pull request before merging** | ON | A prevenção principal — força PR |
| └─ Required approvals | `1` | Previne merge imediato após push do Lovable (self-approve bloqueado via `require_last_push_approval`) |
| └─ Dismiss stale approvals when new commits are pushed | ON | Boa prática |
| ✅ **Require status checks to pass** | ON | Garante que CI roda antes do merge |
| └─ Adicione: `Gate Final - Deploy Ready` | | Único required check — agrega todos os gates de PR em `deploy-gates.yml` |
| ⚪ Require signed commits | OFF (opcional) | Só se você assina com GPG/SSH |
| ⚪ Require linear history | ON (opcional) | Força squash/rebase, proíbe merge commit |

### 5. Bypass list (chave-mestra rastreável)

Em **Bypass list**, clique em `Add bypass` e adicione:

- **adm01-debug** com modo `For pull requests` (não `Always`)

> **`Always` permite push direto em `main`** — use `For pull requests` para
> que o bypass só se aplique ao merge, não ao push. Emergências usam o botão
> "Bypass" explícito na UI do PR (auditável em `Settings → Audit log`).

### 6. Salve

Clique em **Create** (ou **Save changes**).

## Validação

Depois de salvar:

1. Aguarde 30s para a config propagar.
2. Vá na aba **Actions** e rode manualmente o workflow `Branch Protection Sentinel`
   (botão `Run workflow`).
3. No Summary do run, o job `Verify Branch Protection is enabled on main`
   deve mostrar **✅ Branch `main` está protegida**.

## Teste prático (opcional, mas recomendado)

Para confirmar que está funcionando, tente um push direto:

```bash
git checkout main
echo "teste" >> sentinel-smoke-test.md
git add sentinel-smoke-test.md
git commit -m "test: deve ser bloqueado"
git push origin main
# Depois de validar, limpar:
git reset --hard HEAD~1
rm -f sentinel-smoke-test.md
```

Resultado esperado:

```text
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Required status check "..." is expected.
To github.com:adm01-debug/promo-gifts-v4.git
 ! [remote rejected] main -> main (protected branch hook declined)
```

Se aparecer essa mensagem: **funcionando.** 🎉

Se o push passar (porque seu usuário está no bypass list em modo `Always`), o
sentinel ainda vai disparar e registrar o uso do bypass no run — defesa em
profundidade.

## Desligar (em caso de necessidade)

Mesma página, clique no ruleset → **Disable** (não delete — desligar mantém a
config para reativação rápida).

## Referências

- [GitHub Docs — About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Docs — Bypass list](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository#granting-bypass-permissions-for-a-ruleset)

## SSOT multi-ruleset (`.github/required-checks.json`)

A lista canônica de required checks suporta **múltiplos rulesets** — cada um
aplica seu próprio conjunto de checks a uma ou mais branches:

```jsonc
{
  "rulesets": [
    { "id": "main",    "branches":       ["main"],      "required_checks": [ ... ] },
    { "id": "release", "branchPatterns": ["release/*"], "required_checks": [ ... ] }
  ]
}
```

- `branches` — match exato de nomes.
- `branchPatterns` — globs simples (`*` ≠ `/`, `**` = qualquer coisa) expandidos
  em runtime via `GET /repos/{repo}/branches`.
- O mesmo check pode aparecer em vários rulesets — a validação deduplica.

O `required-checks-guard.yml` (gate E56):
1. **Falha o CI** se algum `name`/`workflow` declarado no SSOT não bater com um
   job real (drift estrutural).
2. **Avisa (não bloqueia)** quando o Branch Protection de qualquer branch
   resolvida pelo ruleset não inclui um check declarado — requer `GH_TOKEN`
   com `administration:read`.

> **Importante:** o GitHub aplica required checks **por branch/ruleset na UI**.
> O SSOT só descreve a intenção; após editar o JSON, ainda é preciso marcar
> os checks no ruleset correspondente em
> `Settings → Branches → <ruleset>`.
