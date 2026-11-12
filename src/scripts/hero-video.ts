// Adopt the browser-selected source; keep one video across responsive changes.
export function initHeroVideo(root: HTMLElement) {
  const video = root.querySelector<HTMLVideoElement>("video");
  const button = root.querySelector<HTMLButtonElement>("[data-hero-playback]");
  if (!video || !button || root.dataset.videoReady) return;
  root.dataset.videoReady = "true";

  const events = new AbortController();
  const options = { signal: events.signal };
  const desktop = matchMedia("(min-width: 768px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const expectedSource = () => reduced.matches ? "" :
    (desktop.matches ? root.dataset.desktopVideo : root.dataset.mobileVideo) || "";
  let selected = video.currentSrc || Array.from(video.querySelectorAll("source"))
    .find((source) => source.src === expectedSource())?.src || "";
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
    const hasSource = video!.hasAttribute("src") || Boolean(video!.querySelector("source"));
    video!.removeAttribute("src");
    video!.querySelectorAll("source").forEach((source) => source.remove());
    if (hasSource) {
      video!.load();
    }
  }

  async function play() {
    if (!selected || reduced.matches || userPaused || blocked || !inView || document.hidden) return;
    if (!video!.paused) return;
    const attempt = generation;
    if (!video!.hasAttribute("src") && !video!.querySelector("source")) {
      video!.muted = true;
      video!.src = selected;
    }
    try {
      await video!.play();
    } catch {
      if (attempt !== generation) return;
      // Autoplay rejection keeps the video's own first frame and a Play button.
      blocked = true;
      label();
    }
  }

  function update() {
    const next = expectedSource();
    if (next !== selected) {
      unload();
      selected = next;
      blocked = false;
      delete root.dataset.videoFallback;
    }
    button!.hidden = !selected;
    if (!inView || document.hidden || userPaused || !selected) {
      generation++;
      video!.pause();
    } else void play();
    revealFrame();
    label();
  }

  function revealFrame() {
    if (!selected || reduced.matches || root.dataset.videoFallback || video!.readyState < 2) return;
    video!.classList.remove("opacity-0");
  }

  video.addEventListener("loadeddata", revealFrame, options);
  video.addEventListener("playing", () => {
    // A late event after a resize/preference change must not reveal stale media.
    if (!selected || reduced.matches || !inView || document.hidden || userPaused) {
      video.pause();
      return;
    }
    revealFrame();
    label();
  }, options);
  video.addEventListener("pause", label, options);
  function showFallback() {
    if (!selected) return;
    blocked = true;
    root.dataset.videoFallback = "true";
    unload();
    label();
  }
  video.addEventListener("error", (event) => {
    if (event.target !== video && (event.target as HTMLSourceElement).src !== selected) return;
    showFallback();
  }, { ...options, capture: true });
  button.addEventListener("click", () => {
    userPaused = !video.paused;
    if (userPaused) {
      generation++;
      video.pause();
    }
    else {
      blocked = false;
      delete root.dataset.videoFallback;
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
  // A cached failed response can arrive before the component script runs.
  if (video.error && selected) showFallback();
  update();
}
