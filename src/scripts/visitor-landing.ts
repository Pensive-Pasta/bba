import { initHeroVideo } from "./hero-video.ts";

type LandingWindow = Window & { __bbaLanding?: { entered: boolean; enter(): void } };

export function setupVisitorLanding() {
  const overlay = document.querySelector<HTMLElement>("[data-bba-landing-overlay]");
  if (!overlay || overlay.dataset.bound) return;
  overlay.dataset.bound = "true";
  if (!document.documentElement.hasAttribute("data-bba-landing")) { overlay.remove(); return; }
  const entry = overlay.querySelector<HTMLButtonElement>("[data-landing-entry]");
  if (!entry) { document.documentElement.removeAttribute("data-bba-landing"); overlay.remove(); return; }
  const events = new AbortController();
  const { signal } = events;
  const background = Array.from(document.body.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child !== overlay && child.tagName !== "SCRIPT" && child.tagName !== "STYLE");
  const inertStates = background.map((element) => element.inert);
  background.forEach((element) => { element.inert = true; });
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  const media = overlay.querySelector<HTMLElement>("[data-landing-media]");
  const disposeVideo = media ? initHeroVideo(media) : undefined;
  entry.focus({ preventScroll: true });
  let exiting = false;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  const restore = () => {
    clearTimeout(fadeTimer);
    disposeVideo?.();
    background.forEach((element, index) => { element.inert = inertStates[index]; });
    document.documentElement.removeAttribute("data-bba-landing");
    overlay.remove();
    events.abort();
  };
  const enter = () => {
    if (exiting) return;
    exiting = true;
    (window as LandingWindow).__bbaLanding?.enter();
    document.documentElement.setAttribute("data-bba-landing", "leaving");
    overlay.classList.add("is-exiting");
    const complete = () => {
      restore();
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
      else {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          const previous = heading.getAttribute("tabindex");
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
          if (previous === null) heading.removeAttribute("tabindex");
          else heading.setAttribute("tabindex", previous);
        }
      }
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) complete();
    else fadeTimer = setTimeout(complete, 310); // Dismissal only; never timed entry.
  };
  entry.addEventListener("click", enter, { signal });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); enter(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button")).filter((button) => !button.hidden);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }, { signal });
  document.addEventListener("astro:before-swap", restore, { once: true, signal });
  window.addEventListener("pagehide", () => {
    (window as LandingWindow).__bbaLanding?.enter();
    restore();
  }, { once: true, signal });
}
