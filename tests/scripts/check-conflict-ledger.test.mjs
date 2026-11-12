// Gate 1.18 (E188) — scripts/check-conflict-ledger.mjs
//
// Regressão de um bug REAL encontrado em auditoria adversarial manual (2026-11-11):
//
// 1) INJEÇÃO DE COMANDO: o script montava o comando git com
//    `execSync(\`git ${cmd}\`)`, interpolando GITHUB_BASE_REF/GITHUB_HEAD_REF (nome de
//    branch — em PR de fork, controlado pelo autor do PR) direto numa string de shell.
//    Um branch chamado `feat;touch$IFS<arquivo>` executava `touch` de verdade durante
//    o gate (comprovado nesta sessão: o arquivo era criado). Corrigido trocando
//    execSync(string) por execFileSync('git', [...args]) — sem shell, git recebe a
//    ref como um único argumento literal.
//
// 2) FALSO-NEGATIVO (fail-open) do gate: quando o git falhava por qualquer motivo
//    (ref inexistente, fora de um repositório git, fetch incompleto), a função `git()`
//    engolia o erro e devolvia '', e o script interpretava isso como "0 commits de
//    merge semântico" e IMPRIMIA ✅ / saía 0 mesmo com --gate — inclusive fora de um
//    repo git. Corrigido: falha real do git agora é distinguida de "git correu e não
//    achou nada", e é reportada em alto (--gate: exit 1; sem --gate: warn + exit 0),
//    nunca mais tratada como "ledger não exigido".
//
// Os testes abaixo cobrem black-box (spawnSync do script real) contra repositórios
// git temporários em /tmp — nenhum dado de produção é tocado.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-conflict-ledger.mjs');
const LEDGER_PATH = 'docs/coordenacao/conflitos-semanticos.md';

