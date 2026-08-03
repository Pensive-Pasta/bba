import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  INITIAL_PROJECT_BRIEF_CHARACTER_LIMITS as CHARACTER_LIMITS,
  formatCharacterCount,
} from "./initial-project-brief-character-limits.ts";

const stepFiles = [
  "LocationStep.astro",
  "ProjectTypeStep.astro",
  "ProjectDescriptionStep.astro",
  "SituationStep.astro",
  "BudgetStep.astro",
  "SustainabilityStep.astro",
  "ServicesStep.astro",
  "ContactStep.astro",
  "AnythingElseStep.astro",
  "PrivacyStep.astro",
];

test("declares every configured character limit in the form markup", async () => {
  const stepsUrl = new URL("../components/initial-project-brief/steps/", import.meta.url);
  const markup = (
    await Promise.all(stepFiles.map((file) => readFile(new URL(file, stepsUrl), "utf8")))
  ).join("\n");

  for (const limitName of Object.keys(CHARACTER_LIMITS)) {
    assert.match(
      markup,
      new RegExp(`maxlength=\\{CHARACTER_LIMITS\\.${limitName}\\}`),
      `${limitName} should be applied as a maxlength`,
    );
  }
  assert.doesNotMatch(markup, /data-word-count|\bwords\b/i);
});

test("formats the live project-description character counter", () => {
  assert.equal(formatCharacterCount("A concise project brief", 800), "23 / 800 characters");
  assert.equal(formatCharacterCount("x".repeat(800), 800), "800 / 800 characters");
});

test("declares the PDF field statically and wires one retained Blob to upload and download", async () => {
  const formMarkup = await readFile(
    new URL("../components/initial-project-brief/EnquiryForm.astro", import.meta.url),
    "utf8",
  );
  const declarations = await readFile(
    new URL("../components/initial-project-brief/NetlifyFieldDeclarations.astro", import.meta.url),
    "utf8",
  );
  const controller = await readFile(new URL("./initial-project-brief.ts", import.meta.url), "utf8");
  const contactMarkup = await readFile(
    new URL("../components/initial-project-brief/steps/ContactStep.astro", import.meta.url),
    "utf8",
  );
  const locationMarkup = await readFile(
    new URL("../components/initial-project-brief/steps/LocationStep.astro", import.meta.url),
    "utf8",
  );

  const summarySubjectIndex = formMarkup.indexOf('type="text"\n      name="subject"');
  assert.notEqual(summarySubjectIndex, -1);
  assert.ok(summarySubjectIndex < formMarkup.indexOf("<LocationStep />"));
  assert.match(contactMarkup, /id="contact_name" name="Name"/);
  assert.match(locationMarkup, /name="Location format" value="Postal address"/);
  assert.match(declarations, /new Set\(\["subject", "Location format", "Name", "email"\]\)/);
  assert.match(formMarkup, /type="file"\n      name=\{NETLIFY_PDF_FIELD_NAME\}/);
  assert.match(
    controller,
    /appendInitialProjectBriefPdf\(\s*payload,\s*retainedPdf\.blob,\s*retainedPdf\.filename/,
  );
  assert.match(
    controller,
    /downloadInitialProjectBriefPdfBlob\(retainedPdf\.blob, retainedPdf\.filename\)/,
  );
  assert.doesNotMatch(controller, /Content-Type/);
});
