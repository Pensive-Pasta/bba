export class ProjectVideoPreview extends HTMLElement {
  private cleanup?: () => void;

  connectedCallback() {
    if (this.cleanup) return;
    const card = this.closest<HTMLAnchorElement>("a.project-card");
    const video = this.querySelector<HTMLVideoElement>("video");
    const url = this.dataset.videoUrl;
    if (!card || !video || !url) return;

    const events = new AbortController();
    const { signal } = events;
    const hover = matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let visible = !("IntersectionObserver" in window);
    let hovered = card.matches(":hover");
    let focused = card.contains(document.activeElement);
    let failed = false;
    let generation = 0;
    const enabled = () => hover.matches && !reduced.matches && !connection?.saveData;
    const wantsPlayback = () => enabled() && visible && !document.hidden && (hovered || focused);

    const showFrame = () => {
      if (!wantsPlayback() || failed || video.readyState < 2 || video.paused) return;
      video.classList.remove("opacity-0");
    };
    const unload = () => {
      generation++;
      video.pause();
      video.classList.add("opacity-0");
      if (video.hasAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
    };
    const update = () => {
      if (!enabled()) { unload(); return; }
      if (wantsPlayback() && !failed && !video.hasAttribute("src")) {
        video.muted = true;
        video.src = url;
      }
      if (wantsPlayback() && !failed) {
        if (!video.paused) return;
        const attempt = ++generation;
        void video.play().catch(() => {
          if (signal.aborted || attempt !== generation) return;
          // A blocked preview keeps the hero image and the normal project link.
          video.pause();
          video.classList.add("opacity-0");
        });
      } else {
        generation++;
        video.pause();
        video.classList.add("opacity-0");
        if (video.readyState >= 1 && video.currentTime > 0) video.currentTime = 0;
      }
    };

    video.addEventListener("playing", () => {
      if (!wantsPlayback()) { video.pause(); video.classList.add("opacity-0"); return; }
      showFrame();
    }, { signal });
    video.addEventListener("error", () => {
      if (!video.hasAttribute("src")) return;
      failed = true;
      unload();
    }, { signal });
    card.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      hovered = true; update();
    }, { signal });
    card.addEventListener("pointerleave", () => { hovered = false; update(); }, { signal });
    card.addEventListener("focusin", () => { focused = true; update(); }, { signal });
    card.addEventListener("focusout", (event) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      focused = false; update();
    }, { signal });
    hover.addEventListener("change", update, { signal });
    reduced.addEventListener("change", update, { signal });
    connection?.addEventListener("change", update, { signal });
    document.addEventListener("visibilitychange", update, { signal });
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }) : undefined;
    observer?.observe(card);
    this.cleanup = () => { observer?.disconnect(); events.abort(); unload(); };
    update();
  }

  disconnectedCallback() {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

if (!customElements.get("bba-video-preview")) customElements.define("bba-video-preview", ProjectVideoPreview);
