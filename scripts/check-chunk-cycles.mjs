#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const STATIC_IMPORT_RE =
  /(?:\bimport\s*(?:[^"'()]*?\sfrom\s*)?|\bexport\s+[^"']*?\sfrom\s*)["']\.\/([^"']+\.js)["']/g;

async function readChunkGraph(directory) {
  const root = path.resolve(directory);
  const entries = await readdir(root, { withFileTypes: true });
  const chunks = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
  const names = new Set(chunks.map((entry) => entry.name));
  const graph = new Map();

  for (const chunk of chunks) {
    const source = await readFile(path.join(root, chunk.name), 'utf8');
    const dependencies = new Set();
    for (const match of source.matchAll(STATIC_IMPORT_RE)) {
      const dependency = path.basename(match[1]);
      if (names.has(dependency)) dependencies.add(dependency);
    }
    graph.set(chunk.name, dependencies);
  }

  return graph;
}

function findStronglyConnectedComponents(graph) {
  let nextIndex = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const lowLinks = new Map();
  const cycles = [];

  function visit(node) {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const dependency of graph.get(node) ?? []) {
      if (!indices.has(dependency)) {
        visit(dependency);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(dependency)));
      } else if (onStack.has(dependency)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(dependency)));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) return;

    const component = [];
    while (stack.length > 0) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1) cycles.push(component.sort());
  }

  for (const node of graph.keys()) {
    if (!indices.has(node)) visit(node);
  }

  return cycles.sort((left, right) => right.length - left.length);
}

export async function auditChunkCycles(directory = 'dist/assets') {
  return findStronglyConnectedComponents(await readChunkGraph(directory));
}

async function main() {
  const directoryArgument = process.argv.find((argument) => argument.startsWith('--directory='));
  const directory = directoryArgument?.slice('--directory='.length) || 'dist/assets';

  try {
    const cycles = await auditChunkCycles(directory);
    if (cycles.length === 0) {
      console.log('[chunk-cycles] OK: no static import cycles between production chunks.');
      return;
    }

    console.error(`[chunk-cycles] Found ${cycles.length} static import cycle(s):`);
    for (const cycle of cycles) console.error(`- ${cycle.join(' <-> ')}`);
    process.exitCode = 1;
  } catch (error) {
    console.error('[chunk-cycles] dist/assets is missing or unreadable.', error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
