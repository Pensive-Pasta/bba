export default function initSmoothScroll() {
  let fired = false;

  function onScroll() {
    const link = document.querySelector("a[data-target]");
    const targetId = link?.getAttribute("data-target");
    if (!targetId) return;

    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    const y = window.scrollY;

    if (!fired && y > 10) {
      fired = true;
      targetEl.scrollIntoView({ behavior: "smooth" });
    }

    if (fired && y < 10) {
      fired = false;
    }
  }

  // Bind and cleanup
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  document.addEventListener("astro:before-swap", () => {
    window.removeEventListener("scroll", onScroll);
    fired = false;
  });
}