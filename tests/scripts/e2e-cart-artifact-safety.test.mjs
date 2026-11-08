import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/e2e-cart.yml");
const workflow = YAML.parse(readFileSync(workflowPath, "utf8"));
const steps = workflow.jobs.e2e_cart.steps;

describe("E2E Cart artifact policy", () => {
  it("writes a machine-readable result without creating an HTML report", () => {
    const runStep = steps.find((step) => step.name?.startsWith("Run E2E Cart"));

    expect(runStep).toBeDefined();
    expect(runStep.run).toContain("--reporter=line,json");
    expect(runStep.run).not.toContain("--reporter=line,html");
    expect(runStep.env.PLAYWRIGHT_JSON_OUTPUT_NAME).toBe(
      "playwright-report/results.json",
    );
  });

  it("uploads only the JSON result and failure screenshots, never traces or videos", () => {
    const uploadStep = steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact@"),
    );
    const paths = uploadStep.with.path
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);

    expect(paths).toEqual([
      "playwright-report/results.json",
      "test-results/**/test-failed-1.png",
    ]);
    expect(paths.join("\n")).not.toMatch(
      /(^|\/)(playwright-report|test-results)\/?$|trace\.zip|\.webm|storageState\.json/i,
    );
    expect(uploadStep.with["retention-days"]).toBe(14);
  });
});
