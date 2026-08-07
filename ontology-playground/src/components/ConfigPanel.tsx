import type { LayoutDirection, NodeTypeDef, StyleConfig, Theme } from "../ontology/types.ts";
import { deriveTypeStyle } from "../ontology/typeColors.ts";

const DIRECTIONS: { value: LayoutDirection; label: string }[] = [
  { value: "BT", label: "Bottom → Top" },
  { value: "TB", label: "Top → Bottom" },
  { value: "LR", label: "Left → Right" },
  { value: "RL", label: "Right → Left" },
];

interface Props {
  open: boolean;
  config: StyleConfig;
  renderedNodeTypes: NodeTypeDef[];
  theme: Theme;
  onChange: (config: StyleConfig) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function ConfigPanel({
  open,
  config,
  renderedNodeTypes,
  theme,
  onChange,
  onReset,
  onClose,
}: Props) {
  if (!open) return null;

  const setColor = (type: NodeTypeDef, value: string) => {
    onChange({ ...config, typeColors: { ...config.typeColors, [type.id]: value } });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Diagram style</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-6 mb-4">
          <label className="form-control">
            <span className="label-text text-xs mb-1">Layout direction</span>
            <select
              className="select select-sm select-bordered"
              value={config.direction}
              onChange={(e) =>
                onChange({ ...config, direction: e.target.value as LayoutDirection })
              }
            >
              {DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="label cursor-pointer gap-2">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={config.showIcons}
              onChange={(e) => onChange({ ...config, showIcons: e.target.checked })}
            />
            <span className="label-text text-sm">Show icons</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Type</th>
                <th>Color</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {renderedNodeTypes.map((type) => {
                const color = config.typeColors[type.id] ?? type.defaultColor;
                const style = deriveTypeStyle(color, theme);
                return (
                  <tr key={type.id}>
                    <td className="whitespace-nowrap">{type.label}</td>
                    <td>
                      <input
                        type="color"
                        className="h-7 w-10 cursor-pointer"
                        value={color}
                        onChange={(e) => setColor(type, e.target.value)}
                        aria-label={`${type.label} color`}
                      />
                    </td>
                    {/* A box as the diagram would draw it, icon included only while the diagram
                        would show one. Border width matches the `classDef`'s stroke-width. */}
                    <td>
                      <span
                        className="inline-block whitespace-nowrap rounded border-[1.5px] px-2 py-1 text-xs"
                        style={{
                          backgroundColor: style.fill,
                          borderColor: style.border,
                          color: style.text,
                        }}
                      >
                        {config.showIcons ? `${type.icon} ` : ""}
                        {type.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="modal-action">
          <button className="btn btn-sm btn-ghost" onClick={onReset}>
            Reset to defaults
          </button>
          <button className="btn btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
