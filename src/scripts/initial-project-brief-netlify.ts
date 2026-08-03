import type { InitialProjectBrief } from "./initial-project-brief.types";

export const NETLIFY_FIELD_NAMES = [
  "Location format",
  "Project address",
  "Easting",
  "Northing",
  "Project types",
  "Project type other",
  "Proposed units",
  "Project description",
  "Relationship to site",
  "Relationship detail",
  "Planning discussions",
  "Proposed start date",
  "Known constraints",
  "Constraint detail",
  "Total budget",
  "Budget guidance requested",
  "Budget notes",
  "Sustainability ambitions",
  "Sustainability detail",
  "Architect experience",
  "Experience notes",
  "Services required",
  "Other services",
  "Company or organisation",
  "Name",
  "Contact address",
  "email",
  "Phone",
  "Additional project information",
  "Questions for BBA",
  "How they heard about BBA",
  "Previous client project",
  "Referral detail",
  "Privacy acknowledgement",
] as const;

const joinPresent = (values: string[]) =>
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

export const buildInitialProjectBriefNetlifyPayload = (
  data: InitialProjectBrief,
  honeypotValue = "",
): URLSearchParams => {
  const payload = new URLSearchParams();
  payload.set("form-name", "initial-project-brief");
  payload.set("bot-field", honeypotValue);

  const add = (field: (typeof NETLIFY_FIELD_NAMES)[number], fieldValue: string) => {
    const trimmedValue = fieldValue.trim();
    if (trimmedValue) payload.set(field, trimmedValue);
  };

  add("Location format", data.locationFormat);
  if (data.locationFormat === "Grid reference") {
    add("Easting", data.projectEasting);
    add("Northing", data.projectNorthing);
  } else {
    add(
      "Project address",
      joinPresent([
        data.projectAddressLine,
        data.projectTownCity,
        data.projectCounty,
        data.projectPostcode,
      ]),
    );
  }

  add("Project types", data.projectTypes.join(", "));
  if (data.projectTypes.includes("Other")) {
    add("Project type other", data.projectTypeOther);
  }
  if (data.projectTypes.includes("Residential development (2+ homes)")) {
    add("Proposed units", data.unitsProposed);
  }
  add("Project description", data.projectDescription);

  add("Relationship to site", data.relationshipToSite);
  if (data.relationshipToSite === "Other") {
    add("Relationship detail", data.relationshipToSiteOther);
  }
  add("Planning discussions", data.planningDiscussions);
  add("Proposed start date", data.programme);
  add("Known constraints", data.constraints.join(", "));
  if (data.constraints.includes("Other")) {
    add("Constraint detail", data.constraintsOther);
  }

  add("Total budget", data.totalBudget);
  if (data.budgetUnsure) {
    add("Budget guidance requested", "Yes");
    add("Budget notes", data.budgetNotes);
  }

  add("Sustainability ambitions", data.sustainabilityAmbitions.join(", "));
  if (data.sustainabilityAmbitions.includes("Other")) {
    add("Sustainability detail", data.sustainabilityOther);
  }

  add("Architect experience", data.architectExperience);
  if (data.architectExperience === "Yes, previously") {
    add("Experience notes", data.architectExperienceNotes);
  }
  add("Services required", data.servicesNeeded.join(", "));
  add("Other services", data.servicesOther);

  add("Company or organisation", data.companyOrganisation);
  add("Name", data.contactName);
  add("Contact address", data.contactAddress);
  add("email", data.email);
  add("Phone", data.phone);

  add("Additional project information", data.anythingElse);
  add("Questions for BBA", data.questionsForUs);
  add("How they heard about BBA", data.heardAboutUs.join(", "));
  if (data.heardAboutUs.includes("Previous client")) {
    add("Previous client project", data.previousClientProject);
  }
  if (data.heardAboutUs.includes("Other")) {
    add("Referral detail", data.heardAboutUsOther);
  }
  if (data.privacyConsent) {
    add("Privacy acknowledgement", "Acknowledged");
  }

  return payload;
};
