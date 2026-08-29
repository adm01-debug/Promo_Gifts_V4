import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  auditMigrationFilenameContract,
  extractValidTimestampPrefix,
  isValidUtcTimestamp,
  parseCanonicalMigrationFilename,
} from "../../scripts/check-migration-filename-contract.mjs";

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createFixture({
  baselineNames = ["001_legacy_baseline.sql"],
  newNames = [],
  omitBaselineNames = [],
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "promo-gifts-migration-filename-contract-"));
  temporaryRoots.push(root);

  const migrationsDir = join(root, "supabase", "migrations");
  const docsDir = join(root, "docs");
  mkdirSync(migrationsDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });

  const omitted = new Set(omitBaselineNames);
  for (const filename of [...baselineNames, ...newNames]) {
    if (!omitted.has(filename)) {
      writeFileSync(join(migrationsDir, filename), "-- fixture\n", "utf8");
    }
  }

  const entries = baselineNames.map((filename) => ({
    path: `supabase/migrations/${filename}`,
  }));
  const baselinePath = join(docsDir, "manifest.json");
  writeFileSync(
    baselinePath,
    JSON.stringify({ schema_version: 2, file_count: entries.length, entries }),
    "utf8",
  );

  return { migrationsDir, baselinePath };
}

function auditFixture(options) {
  return auditMigrationFilenameContract(createFixture(options));
}

describe("check-migration-filename-contract", () => {
  it("mantém o legado explicitamente baselined, inclusive nomes e colisões históricas", () => {
    const result = auditFixture({
      baselineNames: [
        "001_notification_system.sql",
        "20260801010101_legacy_a.sql",
        "20260801010101_legacy_b.sql",
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.newFiles).toEqual([]);
    expect(result.legacyCollisionVersions).toEqual(["20260801010101"]);
  });

  it("aceita migration nova com timestamp UTC válido e versão ainda única", () => {
    const result = auditFixture({
      baselineNames: ["001_notification_system.sql", "20260801010101_existing.sql"],
      newNames: ["20260826010203_add_catalog_contract.sql"],
    });

    expect(result.ok).toBe(true);
    expect(result.newFiles).toEqual([
      "supabase/migrations/20260826010203_add_catalog_contract.sql",
    ]);
  });

  it.each([
    "add_catalog_contract.sql",
    "20260826_add_catalog_contract.sql",
    "20261301010203_add_catalog_contract.sql",
    "20260826010203_Add_catalog_contract.sql",
    "20260826010203_.sql",
  ])("bloqueia novo nome inválido: %s", (filename) => {
    const result = auditFixture({ newNames: [filename] });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_new_filename",
          path: `supabase/migrations/${filename}`,
        }),
      ]),
    );
  });

  it("bloqueia uma migration nova que reutiliza versão de arquivo legado", () => {
    const result = auditFixture({
      baselineNames: ["20260826010203_existing.sql"],
      newNames: ["20260826010203_second_change.sql"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual({
      code: "new_version_collision",
      version: "20260826010203",
      paths: [
        "supabase/migrations/20260826010203_existing.sql",
        "supabase/migrations/20260826010203_second_change.sql",
      ],
      newPaths: ["supabase/migrations/20260826010203_second_change.sql"],
      message: expect.any(String),
    });
  });

  it("bloqueia versão nova que reutiliza timestamp de legado com slug não canônico", () => {
    const result = auditFixture({
      baselineNames: ["20260826010203_Legacy_slug.sql"],
      newNames: ["20260826010203_valid_slug.sql"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "new_version_collision",
        version: "20260826010203",
        newPaths: ["supabase/migrations/20260826010203_valid_slug.sql"],
      }),
    );
  });

  it("não mascara colisão entre duas migrations novas", () => {
    const result = auditFixture({
      newNames: [
        "20260826010203_first_change.sql",
        "20260826010203_second_change.sql",
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "new_version_collision",
        version: "20260826010203",
        newPaths: [
          "supabase/migrations/20260826010203_first_change.sql",
          "supabase/migrations/20260826010203_second_change.sql",
        ],
      }),
    );
  });

  it("bloqueia remoção ou rename de arquivo que pertence à baseline", () => {
    const result = auditFixture({
      baselineNames: ["001_notification_system.sql"],
      omitBaselineNames: ["001_notification_system.sql"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "baseline_file_missing",
        path: "supabase/migrations/001_notification_system.sql",
      }),
    );
  });

  it("expõe parsing estrito para datas UTC reais", () => {
    expect(isValidUtcTimestamp("20260229010203")).toBe(false);
    expect(isValidUtcTimestamp("20260228010203")).toBe(true);
    expect(parseCanonicalMigrationFilename("20260826010203_valid_slug.sql")).toEqual({
      filename: "20260826010203_valid_slug.sql",
      version: "20260826010203",
      slug: "valid_slug",
    });
    expect(extractValidTimestampPrefix("20260826010203_Legacy_slug.sql")).toBe("20260826010203");
  });
});
