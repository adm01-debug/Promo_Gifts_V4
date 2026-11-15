#!/usr/bin/env node
/**
 * verify-build-integrity.mjs
 *
 * Validação real de integridade JSX: roda `vite build` em modo silencioso.
 * O parser do esbuild/SWC é o único validador 100% confiável de tags JSX
 * pareadas (incluindo `<motion.*>` que devem fechar como `</motion.*>`).
 *
 * Heurísticas regex (contar `<motion.div` vs `</motion.div>`) produzem
 * falsos positivos massivos por causa de `</div>` filhos legítimos
 * aninhados — não use.
 *
 * Exit codes:
 *   0  → build OK, integridade JSX verificada
 *   1  → build falhou (sintaxe JSX, import quebrado, etc.)
 */
import { spawn } from 'node:child_process';

console.log('🔎 [integrity] Rodando vite build para validar JSX...');
const child = spawn('npx', ['vite', 'build', '--logLevel', 'error'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
  detached: true,
});

// spawnSync bloqueava o main thread: SIGINT/SIGTERM matavam só o processo pai
// (default do sinal) e `npx`/`npm exec`/`vite`/workers do esbuild ficavam
// órfãos, continuando a rodar em background. Repassa o sinal para todo o
// grupo de processos do filho (detached: true o torna líder de grupo).
const forwardSignal = (signal) => {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // grupo já encerrado
  }
};
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('error', (err) => {
  console.error(`\n❌ [integrity] Não foi possível iniciar o build (${err.message}).`);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error('\n❌ [integrity] Build falhou — provavelmente há tag JSX/motion mal fechada.');
    process.exit(1);
  }
  console.log('\n✅ [integrity] Build OK — todas as tags JSX/motion estão sintaticamente corretas.');
  process.exit(0);
});
