const deliveryUnit = 'src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx';

export function isE2ERuntimeFile(file) {
  if (file === deliveryUnit) return true;

  const isSrcUnit =
    file.startsWith('src/') &&
    (file.includes('/__tests__/') || /\.(?:test|spec)\.[^/]+$/.test(file));
  if (isSrcUnit) return false;

  return (
    file.startsWith('src/') ||
    file.startsWith('e2e/') ||
    file.startsWith('tests/') ||
    file.startsWith('public/') ||
    file.startsWith('.github/actions/e2e-setup/') ||
    ['package.json', 'package-lock.json', '.nvmrc'].includes(file) ||
    /^(?:playwright|vite)\.config\./.test(file)
  );
}

export function hasE2ERuntimeChanges(files) {
  return files.some(isE2ERuntimeFile);
}

const files = JSON.parse(process.env.CHANGED_FILES || '[]');
process.stdout.write(`relevant=${hasE2ERuntimeChanges(files)}\n`);
