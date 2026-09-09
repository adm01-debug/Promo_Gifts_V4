#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const PRODUCTION_SOURCE_ROOTS = ['api', 'src', 'supabase/functions'];
const ALLOWED_PPTX_IMPORT = 'src/lib/bi/pptxGenerator.ts';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolutePath)));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolutePath);
  }
  return files;
}

export async function auditPptxImageParserExposure(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const violations = [];
  const packagePath = path.join(resolvedRoot, 'node_modules', 'pptxgenjs', 'package.json');

  let pptxPackage;
  try {
    pptxPackage = JSON.parse(await readFile(packagePath, 'utf8'));
  } catch (error) {
    return [`pptxgenjs package metadata is missing or invalid: ${error.message}`];
  }

  if (pptxPackage.browser?.['image-size'] !== false) {
    violations.push('pptxgenjs must disable image-size in its browser mapping');
  }

  const sourceFiles = [];
  for (const sourceRoot of PRODUCTION_SOURCE_ROOTS) {
    try {
      sourceFiles.push(...(await walk(path.join(resolvedRoot, sourceRoot))));
    } catch (error) {
      if (error?.code !== 'ENOENT' || sourceRoot === 'src') {
        return [...violations, `${sourceRoot} tree is missing or unreadable: ${error.message}`];
      }
    }
  }

  for (const file of sourceFiles) {
    const relativePath = path.relative(resolvedRoot, file).split(path.sep).join('/');
    const source = await readFile(file, 'utf8');
    const referencesImageSize = /['"`]image-size(?:\/[^'"`]*)?['"`]/.test(source);
    if (referencesImageSize) {
      violations.push(`${relativePath}: direct image-size import is forbidden`);
    }

    const referencesPptx = /['"`]pptxgenjs['"`]/.test(source);
    if (referencesPptx && relativePath !== ALLOWED_PPTX_IMPORT) {
      violations.push(
        `${relativePath}: pptxgenjs import is outside the reviewed browser-only adapter`,
      );
    }
  }

  const adapterPath = path.join(resolvedRoot, ALLOWED_PPTX_IMPORT);
  let adapterSource;
  try {
    adapterSource = await readFile(adapterPath, 'utf8');
  } catch (error) {
    return [...violations, `reviewed PPTX adapter is missing or unreadable: ${error.message}`];
  }

  if (!/['"`]pptxgenjs['"`]/.test(adapterSource)) {
    violations.push(`${ALLOWED_PPTX_IMPORT}: expected pptxgenjs import is missing`);
  }
  if (/(?:\.addImage|\[['"]addImage['"]\])\s*\(/.test(adapterSource)) {
    violations.push(
      `${ALLOWED_PPTX_IMPORT}: image embedding is blocked while image-size is unpatched`,
    );
  }

  return violations;
}

async function main() {
  const rootArgument = process.argv.find((argument) => argument.startsWith('--root='));
  const root = rootArgument?.slice('--root='.length) || process.cwd();
  const violations = await auditPptxImageParserExposure(root);

  if (violations.length > 0) {
    console.error('[pptx-image-parser] Vulnerable image parser exposure detected:');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log('[pptx-image-parser] OK: image-size remains unreachable from production source.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
