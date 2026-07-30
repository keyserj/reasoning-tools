import type { LayoutDirection, NodeTypeDef, StyleConfig } from "../ontology/types.ts";

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
  onChange: (config: StyleConfig) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function ConfigPanel({
  open,
  config,
  renderedNodeTypes,
  onChange,
  onReset,
  onClose,
}: Props) {
  if (!open) return null;

  const setColor = (type: NodeTypeDef, key: "fill" | "stroke" | "color", value: string) => {
    const base = config.types[type.id] ?? type.defaultStyle;
    onChange({
      ...config,
      types: { ...config.types, [type.id]: { ...base, [key]: value } },
    });
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
                <th>Fill</th>
                <th>Border</th>
                <th>Text</th>
              </tr>
            </thead>
            <tbody>
              {renderedNodeTypes.map((type) => {
                const style = config.types[type.id] ?? type.defaultStyle;
                return (
                  <tr key={type.id}>
                    <td className="whitespace-nowrap">
                      {type.icon} {type.label}
                    </td>
                    <td>
                      <input
                        type="color"
                        className="h-7 w-10 cursor-pointer"
                        value={style.fill}
                        onChange={(e) => setColor(type, "fill", e.target.value)}
                        aria-label={`${type.label} fill`}
                      />
                    </td>
                    <td>
                      <input
                        type="color"
                        className="h-7 w-10 cursor-pointer"
                        value={style.stroke}
                        onChange={(e) => setColor(type, "stroke", e.target.value)}
                        aria-label={`${type.label} border`}
                      />
                    </td>
                    <td>
                      <input
                        type="color"
                        className="h-7 w-10 cursor-pointer"
                        value={style.color}
                        onChange={(e) => setColor(type, "color", e.target.value)}
                        aria-label={`${type.label} text`}
                      />
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
