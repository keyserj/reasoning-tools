// Ids for things the example didn't name with `&`.
//
// They're derived from content rather than counted, because examples/*.views.json is committed
// and keyed by id: a counter renumbers every id below an inserted line, burying the change that
// actually happened. Content-derived ids only move when their content moves, so a renamed node
// reads as a rename in the diff. A content hash would be stabler still, and unreadable.

const MAX_SLUG_LENGTH = 40;

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
  return slug === "" ? "unnamed" : slug;
}

export function edgeIdBase(sourceId: string, type: string, targetId: string): string {
  return `${sourceId}--${slugify(type)}--${targetId}`;
}

/** An implied claim is named after what it stands behind, so the pair reads as a pair. */
export function impliedClaimId(referentId: string): string {
  return `${referentId}--implied`;
}

export interface Allocation {
  id: string;
  /** true when `base` was taken and a suffix had to be added */
  collided: boolean;
}

/**
 * Take `base`, or the first free `base-2`, `base-3`, ... A collision is worth telling the author
 * about: the suffix is the one part of an id that depends on document order, so it shifts when a
 * line is inserted above, which is exactly what content-derived ids are here to avoid.
 */
export function allocateId(used: Set<string>, base: string): Allocation {
  if (!used.has(base)) {
    used.add(base);
    return { id: base, collided: false };
  }
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix++;
  const id = `${base}-${suffix}`;
  used.add(id);
  return { id, collided: true };
}
