import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_INITIAL_PROJECT_BRIEF_PDF_BYTES,
  NETLIFY_PDF_FIELD_NAME,
  appendInitialProjectBriefPdf,
  assertInitialProjectBriefPdfSize,
  buildInitialProjectBriefNetlifyPayload,
  getInitialProjectBriefPayloadSignature,
  getInitialProjectBriefPdfFilename,
  getInitialProjectBriefSubmissionIdentifier,
  getOrCreateRetainedProjectBriefPdf,
} from "./initial-project-brief-netlify.ts";
import type { InitialProjectBrief } from "./initial-project-brief.types.ts";

const completeBrief = (overrides: Partial<InitialProjectBrief> = {}): InitialProjectBrief => ({
  locationFormat: "Postal address",
  projectAddressLine: "1 Market Place",
  projectTownCity: "Oundle",
  projectCounty: "Northamptonshire",
  projectPostcode: "PE8 4BQ",
  projectEasting: "",
  projectNorthing: "",
  projectTypes: ["Residential development (2+ homes)", "Other"],
  projectTypeOther: "Community space",
  unitsProposed: "12 homes",
  projectDescription: "A carefully considered family home.",
  relationshipToSite: "Other",
  relationshipToSiteOther: "Prospective purchaser",
  planningDiscussions: "No",
  programme: "Within 6 months",
  constraints: ["Conservation area", "Other"],
  constraintsOther: "Protected trees",
  totalBudget: "",
  budgetUnsure: true,
  budgetNotes: "Please advise",
  sustainabilityAmbitions: ["Low operational energy", "Other"],
  sustainabilityOther: "Local materials",
  architectExperience: "Yes, previously",
  architectExperienceNotes: "One completed project",
  servicesNeeded: ["Architecture", "Planning"],
  servicesOther: "Interior design",
  companyOrganisation: "Example Developments",
  contactName: "Alex Example",
  contactAddress: "2 West Street, Oundle",
  email: "alex@example.com",
  phone: "01234 567890",
  anythingElse: "Phased construction",
  questionsForUs: "What happens next?",
  heardAboutUs: ["Previous client", "Other"],
  previousClientProject: "Old Mill House",
  heardAboutUsOther: "A local event",
  privacyConsent: true,
  submittedAt: new Date("2026-08-03T12:00:00.000Z"),
  ...overrides,
});

test("serialises the complete clean text payload with human-readable values", () => {
  const payload = buildInitialProjectBriefNetlifyPayload(completeBrief(), "bot-value");

  assert.ok(payload instanceof FormData);
  assert.deepEqual(Object.fromEntries(payload), {
    "form-name": "initial-project-brief",
    "bot-field": "bot-value",
    subject: "New BBA project brief — Alex Example — PE8 4BQ",
    "Location format": "Postal address",
    "Project address": "1 Market Place, Oundle, Northamptonshire, PE8 4BQ",
    "Project types": "Residential development (2+ homes), Other",
    "Project type other": "Community space",
    "Proposed units": "12 homes",
    "Project description": "A carefully considered family home.",
    "Relationship to site": "Other",
    "Relationship detail": "Prospective purchaser",
    "Planning discussions": "No",
    "Proposed start date": "Within 6 months",
    "Known constraints": "Conservation area, Other",
    "Constraint detail": "Protected trees",
    "Budget guidance requested": "Yes",
    "Budget notes": "Please advise",
    "Sustainability ambitions": "Low operational energy, Other",
    "Sustainability detail": "Local materials",
    "Architect experience": "Yes, previously",
    "Experience notes": "One completed project",
    "Services required": "Architecture, Planning",
    "Other services": "Interior design",
    "Company or organisation": "Example Developments",
    Name: "Alex Example",
    "Contact address": "2 West Street, Oundle",
    email: "alex@example.com",
    Phone: "01234 567890",
    "Additional project information": "Phased construction",
    "Questions for BBA": "What happens next?",
    "How they heard about BBA": "Previous client, Other",
    "Previous client project": "Old Mill House",
    "Referral detail": "A local event",
    "Privacy acknowledgement": "Acknowledged",
  });
});

test("builds subject metadata without malformed separators", () => {
  const townBrief = completeBrief({ projectPostcode: "", projectTownCity: "Oundle" });
  const gridBrief = completeBrief({
    locationFormat: "Grid reference",
    projectPostcode: "",
    projectTownCity: "",
  });
  const unnamedBrief = completeBrief({
    contactName: "",
    projectPostcode: "",
    projectTownCity: "",
  });

  assert.equal(getInitialProjectBriefSubmissionIdentifier(townBrief), "Alex Example — Oundle");
  assert.equal(
    buildInitialProjectBriefNetlifyPayload(townBrief).get("subject"),
    "New BBA project brief — Alex Example — Oundle",
  );
  assert.equal(
    getInitialProjectBriefSubmissionIdentifier(gridBrief),
    "Alex Example — Grid reference",
  );
  assert.equal(getInitialProjectBriefSubmissionIdentifier(unnamedBrief), "Grid reference");
  assert.equal(
    buildInitialProjectBriefNetlifyPayload(unnamedBrief).get("subject"),
    "New BBA project brief — Grid reference",
  );
  assert.equal(buildInitialProjectBriefNetlifyPayload(townBrief).has("title"), false);
});

