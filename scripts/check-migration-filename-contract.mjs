#!/usr/bin/env node
/**
 * Protege apenas o corte forward-only de migrations novas.
 *
 * O diretório contém histórico legado com nomes não canônicos e versões
 * colidentes. A fotografia de 2026-08-26 é uma baseline explícita: arquivos
 * já presentes nela não são reinterpretados por este guard. Todo `.sql` que
 * não conste da baseline deve usar um timestamp UTC canônico e não pode
 * compartilhar a versão com nenhuma migration atual.
 *
 * Este script é local e somente leitura. Ele não chama Supabase, não executa
 * SQL e não determina se uma migration pode ser aplicada.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MIGRATIONS_RELATIVE_DIR = "supabase/migrations";
export const BASELINE_RELATIVE_PATH =
  "docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json";
export const MIGRATION_PATH_PREFIX = `${MIGRATIONS_RELATIVE_DIR}/`;
export const CANONICAL_FILENAME_RE = /^(\d{14})_([a-z0-9][a-z0-9_-]*)\.sql$/;
export const CANONICAL_FILENAME_EXAMPLE = "YYYYMMDDHHMMSS_slug.sql";

function normalizedPath(path) {
  return path.replaceAll("\\", "/");
}

function isSafeBaselineMigrationPath(path) {
  if (typeof path !== "string" || !path.startsWith(MIGRATION_PATH_PREFIX)) {
    return false;
  }

  const filename = path.slice(MIGRATION_PATH_PREFIX.length);
  return (
    filename.length > 0 &&
    filename.endsWith(".sql") &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !filename.includes("..")
  );
}

/**
 * Verifica que o prefixo representa uma data/hora UTC real, não apenas 14
 * dígitos. O ano mínimo evita a semântica especial de anos 0–99 do Date.
 */
export function isValidUtcTimestamp(timestamp) {
  if (!/^\d{14}$/.test(timestamp)) return false;

  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6));
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  const second = Number(timestamp.slice(12, 14));

  if (
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day &&
    candidate.getUTCHours() === hour &&
    candidate.getUTCMinutes() === minute &&
    candidate.getUTCSeconds() === second
  );
}

export function parseCanonicalMigrationFilename(filename) {
  const match = CANONICAL_FILENAME_RE.exec(filename);
  if (!match) return null;

  const [, version, slug] = match;
  if (!isValidUtcTimestamp(version)) return null;

  return { filename, version, slug };
}

/**
 * Extrai uma versão válida mesmo de um nome legado que não é canônico. Isto
 * impede que uma migration nova reutilize o timestamp de um arquivo antigo
 * com slug maiúsculo, espaço ou outro desvio histórico.
 */
export function extractValidTimestampPrefix(filename) {
  const match = /^(\d{14})_/.exec(filename);
  return match && isValidUtcTimestamp(match[1]) ? match[1] : null;
}

export function filenameViolation(filename) {
  const shape = /^(\d{14})_(.+)\.sql$/.exec(filename);
  if (shape && !isValidUtcTimestamp(shape[1])) {
    return "timestamp_utc_invalido";
  }
  return "nome_fora_do_padrao";
}

export function readLegacyBaseline(baselinePath) {
  let document;
  try {
    document = JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Não foi possível ler a baseline de migrations em ${normalizedPath(baselinePath)}: ${error.message}`,
    );
  }

  if (document?.schema_version !== 2) {
    throw new Error("Baseline de migrations inválida: schema_version 2 é obrigatório.");
  }
  if (!Array.isArray(document.entries) || document.entries.length === 0) {
    throw new Error("Baseline de migrations inválida: entries não contém migrations.");
  }
  if (document.file_count !== document.entries.length) {
    throw new Error(
      `Baseline de migrations inválida: file_count=${document.file_count} difere de entries=${document.entries.length}.`,
    );
  }

  const paths = new Set();
  for (const entry of document.entries) {
    const path = entry?.path;
    if (!isSafeBaselineMigrationPath(path)) {
      throw new Error(`Baseline de migrations inválida: path inseguro ou fora do diretório: ${String(path)}.`);
    }
    if (paths.has(path)) {
      throw new Error(`Baseline de migrations inválida: path duplicado: ${path}.`);
    }
    paths.add(path);
  }

  return {
    paths,
    sourceCommit: document.source_commit ?? null,
    sourceMigrationsTree: document.source_migrations_tree ?? null,
  };
}

export function readMigrationFiles(migrationsDir) {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Diretório de migrations não encontrado: ${normalizedPath(migrationsDir)}.`);
  }

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => ({
      filename: entry.name,
      path: `${MIGRATION_PATH_PREFIX}${entry.name}`,
    }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
}

/**
 * Audita o diretório atual contra a fotografia explícita do legado.
 *
 * Uma colisão só é tolerada quando todos os participantes já pertencem à
 * baseline. Assim, uma migration nova jamais herda silenciosamente uma
 * colisão antiga.
 */
