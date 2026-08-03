import assert from "node:assert/strict";
import test from "node:test";

import { buildInitialProjectBriefNetlifyPayload } from "./initial-project-brief-netlify.ts";
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

  assert.ok(payload instanceof URLSearchParams);
  assert.deepEqual(Object.fromEntries(payload), {
    "form-name": "initial-project-brief",
    "bot-field": "bot-value",
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
