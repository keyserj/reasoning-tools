import type { Size } from "./shapes.ts";

/**
 * Worn by a label in the diagram and by its stand-in here, so the two can't size text differently;
 * if they did, text would spill out of its box. Styled in ./label.css.
 */
export const LABEL_CLASS = "diagram-label";

/** Typing mints a new label per keystroke, so the cache would otherwise only grow. */
const CACHE_LIMIT = 5000;

const cache = new Map<string, Size>();
let host: HTMLDivElement | null = null;

function createHost(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  // Laid out, so it can be measured, but never seen. Wide, so no label's width is capped by it
  // before its own `max-width` applies; fixed and clipped, so that width never scrolls the page.
  el.style.cssText =
    "position:fixed;top:0;left:0;width:10000px;height:0;overflow:hidden;visibility:hidden;pointer-events:none;contain:strict";
  document.body.append(el);
  return el;
}

/**
 * Sizes for the given label texts, in order, measured in one forced layout: every label not seen
 * before is written into the host, then all of them are read.
 */
export function measureLabels(texts: string[]): Size[] {
  const missing = [...new Set(texts.filter((text) => !cache.has(text)))];
  if (missing.length > 0) {
    if (cache.size + missing.length > CACHE_LIMIT) cache.clear();
    host ??= createHost();
    const els = missing.map((text) => {
      const el = document.createElement("div");
      el.className = LABEL_CLASS;
      el.textContent = text;
      return el;
    });
    host.replaceChildren(...els);
    els.forEach((el, i) => {
      const { width, height } = el.getBoundingClientRect();
      cache.set(missing[i], { width, height });
    });
    host.replaceChildren();
  }
  return texts.map((text) => cache.get(text)!);
}
