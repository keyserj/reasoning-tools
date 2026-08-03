import { useState } from "react";
import type { FeatureDef, FeatureState } from "../ontology/types.ts";
import { paramApplies } from "../ontology/features.ts";

// Renders an ontology's rendering lenses generically: one pill per feature reading
// `feature: current option`, opening a panel where that feature's options get read and picked.
// Nothing here knows what a feature *means* — an ontology declares the table (see
// arg-map-truth-and-relevance/features.ts) and only its `toMermaid` gives an option effect.
//
// One pill and one open panel per feature is what keeps the strip bounded.
//
// An ontology with no features renders no strip at all, which is IBIS today.

interface Props {
  features: FeatureDef[];
  state: FeatureState;
  onChange: (state: FeatureState) => void;
}

export default function RenderingStrip({ features, state, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (features.length === 0) return null;

  const optionOf = (feature: FeatureDef) => state[feature.id]?.option ?? feature.defaultOption;

  const setOption = (feature: FeatureDef, option: string) =>
    onChange({ ...state, [feature.id]: { ...state[feature.id], option } });

  const setParam = (feature: FeatureDef, paramId: string, value: string) =>
    onChange({
      ...state,
      [feature.id]: {
        option: optionOf(feature),
        params: { ...state[feature.id]?.params, [paramId]: value },
      },
    });

  const labelOf = (feature: FeatureDef, optionId: string) =>
    feature.options.find((o) => o.id === optionId)?.label ?? optionId;

  const open = features.find((feature) => feature.id === openId);

  return (
    <div className="border-b border-base-300 bg-base-200 text-xs">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1">
        {features.map((feature) => {
          const isOpen = feature.id === openId;
          return (
            <button
              key={feature.id}
              className={`btn btn-xs font-normal ${isOpen ? "btn-active" : "btn-ghost"}`}
              onClick={() => setOpenId((id) => (id === feature.id ? null : feature.id))}
              aria-expanded={isOpen}
              title={feature.description}
            >
              <span className="whitespace-nowrap opacity-70">{feature.label}:</span>
              <span className="whitespace-nowrap">{labelOf(feature, optionOf(feature))}</span>
              <span className="opacity-60">{isOpen ? "▴" : "▾"}</span>
            </button>
          );
        })}
      </div>

      {/* Expands *inside* the strip, pushing the diagram down rather than covering it, so an
          option can be changed while watching the graph. */}
      {open && (
        <div className="border-t border-base-300 bg-base-100 px-3 py-2">
          <div className="font-semibold">{open.label}</div>
          <p className="mt-0.5 opacity-70">{open.description}</p>

          {/* Every option, not just the selected one: a feature exists because two renderings
              are both defensible, so the panel has to show what you'd be switching to. */}
          <div className="mt-2 flex flex-col gap-1">
            {open.options.map((o) => (
              <label
                key={o.id}
                className={`flex gap-2 rounded-box border px-2 py-1 ${
                  optionOf(open) === o.id ? "border-base-content/30 bg-base-200" : "border-base-300"
                }`}
              >
                <input
                  type="radio"
                  className="radio radio-xs mt-0.5"
                  name={`feature-${open.id}`}
                  checked={optionOf(open) === o.id}
                  onChange={() => setOption(open, o.id)}
                />
                <span>
                  <span className="font-medium">{o.label}</span>
                  {o.description && <span className="opacity-70"> — {o.description}</span>}
                </span>
              </label>
            ))}
          </div>

          {(open.params ?? []).map((param) => {
            const applies = paramApplies(param, optionOf(open));
            const value = state[open.id]?.params?.[param.id] ?? param.defaultOption;
            const description = param.options.find((o) => o.id === value)?.description;
            return (
              <div key={param.id} className="mt-2 border-t border-base-300 pt-2">
                <label className="flex flex-wrap items-center gap-2">
                  <span className={applies ? "" : "opacity-50"}>{param.label}</span>
                  {/* `w-auto` because daisyUI's select is 100% wide by default, which in this
                      short flex row stretches it across the panel. */}
                  <select
                    className="select select-xs select-bordered w-auto"
                    value={value}
                    aria-label={param.label}
                    disabled={!applies}
                    onChange={(e) => setParam(open, param.id, e.target.value)}
                  >
                    {param.options.map((o) => (
                      <option key={o.id} value={o.id} title={o.description}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {/* Disabled with a visible reason: a param that silently stopped
                      mattering reads as a bug. */}
                  {!applies && (
                    <span className="opacity-60">
                      only in{" "}
                      {(param.onlyForOptions ?? []).map((id) => labelOf(open, id)).join(", ")}
                    </span>
                  )}
                </label>
                {applies && description && <p className="mt-0.5 opacity-70">{description}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
