(() => {
  if (window.__bbaHomeGrid) return;

  const selections = new WeakMap();
  const initialSaved = performance.getEntriesByType("navigation")[0]?.type === "back_forward"
    ? history.state?.bbaHomeProjects : undefined;
  let activeGrid;
  let stopReveal;

  function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const code = (value) => value.trim().toUpperCase();
  const repeats = (items) => items.slice(1).filter((item, i) => item.type === items[i].type).length;

  function select(mediaPool, postcodePool, saved) {
    // Restore just IDs from this history entry, checking them against this build.
    if (Array.isArray(saved?.media) && Array.isArray(saved?.postcodes)) {
      const media = saved.media.map((id) => mediaPool.find((item) => item.id === id));
      const postcodes = saved.postcodes.map((id) => postcodePool.find((item) => item._id === id));
      if (media.length === 6 && postcodes.length === 6 && media.every(Boolean) && postcodes.every(Boolean) &&
        new Set([...saved.media, ...saved.postcodes]).size === 12) return { media, postcodes };
    }

    let media = shuffle(mediaPool).slice(0, 6);
    if (media.length < 6) return;
    // Only rearrange the sampled six, so colour preferences cannot exclude projects.
    for (let attempt = 0; attempt < 16 && repeats(media) > 0; attempt++) {
      const candidate = shuffle(media);
      if (repeats(candidate) < repeats(media)) media = candidate;
    }

    const usedIds = new Set(media.map((item) => item.id));
    const usedCodes = new Set(media.map((item) => code(item.postCode)));
    const remaining = shuffle(postcodePool);
    const postcodes = [];
    // Prefer different visible labels; only relax that preference if necessary.
    for (const distinctCodes of [true, false]) {
      for (const project of remaining) {
        if (postcodes.length === 6) break;
        if (usedIds.has(project._id) || (distinctCodes && usedCodes.has(code(project.postCode)))) continue;
        postcodes.push(project);
        usedIds.add(project._id);
        usedCodes.add(code(project.postCode));
      }
    }
    if (postcodes.length === 6) return { media, postcodes };
  }

  function prepare(doc, saved) {
    try {
      const root = doc.querySelector("[data-home-projects]");
      const grid = root?.querySelector(".home-project-grid");
      if (!grid || grid.dataset.homeReady) return;
      // Mark even a fallback as ready: never retry a visible grid later in the visit.
      grid.dataset.homeReady = "true";
      const slots = [...grid.children];
      if (slots.length !== 12 || slots.filter((slot) => slot.dataset.homeSlot === "media").length !== 6) return;
      const mediaPool = [...root.querySelectorAll("template[data-home-media]")].map((template) => ({
        id: template.dataset.projectId,
        postCode: template.dataset.postcode,
        type: template.dataset.projectType,
        template,
      }));
      const postcodePool = JSON.parse(root.querySelector("[data-home-postcodes]").textContent);
      const selection = select(mediaPool, postcodePool, saved);
      if (!selection) return;

      let mediaIndex = 0, postcodeIndex = 0;
      const cells = slots.map((slot) => {
        if (slot.dataset.homeSlot === "media") {
          const project = selection.media[mediaIndex++];
          const cell = doc.importNode(project.template.content.firstElementChild, true);
          // The no-JS editorial cards stay visible; only selected image tiles fade.
          cell.querySelectorAll("[data-project-tile]").forEach((tile) => {
            tile.classList.add("opacity-0", "pointer-events-none", "transition-opacity", "duration-[2000ms]");
          });
          return cell;
        }
        const project = selection.postcodes[postcodeIndex++];
        const cell = slot.cloneNode(true);
        cell.dataset.projectId = project._id;
        cell.querySelector("[data-home-postcode-label]").textContent = project.postCode;
        return cell;
      });
      grid.replaceChildren(...cells);
      selections.set(grid, {
        media: selection.media.map((project) => project.id),
        postcodes: selection.postcodes.map((project) => project._id),
      });
    } catch {
      // Missing or stale pool data leaves the usable editorial grid in place.
    } finally {
      doc.documentElement.removeAttribute("data-home-grid-pending");
    }
  }

  function activate() {
    const grid = document.querySelector(".home-project-grid");
    if (!grid) return;
    const selection = selections.get(grid);
    try {
      // ClientRouter must initialise its own history state first.
      if (selection && Number.isFinite(history.state?.index)) {
        history.replaceState({ ...history.state, bbaHomeProjects: selection }, "");
      }
    } catch { /* Restricted history must not prevent selection or reveal. */ }
    if (activeGrid === grid) return;
    stopReveal?.();
    activeGrid = grid;
    const tiles = [...grid.querySelectorAll("[data-project-tile]")].filter((tile) => tile.classList.contains("opacity-0"));
    if (!tiles.length) return;

    const events = new AbortController();
    let triggered = false, frame = 0;
    const fire = () => {
      if (triggered) return;
      triggered = true;
      clearTimeout(timer);
      events.abort();
      frame = requestAnimationFrame(() => tiles.forEach((tile) => {
        tile.classList.remove("opacity-0", "pointer-events-none");
        tile.classList.add("opacity-100");
      }));
    };
    for (const name of ["scroll", "wheel", "touchmove"]) {
      window.addEventListener(name, fire, { passive: true, signal: events.signal });
    }
    const timer = setTimeout(fire, 3000);
    stopReveal = () => { clearTimeout(timer); cancelAnimationFrame(frame); events.abort(); };
  }

  const initialise = (doc = document) => { prepare(doc, initialSaved); if (doc === document) activate(); };
  window.__bbaHomeGrid = { initialise };
  if (location.pathname === "/") document.documentElement.setAttribute("data-home-grid-pending", "");
  document.addEventListener("DOMContentLoaded", () => initialise());
  document.addEventListener("astro:before-swap", (event) => {
    stopReveal?.();
    activeGrid = undefined;
    prepare(event.newDocument, event.navigationType === "traverse" ? history.state?.bbaHomeProjects : undefined);
  });
  document.addEventListener("astro:after-swap", activate);
  document.addEventListener("astro:page-load", activate);
  window.addEventListener("pagehide", () => { stopReveal?.(); activeGrid = undefined; });
  window.addEventListener("pageshow", activate);
})();
