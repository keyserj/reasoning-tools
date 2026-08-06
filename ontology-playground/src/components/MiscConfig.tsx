interface Props {
  open: boolean;
  /** whether the editor tints the background of the tokens naming a type; set from here */
  typeBackgrounds: boolean;
  onTypeBackgroundsChange: (typeBackgrounds: boolean) => void;
  onClose: () => void;
}

// The editor's settings, the counterpart to the diagram column's Style: how the source is drawn,
// which is neither what the syntax means (Syntax) nor how the diagram is drawn (Style). Everything
// here is a preference about reading, so none of it belongs in the document or in a shared link.
export default function MiscConfig({
  open,
  typeBackgrounds,
  onTypeBackgroundsChange,
  onClose,
}: Props) {
  if (!open) return null;
  return (
    <div className="modal modal-open">
      {/* No width class, unlike the other two dialogs: the content is a short list of toggles, so
          daisyUI's 32rem default is already wider than anything in here needs. */}
      <div className="modal-box">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Misc config</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="label cursor-pointer gap-2">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={typeBackgrounds}
            onChange={(e) => onTypeBackgroundsChange(e.target.checked)}
          />
          <span className="label-text text-sm">Add type background colors</span>
        </label>

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
