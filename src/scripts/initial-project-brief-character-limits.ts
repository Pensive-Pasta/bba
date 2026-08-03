export const INITIAL_PROJECT_BRIEF_CHARACTER_LIMITS = {
  projectAddressLine: 120,
  projectTownCity: 80,
  projectCounty: 80,
  projectPostcode: 12,
  projectEasting: 20,
  projectNorthing: 20,
  projectTypeOther: 160,
  projectDescription: 800,
  relationshipToSiteOther: 160,
  constraintsOther: 200,
  budgetNotes: 500,
  sustainabilityOther: 200,
  architectExperienceNotes: 600,
  servicesOther: 200,
  companyOrganisation: 120,
  contactName: 100,
  contactAddress: 240,
  email: 254,
  phone: 40,
  anythingElse: 800,
  questionsForUs: 800,
  previousClientProject: 200,
  heardAboutUsOther: 200,
} as const;

export const formatCharacterCount = (value: string, limit: number) =>
  `${value.length} / ${limit} characters`;
