import {
  buildBriefSections,
  createInitialProjectBriefPdfBlob,
  downloadInitialProjectBriefPdfBlob,
} from "./initial-project-brief-pdf";
import { formatCharacterCount } from "./initial-project-brief-character-limits";
import type { InitialProjectBrief } from "./initial-project-brief.types";
import {
  InitialProjectBriefPdfSizeError,
  appendInitialProjectBriefPdf,
  buildInitialProjectBriefNetlifyPayload,
  getInitialProjectBriefPayloadSignature,
  getOrCreateRetainedProjectBriefPdf,
  type RetainedProjectBriefPdf,
} from "./initial-project-brief-netlify";

const STEPS = [
  "welcome",
  "location",
  "project_type",
  "project",
  "situation",
  "budget",
  "sustainability",
  "services",
  "contact",
  "anything_else",
  "privacy",
  "review",
] as const;
const QUESTION_STEPS = STEPS.slice(1, -1);
type StepName = (typeof STEPS)[number];

type BriefWindow = Window & {
  __initialProjectBriefController?: AbortController;
};

const control = <T extends HTMLElement>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Initial project brief control not found: ${selector}`);
  return element;
};

const value = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const values = (formData: FormData, name: string) =>
  formData.getAll(name).map(String).map((item) => item.trim()).filter(Boolean);

const collectBrief = (form: HTMLFormElement, submittedAt = new Date()): InitialProjectBrief => {
  const formData = new FormData(form);
  return {
    locationFormat: value(formData, "Location format"),
    projectAddressLine: value(formData, "project_address_line"),
    projectTownCity: value(formData, "project_town_city"),
    projectCounty: value(formData, "project_county"),
    projectPostcode: value(formData, "project_postcode"),
    projectEasting: value(formData, "project_easting"),
    projectNorthing: value(formData, "project_northing"),
    projectTypes: values(formData, "project_type[]"),
    projectTypeOther: value(formData, "project_type_other"),
    unitsProposed: value(formData, "units_proposed"),
    projectDescription: value(formData, "project_description"),
    relationshipToSite: value(formData, "relationship_to_site"),
    relationshipToSiteOther: value(formData, "relationship_to_site_other"),
    planningDiscussions: value(formData, "planning_discussions"),
    programme: value(formData, "programme"),
    constraints: values(formData, "constraints[]"),
    constraintsOther: value(formData, "constraints_other"),
    totalBudget: value(formData, "total_budget"),
    budgetUnsure: formData.has("budget_unsure"),
    budgetNotes: value(formData, "budget_notes"),
    sustainabilityAmbitions: values(formData, "sustainability_ambitions[]"),
    sustainabilityOther: value(formData, "sustainability_other"),
    architectExperience: value(formData, "architect_experience"),
    architectExperienceNotes: value(formData, "architect_experience_notes"),
    servicesNeeded: values(formData, "services_needed[]"),
    servicesOther: value(formData, "services_other"),
    companyOrganisation: value(formData, "company_organisation"),
    contactName: value(formData, "Name"),
    contactAddress: value(formData, "contact_address"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    anythingElse: value(formData, "anything_else"),
    questionsForUs: value(formData, "questions_for_us"),
    heardAboutUs: values(formData, "heard_about_us[]"),
    previousClientProject: value(formData, "previous_client_project"),
    heardAboutUsOther: value(formData, "heard_about_us_other"),
    privacyConsent: formData.has("privacy_consent"),
    submittedAt,
  };
};

const joinPresent = (items: string[], separator = ", ") =>
  items.filter((item) => item.trim()).join(separator);

export const initialiseInitialProjectBrief = () => {
  const form = document.querySelector<HTMLFormElement>("[data-initial-project-brief]");
  if (!form || form.dataset.initialised === "true") return;
  form.dataset.initialised = "true";

  const briefWindow = window as BriefWindow;
  briefWindow.__initialProjectBriefController?.abort();
  const controller = new AbortController();
  const { signal } = controller;
  briefWindow.__initialProjectBriefController = controller;

  const stepElements = new Map<StepName, HTMLElement>();
  for (const step of STEPS) {
    stepElements.set(step, control(form, `[data-brief-step="${step}"]`));
  }

  const progress = control<HTMLElement>(form, "[data-brief-progress]");
  const progressItems = Array.from(progress.querySelectorAll<HTMLButtonElement>("[data-progress-index]"));
  const navigation = control<HTMLElement>(form, "[data-brief-navigation]");
  const backButton = control<HTMLButtonElement>(navigation, "[data-brief-back]");
  const nextButton = control<HTMLButtonElement>(navigation, "[data-brief-next]");
  const stepIndex = control<HTMLElement>(navigation, "[data-step-index]");
  const navigationError = control<HTMLElement>(navigation, "[data-navigation-error]");
  const reviewBody = control<HTMLElement>(form, "[data-review-body]");
  const submissionError = control<HTMLElement>(form, "[data-submission-error]");
  const submissionErrorMessage = control<HTMLElement>(submissionError, "[data-submission-error-message]");
  const submitButton = control<HTMLButtonElement>(form, "[data-submit-button]");
  const success = control<HTMLElement>(document, "[data-submission-success]");
  const downloadButton = control<HTMLButtonElement>(success, "[data-download-pdf]");
  const printButton = control<HTMLButtonElement>(success, "[data-print-brief]");
  const downloadStatus = control<HTMLElement>(success, "[data-download-status]");
  const printSummary = control<HTMLElement>(success, "[data-print-summary]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const defaultSubmissionErrorMessage = submissionErrorMessage.textContent ?? "";

  let currentStep: StepName = "welcome";
  let editingFromReview = false;
  let submitting = false;
  let submitted = false;
  let completedBrief: InitialProjectBrief | null = null;
  let retainedPdf: RetainedProjectBriefPdf | null = null;
  let retainedPdfBrief: InitialProjectBrief | null = null;
  let navigationErrorTimer: number | undefined;

  const hideNavigationError = () => {
    navigationError.hidden = true;
    nextButton.removeAttribute("aria-describedby");
    if (navigationErrorTimer !== undefined) {
      window.clearTimeout(navigationErrorTimer);
      navigationErrorTimer = undefined;
    }
  };

  const showNavigationError = () => {
    hideNavigationError();
    navigationError.hidden = false;
    nextButton.setAttribute("aria-describedby", navigationError.id);
    navigationErrorTimer = window.setTimeout(hideNavigationError, 3000);
  };

  const fieldsByName = (name: string) =>
    Array.from(form.querySelectorAll<HTMLInputElement>("input")).filter((input) => input.name === name);

  const checkedValues = (name: string) =>
    fieldsByName(name).filter((input) => input.checked).map((input) => input.value);

  const checkedValue = (name: string) => checkedValues(name)[0] ?? "";

  const characterCounters = Array.from(
    form.querySelectorAll<HTMLElement>("[data-character-count-for]"),
  );
  const updateCharacterCounters = (changed?: HTMLInputElement | HTMLTextAreaElement) => {
    for (const counter of characterCounters) {
      const fieldId = counter.dataset.characterCountFor;
      if (!fieldId || (changed && changed.id !== fieldId)) continue;
      const field = control<HTMLInputElement | HTMLTextAreaElement>(form, `#${fieldId}`);
      counter.textContent = formatCharacterCount(field.value, field.maxLength);
    }
  };

  const segmentControls = Array.from(form.querySelectorAll<HTMLElement>(".brief-segments"));
  for (const segmentControl of segmentControls) {
    if (segmentControl.querySelector(".brief-segment-highlight")) continue;
    const highlight = document.createElement("span");
    highlight.className = "brief-segment-highlight";
    highlight.setAttribute("aria-hidden", "true");
    segmentControl.prepend(highlight);
  }

  const updateSegmentHighlights = () => {
    for (const segmentControl of segmentControls) {
      const highlight = segmentControl.querySelector<HTMLElement>(".brief-segment-highlight");
      const selectedInput = segmentControl.querySelector<HTMLInputElement>("input:checked");
      const selected = selectedInput?.closest<HTMLElement>(".brief-segment");
      if (!highlight || !selected || segmentControl.hidden) {
        if (highlight) highlight.style.opacity = "0";
        continue;
      }
      highlight.style.left = `${selected.offsetLeft}px`;
      highlight.style.top = `${selected.offsetTop}px`;
      highlight.style.width = `${selected.offsetWidth}px`;
      highlight.style.height = `${selected.offsetHeight}px`;
      highlight.style.opacity = "1";
    }
  };

  const setConditional = (element: HTMLElement, active: boolean) => {
    element.hidden = !active;
    if (element instanceof HTMLFieldSetElement) element.disabled = !active;
    element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")
      .forEach((field) => { field.disabled = !active; });
  };

  const validateStep = (step: StepName): boolean => {
    const data = collectBrief(form);

    if (step === "location") {
      if (data.locationFormat === "Grid reference") {
        return Boolean(data.projectEasting || data.projectNorthing);
      }
      return Boolean(data.projectAddressLine);
    }
    if (step === "project_type") return data.projectTypes.length > 0;
    if (step === "project") return Boolean(data.projectDescription);
    if (step === "situation") {
      return Boolean(
        data.relationshipToSite &&
        data.planningDiscussions &&
        data.programme &&
        data.constraints.length > 0
      );
    }
    if (step === "budget") return Boolean(data.totalBudget || data.budgetUnsure);
    if (step === "sustainability") return data.sustainabilityAmbitions.length > 0;
    if (step === "services") {
      return Boolean(data.architectExperience && data.servicesNeeded.length > 0);
    }
    if (step === "contact") {
      return Boolean(data.contactName && /\S+@\S+\.\S+/.test(data.email) && data.phone);
    }
    if (step === "privacy") return data.privacyConsent;
    return true;
  };

  const updateProgress = () => {
    const questionIndex = QUESTION_STEPS.indexOf(currentStep as never);
    const reviewing = currentStep === "review";
    progress.hidden = currentStep === "welcome";

    progressItems.forEach((item, index) => {
      const done = reviewing || index < questionIndex;
      const current = index === questionIndex;
      item.dataset.state = done ? "done" : current ? "current" : "upcoming";
      item.disabled = !done;
      const number = item.querySelector<HTMLElement>("span");
      if (number) number.textContent = done || current ? String(index + 1) : "";
      if (current) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });

    const currentItem = questionIndex >= 0 ? progressItems[questionIndex] : undefined;
    if (currentItem) {
      requestAnimationFrame(() => {
        const targetLeft = currentItem.offsetLeft - (progress.clientWidth - currentItem.offsetWidth) / 2;
        progress.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: prefersReducedMotion.matches ? "auto" : "smooth",
        });
      });
    }
  };

  const renderReview = () => {
    const data = collectBrief(form);
    const location = data.locationFormat === "Grid reference"
      ? joinPresent([
          data.projectEasting ? `Easting ${data.projectEasting}` : "",
          data.projectNorthing ? `Northing ${data.projectNorthing}` : "",
        ])
      : joinPresent([
          data.projectAddressLine,
          data.projectTownCity,
          data.projectCounty,
          data.projectPostcode,
        ]);
    const source = joinPresent([
      data.heardAboutUs.join(", "),
      data.heardAboutUsOther,
      data.previousClientProject,
    ], " — ");
    const cards: Array<{ title: string; edit: StepName; rows: Array<[string, string]> }> = [
      {
        title: "Project type",
        edit: "project_type",
        rows: [
          ["Type", data.projectTypes.join(", ")],
          ["Other, roughly", data.projectTypes.includes("Other") ? data.projectTypeOther : ""],
          ["Units proposed", data.projectTypes.includes("Residential development (2+ homes)") ? data.unitsProposed : ""],
        ],
      },
      { title: "Location", edit: "location", rows: [["Site", location]] },
      { title: "The project", edit: "project", rows: [["Description", data.projectDescription]] },
      {
        title: "Where things stand",
        edit: "situation",
        rows: [
          ["Relationship to the site", data.relationshipToSite === "Other" ? joinPresent([data.relationshipToSite, data.relationshipToSiteOther], " — ") : data.relationshipToSite],
          ["Planning discussions", data.planningDiscussions],
          ["Programme", data.programme],
          ["Constraints flagged", data.constraints.join(", ")],
          ["Constraints, other detail", data.constraints.includes("Other") ? data.constraintsOther : ""],
        ],
      },
      {
        title: "Budget",
        edit: "budget",
        rows: [
          ["Total budget", data.budgetUnsure ? "Not sure yet — guidance requested" : data.totalBudget],
          ["Notes", data.budgetNotes],
        ],
      },
      {
        title: "Sustainability",
        edit: "sustainability",
        rows: [
          ["Ambitions", data.sustainabilityAmbitions.join(", ")],
          ["Other, roughly", data.sustainabilityAmbitions.includes("Other") ? data.sustainabilityOther : ""],
        ],
      },
      {
        title: "Services needed",
        edit: "services",
        rows: [
          ["First time?", data.architectExperience],
          ["Experience notes", data.architectExperienceNotes],
          ["Services", data.servicesNeeded.join(", ")],
          ["Other", data.servicesOther],
        ],
      },
      {
        title: "Contact",
        edit: "contact",
        rows: [
          ["Company / organisation", data.companyOrganisation],
          ["Name", data.contactName],
          ["Address", data.contactAddress],
          ["Email", data.email],
          ["Phone", data.phone],
        ],
      },
      { title: "Anything else", edit: "anything_else", rows: [["Notes", data.anythingElse]] },
      { title: "Questions for us", edit: "anything_else", rows: [["Questions", data.questionsForUs]] },
      { title: "How you heard about us", edit: "privacy", rows: [["Source", source]] },
    ];

    reviewBody.replaceChildren();
    for (const card of cards) {
      const cardElement = document.createElement("section");
      cardElement.className = "brief-review-card";
      const heading = document.createElement("h3");
      heading.textContent = card.title;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", `Edit ${card.title}`);
      edit.addEventListener("click", () => {
        editingFromReview = true;
        showStep(card.edit);
      }, { signal });
      const list = document.createElement("dl");
      const answeredRows = card.rows.filter(([, answer]) => Boolean(answer));
      if (answeredRows.length === 0) {
        const empty = document.createElement("dd");
        empty.className = "italic";
        empty.textContent = "Not answered";
        list.append(empty);
      } else {
        for (const [label, answer] of answeredRows) {
          const term = document.createElement("dt");
          const description = document.createElement("dd");
          term.textContent = label;
          description.textContent = answer;
          list.append(term, description);
        }
      }
      cardElement.append(edit, heading, list);
      reviewBody.append(cardElement);
    }
  };

  const updateNavigation = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    const questionIndex = QUESTION_STEPS.indexOf(currentStep as never);
    navigation.dataset.step = currentStep;
    navigation.hidden = currentStep === "review";
    backButton.hidden = currentIndex === 0;
    stepIndex.hidden = questionIndex < 0;
    stepIndex.textContent = questionIndex >= 0 ? `${questionIndex + 1} / ${QUESTION_STEPS.length}` : "";
    nextButton.textContent = currentStep === "welcome"
      ? "Let's start"
      : editingFromReview
        ? "Save & return to review"
        : currentStep === "privacy"
          ? "Review"
          : "Continue";
    const stepIsValid = validateStep(currentStep);
    nextButton.setAttribute("aria-disabled", String(!stepIsValid));
    if (stepIsValid) hideNavigationError();
  };

  const showStep = (step: StepName, focusHeading = true) => {
    hideNavigationError();
    currentStep = step;
    for (const [name, section] of stepElements) section.hidden = name !== step;
    if (step === "review") {
      editingFromReview = false;
      submissionError.hidden = true;
      renderReview();
    }
    updateProgress();
    updateNavigation();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
    if (focusHeading) {
      requestAnimationFrame(() => {
        stepElements.get(step)?.querySelector<HTMLElement>("h1, h2")?.focus({ preventScroll: true });
        updateSegmentHighlights();
      });
    }
  };

  const syncConditionals = (changed?: HTMLInputElement) => {
    const gridFields = control<HTMLElement>(form, "[data-grid-fields]");
    const usingGrid = !gridFields.hidden;
    const projectTypes = checkedValues("project_type[]");
    setConditional(control(form, "[data-project-type-other]"), projectTypes.includes("Other"));
    setConditional(control(form, "[data-units-wrap]"), projectTypes.includes("Residential development (2+ homes)"));
    setConditional(control(form, "[data-site-other]"), checkedValue("relationship_to_site") === "Other");
    setConditional(control(form, "[data-constraints-other]"), checkedValues("constraints[]").includes("Other"));
    setConditional(control(form, "[data-sustainability-other]"), checkedValues("sustainability_ambitions[]").includes("Other"));
    setConditional(control(form, "[data-experience-notes]"), checkedValue("architect_experience") === "Yes, previously");
    setConditional(control(form, "[data-previous-client]"), checkedValues("heard_about_us[]").includes("Previous client"));
    setConditional(control(form, "[data-heard-other]"), checkedValues("heard_about_us[]").includes("Other"));

    const budgetUnsure = control<HTMLInputElement>(form, "#budget_unsure");
    const budgetFields = fieldsByName("total_budget");
    if (changed?.name === "total_budget" && changed.checked) budgetUnsure.checked = false;
    if (changed?.id === "budget_unsure" && changed.checked) {
      budgetFields.forEach((field) => { field.checked = false; });
    }
    setConditional(control(form, "[data-budget-notes]"), budgetUnsure.checked);
    control<HTMLElement>(form, "[data-budget-readout]").textContent = checkedValue("total_budget") || "Tap to set your budget";
    control<HTMLElement>(form, "[data-programme-readout]").textContent = checkedValue("programme") || "Tap to set a rough timeline";

    updateCharacterCounters(changed);

    control<HTMLInputElement>(form, "[data-location-format]").value = usingGrid ? "Grid reference" : "Postal address";
    updateNavigation();
    requestAnimationFrame(updateSegmentHighlights);
  };

  control<HTMLButtonElement>(form, "[data-toggle-location]").addEventListener("click", (event) => {
    const toggle = event.currentTarget as HTMLButtonElement;
    const addressFields = control<HTMLElement>(form, "[data-address-fields]");
    const gridFields = control<HTMLElement>(form, "[data-grid-fields]");
    const useGrid = gridFields.hidden;
    setConditional(addressFields, !useGrid);
    setConditional(gridFields, useGrid);
    control<HTMLInputElement>(form, "[data-location-format]").value = useGrid ? "Grid reference" : "Postal address";
    toggle.textContent = useGrid
      ? "Actually, I do have an address"
      : "No address yet — use a grid reference instead";
    syncConditionals();
  }, { signal });

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    syncConditionals(target instanceof HTMLInputElement ? target : undefined);
  }, { signal });

  form.addEventListener("change", (event) => {
    const target = event.target;
    syncConditionals(target instanceof HTMLInputElement ? target : undefined);
  }, { signal });

  nextButton.addEventListener("click", () => {
    if (!validateStep(currentStep)) {
      showNavigationError();
      return;
    }
    if (editingFromReview) {
      showStep("review");
      return;
    }
    const index = STEPS.indexOf(currentStep);
    const next = STEPS[index + 1];
    if (next) showStep(next);
  }, { signal });

  backButton.addEventListener("click", () => {
    editingFromReview = false;
    const previous = STEPS[STEPS.indexOf(currentStep) - 1];
    if (previous) showStep(previous);
  }, { signal });

  progressItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      if (item.dataset.state !== "done") return;
      if (currentStep === "review") editingFromReview = true;
      showStep(QUESTION_STEPS[index]);
    }, { signal });
  });

  const renderPrintSummary = (data: InitialProjectBrief) => {
    printSummary.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = "Initial enquiry";
    const meta = document.createElement("p");
    meta.className = "mb-6 text-sm";
    meta.textContent = `${data.contactName || "New enquiry"} · ${data.submittedAt.toLocaleDateString("en-GB")}`;
    printSummary.append(title, meta);
    for (const item of buildBriefSections(data)) {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      const answer = document.createElement("p");
      heading.textContent = item.label;
      answer.textContent = item.value;
      section.append(heading, answer);
      printSummary.append(section);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || submitted) return;

    const firstInvalid = QUESTION_STEPS.find((step) => !validateStep(step));
    if (firstInvalid) {
      showStep(firstInvalid);
      return;
    }

    submitting = true;
    submissionError.hidden = true;
    submissionErrorMessage.textContent = defaultSubmissionErrorMessage;
    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";

    let submissionStage: "pdf" | "network" = "pdf";
    try {
      const currentBrief = collectBrief(form, new Date());
      const honeypotValue = control<HTMLInputElement>(form, "#bot-field").value;
      const payload = buildInitialProjectBriefNetlifyPayload(currentBrief, honeypotValue);
      const payloadSignature = getInitialProjectBriefPayloadSignature(payload);
      const previousRetainedPdf = retainedPdf;
      const nextRetainedPdf = await getOrCreateRetainedProjectBriefPdf(
        payloadSignature,
        currentBrief.contactName,
        retainedPdf,
        () => createInitialProjectBriefPdfBlob(currentBrief),
      );
      const reusedRetainedPdf = nextRetainedPdf === previousRetainedPdf;

      retainedPdf = nextRetainedPdf;
      if (!reusedRetainedPdf || !retainedPdfBrief) retainedPdfBrief = currentBrief;
      const submissionPayload = appendInitialProjectBriefPdf(
        payload,
        retainedPdf.blob,
        retainedPdf.filename,
      ).payload;

      submissionStage = "network";
      const response = await fetch(form.action, {
        method: "POST",
        body: submissionPayload,
        headers: { Accept: "text/html" },
      });
      if (!response.ok) throw new Error(`Submission failed with status ${response.status}`);

      completedBrief = retainedPdfBrief ?? currentBrief;
      submitted = true;
      form.hidden = true;
      success.hidden = false;
      renderPrintSummary(completedBrief);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
      requestAnimationFrame(() => control<HTMLElement>(success, "#submission-success-title").focus({ preventScroll: true }));
    } catch (error) {
      console.error("Initial project brief submission failed", error);
      if (error instanceof InitialProjectBriefPdfSizeError) {
        submissionErrorMessage.textContent = "The completed PDF was unexpectedly too large to send. Nothing has been lost. Please try again.";
      } else if (submissionStage === "pdf") {
        submissionErrorMessage.textContent = "Nothing has been lost. We couldn't prepare the PDF to send. Please try again.";
      }
      submissionError.hidden = false;
      submissionError.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "center" });
    } finally {
      submitting = false;
      if (!submitted) {
        submitButton.disabled = false;
        submitButton.textContent = "Send initial enquiry";
      }
    }
  }, { signal });

  downloadButton.addEventListener("click", async () => {
    if (!completedBrief || downloadButton.disabled) return;
    downloadButton.disabled = true;
    downloadButton.textContent = "Preparing PDF…";
    downloadStatus.textContent = "";
    try {
      if (!retainedPdf) {
        const payload = buildInitialProjectBriefNetlifyPayload(completedBrief);
        retainedPdf = await getOrCreateRetainedProjectBriefPdf(
          getInitialProjectBriefPayloadSignature(payload),
          completedBrief.contactName,
          null,
          () => createInitialProjectBriefPdfBlob(completedBrief!),
        );
        retainedPdfBrief = completedBrief;
      }
      downloadInitialProjectBriefPdfBlob(retainedPdf.blob, retainedPdf.filename);
      downloadStatus.textContent = "Your PDF copy has been downloaded.";
    } catch (error) {
      console.error("Initial project brief PDF generation failed", error);
      downloadStatus.textContent = "We couldn't create the PDF. You can still use the print option below.";
    } finally {
      downloadButton.disabled = false;
      downloadButton.textContent = "Download PDF copy";
    }
  }, { signal });

  printButton.addEventListener("click", () => {
    if (!completedBrief) return;
    document.body.classList.add("brief-printing");
    window.print();
    window.setTimeout(() => document.body.classList.remove("brief-printing"), 1000);
  }, { signal });

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("brief-printing");
  }, { signal });

  window.addEventListener("resize", () => {
    requestAnimationFrame(updateSegmentHighlights);
  }, { signal });

  document.addEventListener("astro:before-swap", () => {
    controller.abort();
    briefWindow.__initialProjectBriefController = undefined;
    document.body.classList.remove("brief-printing");
  }, { once: true, signal });

  syncConditionals();
  showStep("welcome", false);
};