const dirsToClean = [];
afterEach(() => {
  for (const dir of dirsToClean.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function g(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/**
 * Monta um repositório git temporário com:
 *  - commit inicial em `main` (com docs/coordenacao/conflitos-semanticos.md),
 *  - um `refs/remotes/origin/main` apontando pro mesmo commit (simula o que
 *    `actions/checkout` com fetch-depth:0 deixa pronto em CI, sem precisar de
 *    um remoto de verdade),
 *  - um branch local `headBranch` criado a partir desse commit (o "PR").
 * Devolve o path do repo.
 */
function makeRepo(prefix, headBranch) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirsToClean.push(dir);
  g(dir, ['init', '-q']);
  g(dir, ['config', 'user.email', 'test@example.com']);
  g(dir, ['config', 'user.name', 'Test']);
  execFileSync('mkdir', ['-p', 'docs/coordenacao'], { cwd: dir });
  execFileSync('bash', ['-c', `echo '# ledger' > docs/coordenacao/conflitos-semanticos.md && echo root > README.md`], { cwd: dir });
  g(dir, ['add', '-A']);
  g(dir, ['commit', '-q', '-m', 'chore: initial']);
  g(dir, ['branch', '-M', 'main']);
  const baseSha = g(dir, ['rev-parse', 'HEAD']).trim();
  g(dir, ['update-ref', 'refs/remotes/origin/main', baseSha]);
  if (headBranch && headBranch !== 'main') {
    g(dir, ['branch', headBranch, baseSha]);
  }
  return dir;
}

function commitOnBranch(dir, branch, { file = 'README.md', line = 'x', message }) {
  g(dir, ['checkout', '-q', branch]);
  execFileSync('bash', ['-c', `printf '%s\\n' "${line}" >> "${file}"`], { cwd: dir });
  g(dir, ['add', '-A']);
  g(dir, ['commit', '-q', '-m', message]);
}

function run(cwd, env, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

describe('check-conflict-ledger: comportamento básico (sem bug)', () => {
  it('sem GITHUB_BASE_REF/GITHUB_HEAD_REF, pula a verificação com exit 0', () => {
    const dir = makeRepo('ledger-skip-', 'feat');
    const r = run(dir, { GITHUB_BASE_REF: '', GITHUB_HEAD_REF: '' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/pulando verificação/);
  });

  it('sem commits de merge semântico, passa com exit 0', () => {
    const dir = makeRepo('ledger-nomatch-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'feat: normal' });
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Nenhum commit de merge semântico/);
  });

  it('commit merge(pr-N): sem atualizar o ledger + --gate => exit 1', () => {
    const dir = makeRepo('ledger-violation-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'merge(pr-123): resolve conflito' });
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/::error::\[E188\]/);
  });

  it('commit merge(pr-N): sem atualizar o ledger, SEM --gate => warn e exit 0', () => {
    const dir = makeRepo('ledger-violation-soft-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'merge(pr-9): resolve conflito' });
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, []);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/\[E188\]/);
  });

  it('commit merge(pr-N): COM o ledger atualizado no mesmo PR + --gate => exit 0', () => {
    const dir = makeRepo('ledger-ok-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'merge(pr-123): resolve conflito' });
    commitOnBranch(dir, 'feat', { file: LEDGER_PATH, line: 'entrada nova', message: 'docs: atualiza ledger' });
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Ledger de conflitos atualizado/);
  });
});

describe('check-conflict-ledger: BUG 1 — injeção de comando via nome de branch (CORRIGIDO)', () => {
  it('branch com metacaracteres de shell NÃO executa comando algum (prova: arquivo-alvo não é criado)', () => {
    const dir = makeRepo('ledger-injection-', null);
    const markerDir = mkdtempSync(join(tmpdir(), 'ledger-injection-marker-'));
    dirsToClean.push(markerDir);
    const marker = join(markerDir, 'PWNED');

    // Nome de branch válido para o git (ponto e vírgula e $IFS são aceitos em refs),
    // mas que seria interpretado como comando shell se a implementação antiga
    // (`execSync(\`git ${cmd}\`)`) ainda estivesse em uso.
    const maliciousRef = `feat;touch$IFS${marker}`;
    g(dir, ['branch', maliciousRef, 'main']);

    expect(existsSync(marker)).toBe(false);

    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: maliciousRef }, ['--gate']);

    // Prova central do teste: antes da correção (execSync(`git ${cmd}`) com shell),
    // este `touch` era executado de verdade e o arquivo aparecia aqui.
    expect(existsSync(marker)).toBe(false);

    // O nome é, ele mesmo, um branch git válido (git aceita ';' e '$' em refs) e
    // existe de verdade (criado acima) — então git resolve a ref literal (um único
    // argumento via execFileSync) normalmente; não há merges, então o gate passa.
    // O ponto do teste não é o exit code, é que nenhum comando foi executado.
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Nenhum commit de merge semântico/);
  });
});

describe('check-conflict-ledger: BUG 2 — falso-negativo (fail-open) quando o git falha (CORRIGIDO)', () => {
  it('GITHUB_BASE_REF apontando pra um ref inexistente: --gate falha alto, não finge "0 merges, ok"', () => {
    const dir = makeRepo('ledger-badref-base-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'feat: algo' });
    const r = run(dir, { GITHUB_BASE_REF: 'nao-existe-de-verdade', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Não foi possível calcular o diff\/log/);
  });

  it('GITHUB_HEAD_REF apontando pra um ref inexistente: sem --gate, warn (exit 0) mas com a mensagem de falha, não a de sucesso', () => {
    const dir = makeRepo('ledger-badref-head-', 'feat');
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'branch-que-nao-existe' }, []);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/Não foi possível calcular o diff\/log/);
    expect(r.stdout).not.toMatch(/Nenhum commit de merge semântico/);
  });

  it('executado fora de um repositório git: --gate falha alto (antes: exit 0 silencioso)', () => {
    const outside = mkdtempSync(join(tmpdir(), 'ledger-norepo-'));
    dirsToClean.push(outside);
    const r = run(outside, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feature' }, ['--gate']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[E188\]/);
  });
});

describe('check-conflict-ledger: casos adicionais (sem bug, documentados)', () => {
  it('pattern é case-insensitive ("Merge(PR-7):")', () => {
    const dir = makeRepo('ledger-case-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'Merge(PR-7): caixa maiúscula' });
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(1);
  });

  it('pattern não-ancorado no início do subject não casa (comportamento intencional)', () => {
    const dir = makeRepo('ledger-notanchored-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'fix: ajusta texto que cita merge(pr-9): no meio' });
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Nenhum commit de merge semântico/);
  });

  it('merge real (git merge --no-ff) é detectado mesmo sem o padrão merge(pr-N):', () => {
    const dir = makeRepo('ledger-realmerge-', 'feat');
    g(dir, ['checkout', '-q', 'feat']);
    commitOnBranch(dir, 'feat', { message: 'feat: f1' });
    g(dir, ['checkout', '-q', '-b', 'side', 'main']);
    execFileSync('bash', ['-c', 'echo s1 > other.txt'], { cwd: dir });
    g(dir, ['add', '-A']);
    g(dir, ['commit', '-q', '-m', 'feat: side']);
    g(dir, ['checkout', '-q', 'feat']);
    g(dir, ['merge', '-q', '--no-ff', '-m', 'merge branch side into feat', 'side']);

    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/merge branch side into feat/);
  });
});

describe('check-conflict-ledger: checkout de pull_request do GitHub (só origin/<branch>)', () => {
  // No CI a branch da PR não existe como ref local: só refs/remotes/origin/<branch>.
  // Antes da correção o gate falhava fechado em TODA PR ("Não foi possível calcular o diff").
  function onlyRemoteHead(prefix, message) {
    const dir = makeRepo(prefix, 'feat');
    commitOnBranch(dir, 'feat', { message });
    const sha = g(dir, ['rev-parse', 'feat']).trim();
    g(dir, ['checkout', '-q', '--detach', sha]);
    g(dir, ['update-ref', 'refs/remotes/origin/claude/feat-x', sha]);
    g(dir, ['branch', '-D', 'feat']);
    return dir;
  }

  it('resolve origin/<branch> quando a branch local não existe (sem merge semântico → exit 0)', () => {
    const dir = onlyRemoteHead('ledger-remote-ok-', 'feat: normal');
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'claude/feat-x' }, ['--gate']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/Nenhum commit de merge semântico/);
  });

  it('via origin/<branch> continua pegando merge(pr-N) sem ledger (exit 1)', () => {
    const dir = onlyRemoteHead('ledger-remote-viol-', 'merge(pr-9): resolve conflito');
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'claude/feat-x' }, ['--gate']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/::error::\[E188\]/);
  });

  it('branch inexistente local e remota continua falhando fechado', () => {
    const dir = onlyRemoteHead('ledger-remote-none-', 'feat: normal');
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'claude/nao-existe' }, ['--gate']);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/Não foi possível calcular/);
  });
});

