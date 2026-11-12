import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`git falhou (${result.status}): ${result.stderr.trim()}`);
  return result.stdout;
}

export function selectFiles(cwd, target = 'HEAD') {
  if (target !== 'HEAD' && !/^[a-f\d]{7,40}$/i.test(target)) throw new Error('SHA alvo invalido.');
  const head = git(['rev-parse', 'HEAD'], cwd).trim();
  const sha = git(['rev-parse', '--verify', `${target}^{commit}`], cwd).trim();
  if (head !== sha) throw new Error('O SHA alvo deve ser o commit atualmente em checkout.');
  return git(
    ['diff', '--name-only', '-z', '--diff-filter=ACMR', `${sha}^`, sha, '--', '*.ts', '*.tsx'],
    cwd,
  )
    .split('\0')
    .filter((file) => /^(src|tests|e2e)\/[\s\S]+\.tsx?$/.test(file));
}

export function fixAndCheck(cwd, files) {
  if (
    !Array.isArray(files) ||
    files.some(
      (file) =>
        typeof file !== 'string' ||
        !/^(src|tests|e2e)\/[\s\S]+\.tsx?$/.test(file) ||
        file.split('/').includes('..'),
    )
  ) {
    throw new Error('Lista de arquivos fora do escopo autorizado.');
  }
  if (files.length === 0) return;
  const executable = path.join(cwd, 'node_modules/eslint/bin/eslint.js');
  for (const fixing of [true, false]) {
    const args = [executable, ...(fixing ? ['--fix'] : ['--max-warnings', '0']), '--no-warn-ignored', '--', ...files];
    const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    // Codigo 1 durante o fix pode representar erro ainda nao corrigivel. A
    // segunda chamada sempre verifica o resultado e bloqueia qualquer resto.
    if (result.status !== 0 && !(fixing && result.status === 1)) {
      throw new Error(
        `ESLint ${fixing ? 'fix' : 'pos-fix'} falhou (${result.status ?? result.signal}).`,
      );
    }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const filePath = process.env.AUTOHEAL_FILES_PATH;
    if (!filePath) throw new Error('AUTOHEAL_FILES_PATH obrigatorio.');
    if (process.argv[2] === 'select') {
      const files = selectFiles(process.cwd(), process.env.TARGET_SHA || 'HEAD');
      writeFileSync(filePath, JSON.stringify(files));
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `has_ts_files=${files.length > 0}\ncount=${files.length}\n`,
      );
    } else if (process.argv[2] === 'fix') {
      fixAndCheck(process.cwd(), JSON.parse(readFileSync(filePath, 'utf8')));
    } else {
      throw new Error('Use select ou fix.');
    }
  } catch (error) {
    console.error(`ERRO no autoheal: ${error.message}`);
    process.exitCode = 1;
  }
}
