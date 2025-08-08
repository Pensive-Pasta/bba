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
    document.querySelector(".filter-toggle-group")?.classList.remove("hidden");
  };

  resetView();

  btn.addEventListener("click", () => {
    const isShowingIndex = indexTable.classList.contains("hidden");
    const filterGroup = document.querySelector(".filter-toggle-group");

    if (isShowingIndex) {
      grid.classList.replace("opacity-100", "opacity-0");
      setTimeout(() => grid.classList.add("hidden"), 300);

      indexTable.classList.remove("hidden");
      requestAnimationFrame(() => {
        indexTable.classList.replace("opacity-0", "opacity-100");
      });

      filterGroup?.classList.add("invisible");

      // swap labels
      swapToggleLabels(btn, "index", "grid");
    } else {
      indexTable.classList.replace("opacity-100", "opacity-0");
      setTimeout(() => {
        indexTable.classList.add("hidden");
        grid.classList.remove("opacity-0", "hidden");
        grid.classList.add("opacity-100");
        filterGroup?.classList.remove("invisible");
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
    filterBtns.forEach((b) => b.classList.remove("active-filter"));
    document
      .querySelector(`.filter-btn[data-type="${type}"]`)
      ?.classList.add("active-filter");

    document.querySelectorAll(".project-grid .card").forEach((card) => {
      const cardType = card.dataset.type;
      if (type === "both") {
        card.classList.remove("hidden");
      } else {
        card.classList.toggle("hidden", cardType !== type);
      }
    });

    moveIndicatorTo(document.querySelector(`.filter-btn[data-type="${type}"]`));
  };

  updateFilter("both");
  moveIndicatorTo(document.querySelector(`.filter-btn[data-type="both"]`));

  window.addEventListener("resize", () => {
    const activeBtn = document.querySelector(".filter-btn.active-filter");
    if (activeBtn) moveIndicatorTo(activeBtn);
  });
};

const moveIndicatorTo = (btn) => {
  const indicator = document.getElementById("filter-indicator");
  if (!indicator || !btn) return;

  const group = btn.closest(".filter-toggle-group");
  const groupRect = group.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const offsetLeft = btnRect.left - groupRect.left;
  const offsetWidth = btnRect.width;

  requestAnimationFrame(() => {
    indicator.style.width = `${offsetWidth}px`;
    indicator.style.transform = `translateX(${offsetLeft - 2}px)`;
  });
};

const swapToggleLabels = (btn, from, to) => {
  const fromLabel = btn.querySelector(`#label-${from}`);
  const toLabel = btn.querySelector(`#label-${to}`);

  fromLabel.classList.replace("opacity-100", "opacity-0");
  setTimeout(() => {
    fromLabel.classList.add("hidden");
    toLabel.classList.remove("hidden");

    requestAnimationFrame(() => {
      toLabel.classList.replace("opacity-0", "opacity-100");
    });
  }, 300);
};

const initIndexSort = () => {
  const chevrons = document.querySelectorAll("#project-index .chevron-icon");
  let isAlphaSort = true;

  chevrons.forEach((chevron) => {
    chevron.closest("th")?.addEventListener("click", () => {
      const rows = Array.from(
        document.querySelectorAll("#project-index tbody tr")
      );
      const sorted = rows.sort((a, b) => {
        const textA =
          a.querySelector("td")?.innerText.trim().toLowerCase() || "";
        const textB =
          b.querySelector("td")?.innerText.trim().toLowerCase() || "";
        return isAlphaSort
          ? textB.localeCompare(textA)
          : textA.localeCompare(textB);
      });

      const tbody = document.querySelector("#project-index tbody");
      if (tbody) {
        tbody.innerHTML = "";
        sorted.forEach((row) => tbody.appendChild(row));
      }

      chevrons.forEach((icon) => {
        icon.style.transform = isAlphaSort ? "rotate(180deg)" : "rotate(0deg)";
      });

      isAlphaSort = !isAlphaSort;
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
