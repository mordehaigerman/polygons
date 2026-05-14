interface Props {
  drawing: boolean;
  canStart: boolean;
  tapToStart: boolean;
  onTapToStartChange: (next: boolean) => void;
  onStart: () => void;
}

export const PolygonCanvasDrawing = ({
  drawing,
  canStart,
  tapToStart,
  onTapToStartChange,
  onStart,
}: Props) => (
  <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2">
    {drawing
      ? (
          <span className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-emerald-400/30">
            Drawing &middot; click to add &middot; double-click / Enter to finish &middot; Esc to cancel
            &middot; Backspace to undo
          </span>
        )
      : (
          <div className="pointer-events-auto flex items-center gap-3 rounded-md bg-slate-900/85 py-1 pr-1 pl-3 text-xs text-slate-300 ring-1 ring-slate-700">
            <label className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={tapToStart}
                onChange={(event) => onTapToStartChange(event.target.checked)}
                className="cursor-pointer accent-emerald-500"
              />
              Click image to start
            </label>
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart}
              className="cursor-pointer rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              New polygon
            </button>
          </div>
        )}
  </div>
);
