import type { LegendEntry } from "../ontology/types.ts";

interface Props {
  open: boolean;
  entries: LegendEntry[];
  note?: string;
  onClose: () => void;
}

export default function Legend({ open, entries, note, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Syntax key</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <table className="table table-sm">
          <tbody>
            {entries.map((e) => (
              <tr key={e.marker}>
                <td className="font-mono font-bold whitespace-nowrap">{e.marker}</td>
                <td className="whitespace-nowrap">
                  {e.icon} {e.label}
                </td>
                <td className="text-sm opacity-80">{e.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {note && <p className="text-xs opacity-70 mt-3 leading-relaxed">{note}</p>}

        <div className="modal-action">
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
