function initStudioTabs() {
  const tabs = document.querySelectorAll(".tab");
  const sections = ["profile", "people", "values", "awards"];

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");

      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          element.classList.toggle("hidden", section !== target);
        }
      });

      tabs.forEach((t) => {
        t.classList.toggle("opacity-50", t === tab);
        t.classList.toggle("opacity-100", t !== tab);
      });
    });
  });
}

// Initial run
document.addEventListener("astro:page-load", initStudioTabs);
document.addEventListener("astro:after-swap", initStudioTabs);
