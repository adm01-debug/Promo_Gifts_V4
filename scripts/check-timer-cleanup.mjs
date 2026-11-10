#!/usr/bin/env node
/**
 * check-timer-cleanup.mjs — E134
 * Detecta setTimeout chamado DIRETAMENTE no corpo de useEffect sem clearTimeout
 * correspondente no mesmo bloco (memory leak em componentes desmontados).
 *
 * Padrão perigoso:
 *   useEffect(() => {
 *     setTimeout(fn, delay);   // <-- sem clearTimeout no return
 *   }, [deps]);
 *
 * Padrão seguro (não reportado):
 *   useEffect(() => {
 *     const tid = setTimeout(fn, delay);
 *     return () => clearTimeout(tid);
 *   }, [deps]);
 *
 * Falsos negativos aceitáveis (propositais):
 *   - setTimeout dentro de event handlers aninhados (onClick, rAF callbacks)
 *   - setTimeout em async functions / Promises encadeadas
 *   - setTimeout em hooks com ref-tracking (voiceTimersRef pattern)
 *   - setTimeout com `await new Promise(r => setTimeout(r, n))` — delay utilitário
 *
 * Exit 0 = nenhum problema encontrado
 * Exit 1 = problemas encontrados (lista no stdout)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Recursivamente lista arquivos .ts/.tsx excluindo node_modules e __tests__ */
function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkFiles(full);
    } else if (EXTENSIONS.has(extname(entry))) {
      yield full;
    }
  }
}

/**
 * Extrai blocos de useEffect de um arquivo.
 * Retorna array de strings (conteúdo de cada useEffect callback).
 */
function extractUseEffectBodies(src) {
  const bodies = [];
  let idx = 0;

  while (idx < src.length) {
    // Encontra useEffect(
    const match = src.indexOf('useEffect(', idx);
    if (match === -1) break;

    // Avança para o início do callback
    let i = match + 'useEffect('.length;
    // Pula espaços até encontrar '=>' ou 'function'
    // O callback começa com '(' ou diretamente com 'async'
    if (i >= src.length) break;

    // Extrai o corpo bruto do useEffect (do '(' de abertura ao ')' de fechamento)
    let depth = 1; // já estamos dentro do useEffect(
    let body = '';
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
      body += ch;
      i++;
    }

    bodies.push({ body, start: match });
    idx = i + 1;
  }

  return bodies;
}

/**
 * Verifica se um bloco de useEffect tem setTimeout direto no corpo principal
 * (não aninhado em outro callback) sem clearTimeout.
 *
 * "Direto no corpo" = não dentro de:
 *   - function declarations/expressions
 *   - arrow functions (exceto a própria callback do useEffect)
 *   - class methods
 */
function hasUnsafeDirectTimeout(body) {
  // Se já tem clearTimeout em qualquer lugar do body, provavelmente está seguro
  if (body.includes('clearTimeout')) return false;

  // Se não tem setTimeout, não há problema
  if (!body.includes('setTimeout')) return false;

  // Tenta detectar se setTimeout está em nivel direto do callback.
  // Heurística: conta a profundidade de {} e () antes de encontrar setTimeout.
  // Um setTimeout "direto" está na profundidade de função base (depth=1 do callback).
  //
  // Ignoramos padrões como:
  //   new Promise((r) => setTimeout(r, n))  — delay utilitário
  //   const fn = () => { setTimeout(...) }  — nested arrow
  //   async function () { ... setTimeout ... }  — async context
  //   handler = () => { setTimeout... }  — event handler nested

  // Simplificação: remove strings, comentários e padrões conhecidos seguros
  let cleaned = body
    // Remove template literals
    .replace(/`[^`]*`/gs, '""')
    // Remove strings
    .replace(/"([^"\\]|\\.)*"/g, '""')
    .replace(/'([^'\\]|\\.)*'/g, "''")
    // Remove comentários de linha
    .replace(/\/\/[^\n]*/g, '')
    // Remove comentários de bloco
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Padrões seguros — setTimeout como argumento de Promise ou similar:
  // `new Promise((r) => setTimeout(r,` ou `await new Promise(r => setTimeout`
  const safePromisePattern = /new\s+Promise\s*\([^)]*setTimeout/;
  if (safePromisePattern.test(cleaned)) {
    // Remove esse padrão para não reportar falso positivo
    cleaned = cleaned.replace(/new\s+Promise[\s\S]*?setTimeout[\s\S]*?\)/g, '');
    if (!cleaned.includes('setTimeout')) return false;
  }

  // Detecta setTimeout dentro de funções aninhadas (arrow ou function keyword)
  // Para cada setTimeout, verifica se está dentro de uma arrow/function aninhada
  let pos = 0;
  // Track arrow function depth relative to the main callback
  // Se encontramos `=>` ou `function` antes do setTimeout, ele está aninhado

  // Abordagem mais simples: remove todos os blocos de arrow functions e funções aninhadas
  // exceto o primeiro nível do callback

  // Encontra o primeiro '{' que abre o corpo do callback
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return false;

  const callbackBody = cleaned.slice(firstBrace + 1);

  // Remove blocos de funções aninhadas mantendo apenas o nível 1
  let depth = 0;
  let topLevel = '';
  let inNestedFn = false;
  let fnDepth = 0;

  for (let i = 0; i < callbackBody.length; i++) {
    const ch = callbackBody[i];

    // Detecta início de função aninhada (arrow => { ou function {)
    if (!inNestedFn && depth === 0) {
      // Verifica se estamos entrando em arrow function ou function keyword
      const ahead = callbackBody.slice(Math.max(0, i - 20), i + 5);
      if (ch === '{') {
        // Check if preceded by =>
        const before = callbackBody.slice(Math.max(0, i - 30), i).trim();
        if (before.endsWith('=>') || /function\s*\w*\s*\([^)]*\)\s*$/.test(before)) {
          inNestedFn = true;
          fnDepth = 1;
          continue;
        }
      }
    }

    if (inNestedFn) {
      if (ch === '{') fnDepth++;
      else if (ch === '}') {
        fnDepth--;
        if (fnDepth === 0) {
          inNestedFn = false;
        }
      }
      continue; // skip nested function content
    }

    if (ch === '{') depth++;
    else if (ch === '}') depth--;

    topLevel += ch;
  }

  // Agora verifica se setTimeout está no topLevel (direto no callback)
  return topLevel.includes('setTimeout');
}

const issues = [];

for (const file of walkFiles(SRC)) {
  // Ignora arquivos de teste
  if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
    continue;
  }

  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (!src.includes('useEffect') || !src.includes('setTimeout')) continue;
  if (src.includes('clearTimeout')) continue; // arquivo já tem clearTimeout em algum lugar

  const blocks = extractUseEffectBodies(src);
  for (const { body, start } of blocks) {
    if (hasUnsafeDirectTimeout(body)) {
      // Calcula número de linha
      const line = src.slice(0, start).split('\n').length;
      const rel = file.replace(ROOT + '/', '');
      issues.push(`${rel}:${line}: setTimeout direto em useEffect sem clearTimeout`);
    }
  }
}

if (issues.length === 0) {
  console.log('✓ check-timer-cleanup: nenhum setTimeout sem clearTimeout em useEffect');
  process.exit(0);
} else {
  console.error(`✗ check-timer-cleanup: ${issues.length} problema(s) encontrado(s):`);
  for (const issue of issues) {
    console.error(`  ${issue}`);
  }
  process.exit(1);
}
