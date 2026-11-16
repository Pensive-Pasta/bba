function initStudioTabs() {
  const tabs = document.querySelectorAll(".tab");
  const sections = ["profile", "people", "values", "awards"];

  tabs.forEach((tab) => {
    if (tab.dataset.tabBound === "true") return;
    tab.dataset.tabBound = "true";
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");

      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          element.classList.toggle("hidden", section !== target);
        }
      });
    });
  });
}

// Initial run
document.addEventListener("astro:page-load", initStudioTabs);
document.addEventListener("astro:after-swap", initStudioTabs);
