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
      {/* Wider than daisyUI's 32rem default, which is sized for confirm dialogs; the key's third
          column is prose, and at 32rem every row wraps enough to fill the screen vertically. 56rem
          is where that stops paying: it leaves only 2 of 13 arg-map rows wrapped and fits an
          800px-tall window without scrolling, where 64rem buys 20px more for 8rem more width.
          Only affects desktop — below the cap, modal-box's width: 91.6667% still governs. */}
      <div className="modal-box max-w-4xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Syntax</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* One list, two layouts. The table's first two columns can't wrap, so on a phone they eat
            252px of the ~310px available and leave the meaning column ~127px — rows grow to 4-6
            lines and the key ends up ~2.4 screens tall. Stacking gives the meaning the full width,
            which cuts that to ~1 screen; wrapping was never the problem, wrapping into 127px was. */}
        <ul className="flex flex-col gap-3 md:hidden">
          {entries.map((e) => (
            <li key={e.marker}>
              {/* Wraps rather than nowrapping the whole line: on a 320px screen marker + label can
                  exceed the width, and breaking between them beats overflowing the dialog. */}
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono font-bold whitespace-nowrap">{e.marker}</span>
                <span className="whitespace-nowrap">
                  {e.icon} {e.label}
                </span>
              </div>
              <p className="text-sm opacity-80 leading-snug">{e.meaning}</p>
            </li>
          ))}
        </ul>

        {/* Display toggled on a wrapper, not on .table itself, so it can't collide with daisyUI's
            own display rule for the class. */}
        <div className="hidden md:block">
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
        </div>

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
