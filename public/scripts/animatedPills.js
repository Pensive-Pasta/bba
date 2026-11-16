// Extracted from Work's original moveIndicatorTo: preserve the same measured
// width, two-pixel border offset, animation frame and transform transition.
/** @param {HTMLElement | null | undefined} btn */
export const moveIndicatorTo = (btn) => {
  const group = btn?.closest("[data-animated-pills]");
  const indicator = /** @type {HTMLElement | null | undefined} */ (group?.querySelector("[data-pill-indicator]"));
  if (!indicator || !btn || !group) return;

  const groupRect = group.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const offsetLeft = btnRect.left - groupRect.left;
  const offsetWidth = btnRect.width;

  return requestAnimationFrame(() => {
    indicator.style.width = `${offsetWidth}px`;
    indicator.style.transform = `translateX(${offsetLeft - 2}px)`;
  });
};

/** @param {HTMLElement} group */
export function initAnimatedPillGroup(group) {
  if (group.dataset.pillBound === "true") return;
  const buttons = /** @type {HTMLButtonElement[]} */ (Array.from(group.querySelectorAll("[data-pill-button]")));
  if (!buttons.length) return;
  group.dataset.pillBound = "true";
  const events = new AbortController();
  const { signal } = events;
  let frame;
  const position = () => {
    cancelAnimationFrame(frame);
    const active = buttons.find((button) => button.classList.contains("active-filter"));
    frame = moveIndicatorTo(active);
  };
  const activate = (button) => {
    buttons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active-filter", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    position();
  };
  buttons.forEach((button) => button.addEventListener("click", () => activate(button), { signal }));
  window.addEventListener("resize", position, { passive: true, signal });
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(position);
  observer?.observe(group);
  buttons.forEach((button) => observer?.observe(button));
  document.fonts?.ready.then(() => { if (!signal.aborted) position(); });
  activate(buttons.find((button) => button.classList.contains("active-filter")) || buttons[0]);

  const cleanup = () => {
    events.abort();
    observer?.disconnect();
    cancelAnimationFrame(frame);
    delete group.dataset.pillBound;
  };
  document.addEventListener("astro:before-swap", cleanup, { once: true, signal });
  return cleanup;
}

export function initAnimatedPills() {
  document.querySelectorAll("[data-animated-pills]").forEach((group) => initAnimatedPillGroup(/** @type {HTMLElement} */ (group)));
}

if (typeof document !== "undefined") {
  initAnimatedPills();
  document.addEventListener("astro:page-load", initAnimatedPills);
}