export function auditMigrationFilenameContract({
  migrationsDir = resolve(ROOT, MIGRATIONS_RELATIVE_DIR),
  baselinePath = resolve(ROOT, BASELINE_RELATIVE_PATH),
} = {}) {
  let baseline;
  let files;

  try {
    baseline = readLegacyBaseline(baselinePath);
    files = readMigrationFiles(migrationsDir);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "baseline_or_directory_invalid",
          message: error.message,
        },
      ],
      files: [],
      newFiles: [],
      baseline: null,
    };
  }

  const currentPaths = new Set(files.map((file) => file.path));
  const baselineMissing = [...baseline.paths]
    .filter((path) => !currentPaths.has(path))
    .sort((left, right) => left.localeCompare(right, "en"));
  const newFiles = files.filter((file) => !baseline.paths.has(file.path));
  const errors = [];

  for (const path of baselineMissing) {
    errors.push({
      code: "baseline_file_missing",
      path,
      message: "Arquivo histórico da baseline ausente; rename/delete de migration exige revisão explícita.",
    });
  }

  const versionedFiles = [];
  for (const file of files) {
    const parsed = parseCanonicalMigrationFilename(file.filename);
    const isNew = !baseline.paths.has(file.path);

    if (!parsed) {
      if (isNew) {
        errors.push({
          code: "invalid_new_filename",
          path: file.path,
          filename: file.filename,
          violation: filenameViolation(file.filename),
          message: `Migration nova deve usar ${CANONICAL_FILENAME_EXAMPLE} com timestamp UTC válido e slug minúsculo.`,
        });
      }
    } else {
      versionedFiles.push({ ...file, ...parsed, isNew });
      continue;
    }

    const legacyVersion = extractValidTimestampPrefix(file.filename);
    if (legacyVersion) {
      versionedFiles.push({ ...file, version: legacyVersion, isNew });
    }
  }

  const byVersion = new Map();
  for (const file of versionedFiles) {
    const group = byVersion.get(file.version) ?? [];
    group.push(file);
    byVersion.set(file.version, group);
  }

  const legacyCollisionVersions = [];
  for (const [version, group] of [...byVersion.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    if (group.length < 2) continue;

    const paths = group.map((file) => file.path).sort((left, right) => left.localeCompare(right, "en"));
    const newPaths = group
      .filter((file) => file.isNew)
      .map((file) => file.path)
      .sort((left, right) => left.localeCompare(right, "en"));

    if (newPaths.length === 0) {
      legacyCollisionVersions.push(version);
      continue;
    }

    errors.push({
      code: "new_version_collision",
      version,
      paths,
      newPaths,
      message: "Uma migration nova não pode reutilizar uma versão/timestamp existente ou de outra migration nova.",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    files,
    newFiles: newFiles.map((file) => file.path),
    baseline: {
      fileCount: baseline.paths.size,
      sourceCommit: baseline.sourceCommit,
      sourceMigrationsTree: baseline.sourceMigrationsTree,
    },
    legacyCollisionVersions,
  };
}

export function formatMigrationFilenameContractReport(result) {
  if (result.ok) {
    return [
      "✅ Contrato de nomes/versões de migrations novas aprovado.",
      `   baseline: ${result.baseline.fileCount} arquivos; novas: ${result.newFiles.length}; colisões legadas preservadas: ${result.legacyCollisionVersions.length}.`,
    ].join("\n");
  }

  const lines = [
    `❌ Contrato de nomes/versões de migrations falhou (${result.errors.length} ocorrência(s)).`,
  ];

  for (const error of result.errors) {
    if (error.code === "baseline_or_directory_invalid") {
      lines.push(`- baseline/diretório inválido: ${error.message}`);
    } else if (error.code === "baseline_file_missing") {
      lines.push(`- histórico ausente: ${error.path}`);
    } else if (error.code === "invalid_new_filename") {
      lines.push(`- nome inválido (${error.violation}): ${error.path}`);
    } else if (error.code === "new_version_collision") {
      lines.push(`- versão ${error.version} colide: ${error.paths.join(", ")}`);
    }
  }

  return lines.join("\n");
}

export function parseCliOptions(argv = process.argv.slice(2)) {
  let root = ROOT;
  let baselineArgument = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--root" || argument === "--baseline") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} exige um caminho.`);
      }
      if (argument === "--root") root = resolve(value);
      else baselineArgument = value;
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      return { help: true };
    }
    throw new Error(`Opção desconhecida: ${argument}.`);
  }

  return {
    help: false,
    json,
    migrationsDir: resolve(root, MIGRATIONS_RELATIVE_DIR),
    baselinePath: baselineArgument
      ? resolve(root, baselineArgument)
      : resolve(root, BASELINE_RELATIVE_PATH),
  };
}

export function printUsage() {
  console.log(`Uso: node scripts/check-migration-filename-contract.mjs [opções]

Opções:
  --root <diretório>    raiz do repositório (padrão: raiz atual do script)
  --baseline <arquivo>  baseline relativa a --root (padrão: manifesto de 2026-08-26)
  --json                emite o resultado estruturado
  --help, -h            mostra esta ajuda`);
}

export function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCliOptions(argv);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    printUsage();
    return 2;
  }

  if (options.help) {
    printUsage();
    return 0;
  }

  const result = auditMigrationFilenameContract(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else console.log(formatMigrationFilenameContractReport(result));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runCli();
}
