import type { InitialProjectBrief } from "./initial-project-brief.types";

/**
 * Netlify only detects form fields that exist in the generated HTML at build time.
 * Keep these names in sync with buildInitialProjectBriefNetlifyPayload().
 */
export const NETLIFY_FIELD_NAMES = [
  "subject",
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

export const NETLIFY_PDF_FIELD_NAME = "Project brief PDF";
export const NETLIFY_EMPTY_FIELD_VALUE = "N/A";
export const MAX_INITIAL_PROJECT_BRIEF_PDF_BYTES = 500 * 1024;

export class InitialProjectBriefPdfSizeError extends Error {
  readonly size: number;

  constructor(size: number) {
    super("The generated project brief PDF exceeds the 500 KB limit.");
    this.name = "InitialProjectBriefPdfSizeError";
    this.size = size;
  }
}

export type RetainedProjectBriefPdf = {
  signature: string;
  blob: Blob;
  filename: string;
};

const joinPresent = (values: string[]) =>
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

export const getInitialProjectBriefSubmissionIdentifier = (data: InitialProjectBrief) => {
  const location = data.projectPostcode.trim() || data.projectTownCity.trim() || "Grid reference";
  return [data.contactName.trim(), location].filter(Boolean).join(" — ");
};

export const buildInitialProjectBriefNetlifyPayload = (
  data: InitialProjectBrief,
  honeypotValue = "",
): FormData => {
  const payload = new FormData();
  payload.set("form-name", "initial-project-brief");
  payload.set("bot-field", honeypotValue);

  const identifier = getInitialProjectBriefSubmissionIdentifier(data);
  payload.set("subject", `New BBA project brief — ${identifier}`);

  // Netlify includes every build-detected field in its dashboard and notification emails.
  // Start each clean field with an explicit fallback, then replace it with real answers below.
  for (const field of NETLIFY_FIELD_NAMES) {
    if (!payload.has(field)) payload.set(field, NETLIFY_EMPTY_FIELD_VALUE);
  }

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

export const addDetectedInitialProjectBriefFields = (
  payload: FormData,
  detectedFieldNames: Iterable<string>,
  submittedControls: FormData,
) => {
  for (const field of new Set(detectedFieldNames)) {
    if (!field || field === NETLIFY_PDF_FIELD_NAME || payload.has(field)) continue;

    const submittedValues = submittedControls
      .getAll(field)
      .filter((fieldValue): fieldValue is string => typeof fieldValue === "string")
      .map((fieldValue) => fieldValue.trim())
      .filter(Boolean);

    payload.set(
      field,
      submittedValues.length ? submittedValues.join(", ") : NETLIFY_EMPTY_FIELD_VALUE,
    );
  }

  return payload;
};

export const getInitialProjectBriefPayloadSignature = (payload: FormData) =>
  JSON.stringify(
    Array.from(payload.entries(), ([field, fieldValue]) => [
      field,
      typeof fieldValue === "string" ? fieldValue : fieldValue.name,
    ]),
  );

export const getInitialProjectBriefPdfFilename = (clientName: string) => {
  const safeName = clientName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return safeName ? `BBA-initial-project-brief-${safeName}.pdf` : "BBA-initial-project-brief.pdf";
};

export const assertInitialProjectBriefPdfSize = (blob: Blob) => {
  if (blob.size > MAX_INITIAL_PROJECT_BRIEF_PDF_BYTES) {
    throw new InitialProjectBriefPdfSizeError(blob.size);
  }
};

export const appendInitialProjectBriefPdf = (payload: FormData, blob: Blob, filename: string) => {
  assertInitialProjectBriefPdfSize(blob);
  const file = new File([blob], filename, { type: "application/pdf" });
  const submissionPayload = new FormData();
  submissionPayload.set(NETLIFY_PDF_FIELD_NAME, file);
  for (const [field, fieldValue] of payload.entries()) {
    submissionPayload.append(field, fieldValue);
  }
  return { file, payload: submissionPayload };
};

export const getOrCreateRetainedProjectBriefPdf = async (
  signature: string,
  clientName: string,
  retainedPdf: RetainedProjectBriefPdf | null,
  generatePdf: () => Promise<Blob>,
): Promise<RetainedProjectBriefPdf> => {
  if (retainedPdf?.signature === signature) return retainedPdf;

  const blob = await generatePdf();
  assertInitialProjectBriefPdfSize(blob);
  return {
    signature,
    blob,
    filename: getInitialProjectBriefPdfFilename(clientName),
  };
};
