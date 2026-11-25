const initProjectToggle = () => {
  const btn = document.getElementById("index-toggle");
  const grid = document.querySelector(".project-grid");
  const indexTable = document.getElementById("project-index");
  const filterBtns = document.querySelectorAll(".filter-btn");

  if (!btn || !grid || !indexTable || btn.dataset.bound) return;

  btn.dataset.bound = "true";

  const resetView = () => {
    grid.classList.remove("hidden");
    indexTable.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Show project index");
  };

  resetView();

  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 300);
    const isShowingIndex = indexTable.classList.contains("hidden");
    btn.setAttribute("aria-expanded", String(isShowingIndex));
    btn.setAttribute("aria-label", isShowingIndex ? "Show project grid" : "Show project index");

    if (isShowingIndex) {
      grid.classList.replace("opacity-100", "opacity-0");
      setTimeout(() => grid.classList.add("hidden"), 300);

      indexTable.classList.remove("hidden");
      requestAnimationFrame(() => {
        indexTable.classList.replace("opacity-0", "opacity-100");
      });

      // swap labels
      swapToggleLabels(btn, "index", "grid");
    } else {
      indexTable.classList.replace("opacity-100", "opacity-0");
      setTimeout(() => {
        indexTable.classList.add("hidden");
        grid.classList.remove("opacity-0", "hidden");
        grid.classList.add("opacity-100");
      }, 300);

      // swap labels
      swapToggleLabels(btn, "grid", "index");
    }
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      updateFilter(type);
    });
  });

  const updateFilter = (type) => {
    grid.dataset.projectFilter = type;
    document.querySelectorAll(".project-grid .card").forEach((card) => {
      const cardType = card.dataset.type;
      if (type === "both") {
        card.classList.remove("hidden");
      } else {
        card.classList.toggle("hidden", cardType !== type);
      }
    });
    document.querySelectorAll("#project-index tbody tr").forEach((row) => {
      row.classList.toggle("hidden", type !== "both" && row.dataset.type !== type);
    });
  };

  updateFilter("both");
};

const swapToggleLabels = (btn, from, to) => {
  const fromLabel = btn.querySelector(`#label-${from}`);
  const toLabel = btn.querySelector(`#label-${to}`);

  fromLabel.classList.replace("opacity-100", "opacity-0");
  setTimeout(() => {
    // Both labels share a grid cell, so the widest always reserves its space.
    fromLabel.classList.add("invisible");
    toLabel.classList.remove("invisible");

    requestAnimationFrame(() => {
      toLabel.classList.replace("opacity-0", "opacity-100");
    });
  }, 300);
};

const initIndexSort = () => {
  const buttons = document.querySelectorAll("#project-index [data-sort-column]");
  buttons.forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const heading = button.closest("th");
      const descending = heading?.getAttribute("aria-sort") === "ascending";
      const column = Number(button.dataset.sortColumn);
      const rows = Array.from(
        document.querySelectorAll("#project-index tbody tr")
      );
      const sorted = rows.sort((a, b) => {
        const textA =
          a.children[column]?.textContent.trim().toLowerCase() || "";
        const textB =
          b.children[column]?.textContent.trim().toLowerCase() || "";
        return (descending ? textB.localeCompare(textA, undefined, { numeric: true }) : textA.localeCompare(textB, undefined, { numeric: true }));
      });

      const tbody = document.querySelector("#project-index tbody");
      if (tbody) {
        sorted.forEach((row) => tbody.appendChild(row));
      }

      buttons.forEach((other) => {
        const active = other === button;
        other.closest("th")?.setAttribute("aria-sort", active ? descending ? "descending" : "ascending" : "none");
        const icon = other.querySelector(".chevron-icon");
        if (icon) icon.style.transform = active && descending ? "rotate(180deg)" : "rotate(0deg)";
      });
    });
  });
};

if (document.readyState !== "loading") {
  initProjectToggle();
  initIndexSort();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    initProjectToggle();
    initIndexSort();
  });
}

document.addEventListener("astro:page-load", initProjectToggle);
document.addEventListener("astro:after-swap", initIndexSort);
