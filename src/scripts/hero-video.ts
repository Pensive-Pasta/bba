// One element and one selected source: no duplicate desktop/mobile downloads.
export function initHeroVideo(root: HTMLElement) {
  const video = root.querySelector<HTMLVideoElement>("video");
  const button = root.querySelector<HTMLButtonElement>("[data-hero-playback]");
  if (!video || !button || root.dataset.videoReady) return;
  root.dataset.videoReady = "true";

  const events = new AbortController();
  const options = { signal: events.signal };
  const desktop = matchMedia("(min-width: 768px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let selected = "";
  let inView = !("IntersectionObserver" in window);
  let userPaused = false;
  let blocked = false;
  let generation = 0;

  function label() {
    const playing = !video!.paused;
    button!.textContent = playing ? "Pause video" : "Play video";
    button!.setAttribute("aria-label", playing ? "Pause background video" : "Play background video");
  }

  function unload() {
    generation++;
    video!.pause();
    video!.classList.add("opacity-0");
    if (video!.hasAttribute("src")) {
      video!.removeAttribute("src");
      video!.load();
    }
  }

  async function play() {
    if (!selected || reduced.matches || userPaused || blocked || !inView || document.hidden) return;
    if (!video!.paused) return;
    const attempt = generation;
    if (!video!.hasAttribute("src")) {
      video!.muted = true;
      video!.src = selected;
    }
    try {
      await video!.play();
    } catch {
      if (attempt !== generation) return;
      // Keep the still visible; a deliberate button press can retry playback.
      blocked = true;
      video!.classList.add("opacity-0");
      label();
    }
  }

  function update() {
    const next = reduced.matches ? "" :
      (desktop.matches ? root.dataset.desktopVideo : root.dataset.mobileVideo) || "";
    if (next !== selected) {
      unload();
      selected = next;
      blocked = false;
    }
    const poster = desktop.matches ? root.dataset.desktopPoster : root.dataset.mobilePoster;
    if (poster) video!.poster = poster;
    else video!.removeAttribute("poster");
    button!.hidden = !selected;
    if (!inView || document.hidden || userPaused || !selected) {
      generation++;
      video!.pause();
    } else void play();
    label();
  }

  video.addEventListener("playing", () => {
    // A late event after a resize/preference change must not reveal stale media.
    if (!selected || reduced.matches || !inView || document.hidden || userPaused) {
      video.pause();
      return;
    }
    video.classList.remove("opacity-0");
    label();
  }, options);
  video.addEventListener("pause", label, options);
  video.addEventListener("error", () => {
    if (!video.hasAttribute("src")) return;
    blocked = true;
    unload();
    label();
  }, options);
  button.addEventListener("click", () => {
    userPaused = !video.paused;
    if (userPaused) {
      generation++;
      video.pause();
    }
    else {
      blocked = false;
      void play();
    }
    label();
  }, options);
  desktop.addEventListener("change", update, options);
  reduced.addEventListener("change", update, options);
  document.addEventListener("visibilitychange", update, options);

  const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    update();
  }) : undefined;
  observer?.observe(root);
  document.addEventListener("astro:before-swap", () => {
    observer?.disconnect();
    events.abort();
    unload();
    delete root.dataset.videoReady;
  }, { once: true, signal: events.signal });
  update();
}
