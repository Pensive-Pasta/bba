import type { BriefSection, InitialProjectBrief } from "./initial-project-brief.types";

const notAnswered = "Not answered";

const joinPresent = (values: Array<string | undefined>, separator = ", ") =>
  values.filter((value): value is string => Boolean(value?.trim())).join(separator);

const withOther = (values: string[], other: string) =>
  `${values.length ? values.join(", ") : notAnswered}${values.includes("Other") && other ? `  ·  ${other}` : ""}`;

export const buildBriefSections = (data: InitialProjectBrief): BriefSection[] => {
  const location = data.locationFormat === "Grid reference"
    ? joinPresent([
        data.projectEasting ? `Easting ${data.projectEasting}` : undefined,
        data.projectNorthing ? `Northing ${data.projectNorthing}` : undefined,
      ])
    : joinPresent([
        data.projectAddressLine,
        data.projectTownCity,
        data.projectCounty,
        data.projectPostcode,
      ]);

  const projectType = `${withOther(data.projectTypes, data.projectTypeOther)}${
    data.projectTypes.includes("Residential development (2+ homes)") && data.unitsProposed
      ? `  ·  ${data.unitsProposed}`
      : ""
  }`;
  const relationship = data.relationshipToSite === "Other"
    ? joinPresent([data.relationshipToSite, data.relationshipToSiteOther], " — ")
    : data.relationshipToSite;
  const budget = `${data.budgetUnsure ? "Not sure yet — guidance requested" : data.totalBudget}${
    data.budgetNotes ? `  ·  ${data.budgetNotes}` : ""
  }`;
  const heard = joinPresent([
    data.heardAboutUs.length ? data.heardAboutUs.join(", ") : undefined,
    data.heardAboutUs.includes("Other") ? data.heardAboutUsOther : undefined,
    data.heardAboutUs.includes("Previous client") ? data.previousClientProject : undefined,
  ], " — ");

  return [
    { label: "Project type", value: projectType },
    { label: "Location", value: location || notAnswered },
    { label: "The project", value: data.projectDescription || notAnswered },
    { label: "Relationship to the site", value: relationship || notAnswered },
    { label: "Planning discussions", value: data.planningDiscussions || notAnswered },
    { label: "Programme", value: data.programme || notAnswered },
    { label: "Constraints flagged", value: withOther(data.constraints, data.constraintsOther) },
    { label: "Budget", value: budget || notAnswered },
    { label: "Sustainability ambitions", value: withOther(data.sustainabilityAmbitions, data.sustainabilityOther) },
    {
      label: "First time taking this on?",
      value: `${data.architectExperience || notAnswered}${data.architectExperienceNotes ? `  ·  ${data.architectExperienceNotes}` : ""}`,
    },
    {
      label: "Services needed",
      value: `${data.servicesNeeded.length ? data.servicesNeeded.join(", ") : notAnswered}${data.servicesOther ? `  ·  ${data.servicesOther}` : ""}`,
    },
    {
      label: "Contact",
      value: joinPresent([
        data.companyOrganisation,
        data.contactName,
        data.contactAddress,
        data.email,
        data.phone,
      ], "  ·  ") || notAnswered,
    },
    { label: "Anything else", value: data.anythingElse || notAnswered },
    { label: "Questions for us", value: data.questionsForUs || notAnswered },
    { label: "How they heard about us", value: heard || notAnswered },
    {
      label: "Privacy notice",
      value: data.privacyConsent
        ? `Acknowledged — ${data.submittedAt.toLocaleString("en-GB")}`
        : "Not acknowledged",
    },
  ];
};

const optionalPdfAnswers: Record<string, keyof InitialProjectBrief> = {
  "Anything else": "anythingElse",
  "Questions for us": "questionsForUs",
  "How they heard about us": "heardAboutUs",
};

const buildPdfBriefSections = (data: InitialProjectBrief) =>
  buildBriefSections(data).filter((section) => {
    const answer = optionalPdfAnswers[section.label];
    if (!answer) return true;
    const value = data[answer];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

const imageToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load the BBA logo for the PDF.");
  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(blob);
  });
};

export const createInitialProjectBriefPdfBlob = async (data: InitialProjectBrief) => {
  const [{ jsPDF }, logoDataUrl] = await Promise.all([
    import("jspdf"),
    imageToDataUrl("/images/BBA-Logo.png"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const marginTop = 20;
  const marginBottom = 30;
  const contentWidth = pageWidth - marginX * 2;
  const blue: [number, number, number] = [23, 143, 228];
  let y = marginTop;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  const label = (text: string) => {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...blue);
    doc.text(text, marginX, y);
    y += 5.5;
  };

  const value = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...blue);
    const lines = doc.splitTextToSize(text || notAnswered, contentWidth) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, marginX, y);
      y += 5;
    }
    y += 4;
  };

  doc.addImage(logoDataUrl, "PNG", marginX, y, 30, 13.64);
  y += 35.64;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...blue);
  doc.text("Initial enquiry", marginX, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `${data.contactName || "New enquiry"}   ·   ${data.submittedAt.toLocaleDateString("en-GB")}`,
    marginX,
    y,
  );
  y += 6;
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([0.6, 1.4], 0);
  doc.line(marginX, y, pageWidth - marginX, y);
  doc.setLineDashPattern([], 0);
  y += 9;

  for (const section of buildPdfBriefSections(data)) {
    label(section.label);
    value(section.value);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const footerRuleY = pageHeight - 20;
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([0.6, 1.4], 0);
    doc.line(marginX, footerRuleY, pageWidth - marginX, footerRuleY);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...blue);
    doc.text("Butcher Bayley Architects  ·  hello@wearebba.co.uk  ·  wearebba.co.uk", marginX, footerRuleY + 6);
    doc.text("The Courthouse, Mill Road, Oundle, Northamptonshire, PE8 4BW", marginX, footerRuleY + 10.5);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, footerRuleY + 6, { align: "right" });
  }

  return doc.output("blob");
};

export const downloadInitialProjectBriefPdfBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};
