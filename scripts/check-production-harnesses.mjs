import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const forbiddenMarkers = [
  '/__test/',
  'ColorSwatchesHarness',
  'ConfirmDialogHarness',
  'AlertDialogHarness',
  'DialogHarness',
  'UndoToastHarness',
  'CnpjFormHarness',
  'MagazineRingHarness',
  'TabSkipHarness',
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolutePath)));
    else files.push(absolutePath);
  }
  return files;
}

export async function auditProductionHarnesses(directory = 'dist') {
  const distDir = path.resolve(directory);
  const files = await walk(distDir);
  const violations = [];
  for (const file of files) {
    const relativePath = path.relative(distDir, file);
    for (const marker of forbiddenMarkers) {
      if (relativePath.includes(marker)) {
        violations.push(`${relativePath}: filename contains ${marker}`);
      }
    }
    if (!textExtensions.has(path.extname(file))) continue;
    const contents = await readFile(file, 'utf8');
    for (const marker of forbiddenMarkers) {
      if (contents.includes(marker)) {
        violations.push(`${relativePath}: content contains ${marker}`);
      }
    }
  }
  return violations;
}

async function main() {
  const directoryArgument = process.argv.find((argument) => argument.startsWith('--directory='));
  const directory = directoryArgument?.slice('--directory='.length) || 'dist';
  let violations;
  try {
    violations = await auditProductionHarnesses(directory);
  } catch (error) {
    console.error('[production-harnesses] dist/ is missing or unreadable.', error.message);
    process.exitCode = 1;
    return;
  }

  if (violations.length > 0) {
    console.error(
      '[production-harnesses] Dev-only test harnesses leaked into the production bundle:',
    );
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log('[production-harnesses] OK: no /__test routes or harness chunks in dist/.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
