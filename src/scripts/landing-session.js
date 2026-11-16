(() => {
  const key = "bba-landing-entered";
  let stored = false;
  try { stored = sessionStorage.getItem(key) === "1"; } catch { /* Storage may be disabled. */ }
  const navigation = performance.getEntriesByType("navigation")[0];
  const entered = Boolean(window.__bbaLanding?.entered || stored || history.state?.bbaLandingEntered);
  const show = !entered && location.pathname === "/" && !location.hash && navigation?.type !== "back_forward";
  window.__bbaLanding = {
    entered: entered || !show,
    enter() {
      this.entered = true;
      try { sessionStorage.setItem(key, "1"); } catch { /* Memory/history remain useful. */ }
      // Do not create a partial state before ClientRouter initialises its index.
      try {
        if (Number.isFinite(history.state?.index)) history.replaceState({ ...history.state, bbaLandingEntered: true }, "");
      } catch { /* Restricted history must not prevent entry. */ }
    },
  };
  document.documentElement.toggleAttribute("data-bba-landing", show);
  if (show) document.documentElement.setAttribute("data-bba-landing", "open");
  else window.__bbaLanding.enter();
  if (!window.__bbaLandingNavigationBound) {
    window.__bbaLandingNavigationBound = true;
    document.addEventListener("astro:page-load", () => {
      if (window.__bbaLanding.entered) window.__bbaLanding.enter();
    });
    document.addEventListener("astro:before-swap", (event) => {
      window.__bbaLanding.enter();
      event.newDocument.documentElement.removeAttribute("data-bba-landing");
    });
  }
})();
