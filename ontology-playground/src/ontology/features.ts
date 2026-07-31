import type { FeatureState, Ontology } from "./types.ts";

// Reading a `FeatureState` is always defaulting: it arrives from a URL hash written by an
// older build, from an ontology that has since gained a feature, or from an ontology switch
// that hasn't run yet. Rather than making every caller (the strip, each `toMermaid`) handle
// "missing", everything reads through the accessors here, which fall back to the ontology's
// declared defaults.

/** The state an ontology's features have when nothing has been chosen yet. */
export function defaultFeatureState(ontology: Ontology): FeatureState {
  return resolveFeatures(ontology, {});
}

/**
 * Fill in whatever a partial state leaves out, and drop what the ontology doesn't declare:
 * every feature gets a valid option, and every param of that feature a valid value. Params
 * of *other* options are resolved too, so switching option and back remembers what was set.
 */
export function resolveFeatures(ontology: Ontology, state: FeatureState): FeatureState {
  const resolved: FeatureState = {};
  for (const feature of ontology.features) {
    const current = state[feature.id];
    const option = feature.options.some((o) => o.id === current?.option)
      ? (current?.option as string)
      : feature.defaultOption;

    const params: Record<string, string> = {};
    for (const param of feature.params ?? []) {
      const value = current?.params?.[param.id];
      params[param.id] = param.options.some((o) => o.id === value)
        ? (value as string)
        : param.defaultOption;
    }

    resolved[feature.id] = (feature.params?.length ?? 0) > 0 ? { option, params } : { option };
  }
  return resolved;
}

/**
 * The option a feature is on. Renderers call this rather than indexing `state` so an absent
 * or stale entry reads as the default instead of as `undefined`.
 */
export function featureOption(state: FeatureState, featureId: string, fallback: string): string {
  return state[featureId]?.option ?? fallback;
}

/** The value of one of a feature's params, defaulting the same way. */
export function featureParam(
  state: FeatureState,
  featureId: string,
  paramId: string,
  fallback: string,
): string {
  return state[featureId]?.params?.[paramId] ?? fallback;
}

/** Whether a param says anything while its feature sits on `option`. */
export function paramApplies(param: { onlyForOptions?: string[] }, option: string): boolean {
  return param.onlyForOptions === undefined || param.onlyForOptions.includes(option);
}
