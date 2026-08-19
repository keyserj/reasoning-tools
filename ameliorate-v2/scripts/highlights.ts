// The agenda pane's "Hottest Details": what to point a reader at first, and the pills that
// narrow it. `UX-design.md` asks for a combined top 5 plus a top 5 per filter, all off the same
// judgement, which ./ranking.ts makes once.

import type { Doc } from "./model.ts";
import { type Ranked, type Signal, rank } from "./ranking.ts";

export interface Highlights {
  /** the combined list, hottest first */
  top: Ranked[];
  /** a separate top-`limit` per pill over the whole ranking; an item appears under every pill it qualifies for */
  byCategory: Record<Signal, Ranked[]>;
}

const DEFAULT_LIMIT = 5;

export function highlights(doc: Doc, limit = DEFAULT_LIMIT): Highlights {
  const ranked = rank(doc);
  const inCategory = (signal: Signal): Ranked[] =>
    ranked
      .filter((item) => item.categories.includes(signal))
      // within a pill, rank by that signal rather than by the strongest of the three
      .sort((a, b) => b.signals[signal] * b.reach - a.signals[signal] * a.reach)
      .slice(0, limit);

  return {
    top: ranked.slice(0, limit),
    byCategory: {
      "change-importance": inCategory("change-importance"),
      controversy: inCategory("controversy"),
      unknown: inCategory("unknown"),
    },
  };
}
