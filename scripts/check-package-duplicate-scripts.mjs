#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_JSON = resolve(ROOT, process.argv[2] ?? "package.json");

const src = readFileSync(PACKAGE_JSON, "utf8");

function skipString(text, i) {
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

function skipWhitespace(text, i) {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function findObjectStartByKey(text, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*{`, "g");
  const m = pattern.exec(text);
  if (!m) return -1;
  return m.index + m[0].lastIndexOf("{");
}

function readPropertyName(text, i) {
  if (text[i] !== '"') return null;
  const start = i + 1;
  i = skipString(text, i);
  const raw = text.slice(start, i - 1);
  return { key: raw, next: i };
}

function skipLiteral(text, i) {
  while (i < text.length && /[^,\]\}\s]/.test(text[i])) i++;
  return i;
}

function skipArray(text, i) {
  i++;
  while (i < text.length) {
    i = skipWhitespace(text, i);
    if (text[i] === "]") return i + 1;
    i = skipValue(text, i);
    i = skipWhitespace(text, i);
    if (text[i] === ",") i++;
  }
  throw new Error("Array não terminada");
}

function skipObject(text, i) {
  i++;
  while (i < text.length) {
    i = skipWhitespace(text, i);
    if (text[i] === "}") return i + 1;

    const prop = readPropertyName(text, i);
    if (!prop) throw new Error("Chave JSON inválida");

    i = skipWhitespace(text, prop.next);
    if (text[i] !== ":") throw new Error("Objeto JSON inválido");

    i = skipWhitespace(text, i + 1);
    i = skipValue(text, i);
    i = skipWhitespace(text, i);

    if (text[i] === ",") i++;
  }
  throw new Error("Objeto não terminado");
}

function skipValue(text, i) {
  const ch = text[i];
  if (ch === '"') return skipString(text, i);
  if (ch === "{") return skipObject(text, i);
  if (ch === "[") return skipArray(text, i);
  return skipLiteral(text, i);
}

function findDuplicateKeysInObject(text, objStartIndex) {
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

      i = skipWhitespace(text, i + 1);
      i = skipValue(text, i);
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;
    i++;
  }

  return duplicates;
}

const scriptsStart = findObjectStartByKey(src, "scripts");
if (scriptsStart === -1) {
  console.error("❌ package.json sem objeto scripts.");
  process.exit(2);
}

const duplicates = findDuplicateKeysInObject(src, scriptsStart);

if (duplicates.length === 0) {
  console.log("✅ Nenhuma chave duplicada em package.json > scripts.");
  process.exit(0);
}

console.error("❌ Chaves duplicadas detectadas em package.json > scripts:\n");
for (const d of duplicates) {
  console.error(`- \"${d.key}\" (primeira em L${d.firstLine}, duplicada em L${d.duplicateLine})`);
}
process.exit(1);
