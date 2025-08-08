function initInsightTabs() {
  const tabs = document.querySelectorAll(".insight-tab");
  const sections = ["all", "news", "projects", "thinking"];

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      // show / hide sections
      sections.forEach((section) => {
        const el = document.getElementById(`insight-${section}`);
        if (el) el.classList.toggle("hidden", section !== target);
      });

      // visual tab state
      tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("opacity-100", isActive);
        t.classList.toggle("opacity-50", !isActive);
      });
    });
  });
}

/* run on first load and after Astro SPA swaps */
document.addEventListener("DOMContentLoaded", initInsightTabs);
document.addEventListener("astro:page-load", initInsightTabs);
document.addEventListener("astro:after-swap", initInsightTabs);