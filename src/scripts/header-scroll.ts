export interface HeaderScrollState {
  y: number;
  direction: number;
  distance: number;
  hidden: boolean;
}

export const initialHeaderScrollState = (y = 0): HeaderScrollState => ({
  y: Math.max(0, y), direction: 0, distance: 0, hidden: false,
});

// Accumulate travel in one direction, rather than toggling on tiny wheel/touch
// movements. A reversal resets the threshold; top/menu/focus always win.
export function nextHeaderScrollState(
  state: HeaderScrollState,
  y: number,
  headerHeight: number,
  locked = false,
): HeaderScrollState {
  const current = Math.max(0, y);
  if (locked || current <= headerHeight) return initialHeaderScrollState(current);
  const delta = current - state.y;
  if (!delta) return state;
  const direction = Math.sign(delta);
  const distance = direction === state.direction ? state.distance + Math.abs(delta) : Math.abs(delta);
  return {
    y: current, direction, distance,
    hidden: distance >= 12 ? direction > 0 : state.hidden,
  };
}

export function initHeaderScroll(header: HTMLElement) {
  const events = new AbortController();
  const { signal } = events;
  let frame = 0;
  let height = 0;
  let state = initialHeaderScrollState(window.scrollY);
  const position = () => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(maximum, window.scrollY));
  };
  const menuOpen = () => header.querySelector("#menu-toggle")?.getAttribute("aria-expanded") === "true";
  const update = () => {
    frame = 0;
    if (signal.aborted) return;
    state = nextHeaderScrollState(state, position(), height, menuOpen() || Boolean(header.querySelector(":focus-visible")));
    header.toggleAttribute("data-scroll-hidden", state.hidden);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    // Only the existing bar contributes to sticky flow height; the fixed menu
    // stays out of flow and can never enlarge this measurement.
    const next = header.getBoundingClientRect().height;
    if (next > 0 && next !== height) {
      height = next;
      document.documentElement.style.setProperty("--site-header-height", `${height}px`);
    }
    update();
  };
  const reveal = () => {
    state = initialHeaderScrollState(position());
    header.removeAttribute("data-scroll-hidden");
  };
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
  observer?.observe(header);
  window.addEventListener("scroll", schedule, { passive: true, signal });
  window.addEventListener("resize", measure, { passive: true, signal });
  header.addEventListener("focusin", reveal, { signal });
  header.addEventListener("bba:menu-state", reveal, { signal });
  measure();
  const cleanup = () => {
    events.abort();
    observer?.disconnect();
    cancelAnimationFrame(frame);
    frame = 0;
  };
  document.addEventListener("astro:before-swap", cleanup, { once: true, signal });
  return cleanup;
}