test("appends a genuine PDF File while retaining every clean text field", async () => {
  const payload = buildInitialProjectBriefNetlifyPayload(completeBrief(), "bot-value");
  const cleanEntries = Array.from(payload.entries());
  const blob = new Blob(["project brief pdf"], { type: "application/pdf" });
  const { file, payload: submissionPayload } = appendInitialProjectBriefPdf(
    payload,
    blob,
    "BBA-initial-project-brief-alex-example.pdf",
  );

  assert.ok(file instanceof File);
  assert.equal(file.name, "BBA-initial-project-brief-alex-example.pdf");
  assert.equal(file.type, "application/pdf");
  assert.equal(await file.text(), await blob.text());
  assert.equal(submissionPayload.get(NETLIFY_PDF_FIELD_NAME), file);
  assert.equal(submissionPayload.entries().next().value?.[0], NETLIFY_PDF_FIELD_NAME);
  assert.deepEqual(
    Array.from(submissionPayload.entries()).filter(([field]) => field !== NETLIFY_PDF_FIELD_NAME),
    cleanEntries,
  );
});

test("creates safe project brief filenames with a client-name fallback", () => {
  assert.equal(
    getInitialProjectBriefPdfFilename("  Alex / Éxample:*?  "),
    "BBA-initial-project-brief-alex-example.pdf",
  );
  assert.equal(getInitialProjectBriefPdfFilename(" /:*? "), "BBA-initial-project-brief.pdf");
});

test("rejects a generated PDF above the 500 KB safeguard", () => {
  assert.doesNotThrow(() => {
    assertInitialProjectBriefPdfSize(
      new Blob([new Uint8Array(MAX_INITIAL_PROJECT_BRIEF_PDF_BYTES)]),
    );
  });
  assert.throws(
    () =>
      assertInitialProjectBriefPdfSize(
        new Blob([new Uint8Array(MAX_INITIAL_PROJECT_BRIEF_PDF_BYTES + 1)]),
      ),
    /exceeds the 500 KB limit/,
  );
});

test("reuses the retained PDF Blob when an unchanged submission is retried", async () => {
  const payload = buildInitialProjectBriefNetlifyPayload(completeBrief());
  const signature = getInitialProjectBriefPayloadSignature(payload);
  let generationCount = 0;
  const generatePdf = async () => {
    generationCount += 1;
    return new Blob([`pdf ${generationCount}`], { type: "application/pdf" });
  };

  const first = await getOrCreateRetainedProjectBriefPdf(
    signature,
    "Alex Example",
    null,
    generatePdf,
  );
  const retry = await getOrCreateRetainedProjectBriefPdf(
    signature,
    "Alex Example",
    first,
    generatePdf,
  );

  assert.equal(retry, first);
  assert.equal(retry.blob, first.blob);
  assert.equal(generationCount, 1);
});

test("uses grid fields and omits blank, postal, and inactive conditional fields", () => {
  const payload = buildInitialProjectBriefNetlifyPayload(
    completeBrief({
      locationFormat: "Grid reference",
      projectEasting: "512345",
      projectNorthing: "287654",
      projectTypes: ["New build"],
      projectTypeOther: "Inactive answer",
      unitsProposed: "Inactive answer",
      relationshipToSite: "Owner",
      relationshipToSiteOther: "Inactive answer",
      constraints: ["None known"],
      constraintsOther: "Inactive answer",
      totalBudget: "£500k–£1m",
      budgetUnsure: false,
      budgetNotes: "Inactive answer",
      sustainabilityAmbitions: ["Low operational energy"],
      sustainabilityOther: "Inactive answer",
      architectExperience: "No, this is my first time",
      architectExperienceNotes: "Inactive answer",
      servicesOther: "",
      companyOrganisation: "",
      contactAddress: "",
      phone: "",
      anythingElse: "",
      questionsForUs: "",
      heardAboutUs: [],
      previousClientProject: "Inactive answer",
      heardAboutUsOther: "Inactive answer",
    }),
  );

  assert.equal(payload.get("Easting"), "512345");
  assert.equal(payload.get("Northing"), "287654");
  assert.equal(payload.get("Total budget"), "£500k–£1m");
  assert.equal(payload.get("email"), "alex@example.com");
  for (const omittedField of [
    "Project address",
    "Project type other",
    "Proposed units",
    "Relationship detail",
    "Constraint detail",
    "Budget guidance requested",
    "Budget notes",
    "Sustainability detail",
    "Experience notes",
    "Other services",
    "Company or organisation",
    "Contact address",
    "Phone",
    "Additional project information",
    "Questions for BBA",
    "How they heard about BBA",
    "Previous client project",
    "Referral detail",
  ]) {
    assert.equal(payload.has(omittedField), false, `${omittedField} should be omitted`);
  }
});
