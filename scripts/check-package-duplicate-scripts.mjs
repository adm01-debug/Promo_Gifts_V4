#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_JSON = resolve(ROOT, "package.json");

export function skipString(text, i) {
  const quote = text[i];
  i++;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text[i] === quote) return i + 1;
    i++;
  }
  throw new Error("String não terminada");
}

export function skipWhitespace(text, i) {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

export function findObjectStartByKey(text, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*{`, "g");
  const m = pattern.exec(text);
  if (!m) return -1;
  return m.index + m[0].lastIndexOf("{");
}

export function readPropertyName(text, i) {
  if (text[i] !== '"') return null;
  const start = i + 1;
  i = skipString(text, i);
  const raw = text.slice(start, i - 1);
  return { key: raw, next: i };
}

export function findDuplicateKeysInObject(text, objStartIndex) {
  const seen = new Map();
  const duplicates = [];
  let i = objStartIndex + 1;
  let depth = 1;

  while (i < text.length && depth > 0) {
    i = skipWhitespace(text, i);
    const ch = text[i];

    if (ch === '"') {
      const prop = readPropertyName(text, i);
      if (!prop) {
        i++;
        continue;
      }
      const keyLine = text.slice(0, i).split("\n").length;
      i = skipWhitespace(text, prop.next);

      if (text[i] === ":" && depth === 1) {
        if (seen.has(prop.key)) {
          duplicates.push({ key: prop.key, firstLine: seen.get(prop.key), duplicateLine: keyLine });
        } else {
          seen.set(prop.key, keyLine);
        }
      }

      // `readPropertyName()` já avançou além da string atual.
      // Voltar para a aspa de fechamento faz o parser reler o token e
      // pode desalinhar o cursor dentro dos valores.
      i = prop.next;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;
    i++;
  }

  return duplicates;
}

export function checkPackageDuplicateScriptsFromSource(src) {
  const scriptsStart = findObjectStartByKey(src, "scripts");
  if (scriptsStart === -1) {
    return { code: 2, duplicates: [], hasScriptsObject: false };
  }

  const duplicates = findDuplicateKeysInObject(src, scriptsStart);
  return { code: duplicates.length === 0 ? 0 : 1, duplicates, hasScriptsObject: true };
}

export function checkPackageDuplicateScriptsFromFile(packageJsonPath = PACKAGE_JSON) {
  const src = readFileSync(packageJsonPath, "utf8");
  return checkPackageDuplicateScriptsFromSource(src);
}

export function runCli(packageJsonPath = PACKAGE_JSON) {
  const result = checkPackageDuplicateScriptsFromFile(packageJsonPath);

  if (!result.hasScriptsObject) {
    console.error("❌ package.json sem objeto scripts.");
    return result.code;
  }

  if (result.duplicates.length === 0) {
    console.log("✅ Nenhuma chave duplicada em package.json > scripts.");
    return result.code;
  }

  console.error("❌ Chaves duplicadas detectadas em package.json > scripts:\n");
  for (const d of result.duplicates) {
    console.error(`- \"${d.key}\" (primeira em L${d.firstLine}, duplicada em L${d.duplicateLine})`);
  }

  return result.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
