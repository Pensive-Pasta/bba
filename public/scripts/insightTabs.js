function initInsightTabs() {
  const tabs = document.querySelectorAll(".insight-tab");
  const sections = ["all", "news", "projects", "thinking"];

  tabs.forEach((tab) => {
    if (tab.dataset.tabBound === "true") return;
    tab.dataset.tabBound = "true";
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      // show / hide sections
      sections.forEach((section) => {
        const el = document.getElementById(`insight-${section}`);
        if (el) el.classList.toggle("hidden", section !== target);
      });
    });
  });
}

/* run on first load and after Astro SPA swaps */
document.addEventListener("DOMContentLoaded", initInsightTabs);
document.addEventListener("astro:page-load", initInsightTabs);
document.addEventListener("astro:after-swap", initInsightTabs);