describe('check-conflict-ledger: resolveRef — casos adversariais (revisão 12/11)', () => {
  it('branch local e origin/<branch> divergentes: o nome literal (local) vence', () => {
    const dir = makeRepo('ledger-prefer-local-', 'feat');
    commitOnBranch(dir, 'feat', { message: 'merge(pr-5): resolve conflito' });
    // origin/feat aponta para a base limpa (sem o merge semântico)
    g(dir, ['update-ref', 'refs/remotes/origin/feat', g(dir, ['rev-parse', 'main']).trim()]);
    g(dir, ['checkout', '-q', 'main']);
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'feat' }, ['--gate']);
    expect(r.status).toBe(1);
  });

  it('PR de fork cujo head_ref coincide com outra branch do repo base NÃO pode passar comparando a branch errada', () => {
    // checkout de pull_request: só refs/remotes/origin/*, HEAD = merge sintético (detached)
    const dir = makeRepo('ledger-fork-collide-', 'tmp');
    commitOnBranch(dir, 'tmp', { message: 'merge(pr-7): resolve conflito' }); // commit do fork
    const forkSha = g(dir, ['rev-parse', 'tmp']).trim();
    const baseSha = g(dir, ['rev-parse', 'main']).trim();
    g(dir, ['update-ref', 'refs/remotes/origin/release', baseSha]); // branch homônima no base
    g(dir, ['checkout', '-q', '--detach', baseSha]);
    g(dir, ['merge', '-q', '--no-ff', '-m', 'synthetic', forkSha]);
    g(dir, ['branch', '-D', 'tmp', 'main']);
    const r = run(dir, { GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: 'release' }, ['--gate']);
    // Hoje: exit 0 ("Nenhum commit de merge semântico") — compara origin/main..origin/release.
    expect(r.status).not.toBe(0);
  });
});
