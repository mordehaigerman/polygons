interface Props {
  refreshing: boolean;
  drawing: boolean;
  autoSaveRandom: boolean;
  onRefresh: () => void;
  onRandom: () => void;
  onAutoSaveRandomChange: (next: boolean) => void;
}

/**
 * Top-left canvas overlay: refresh the background image, generate a random
 * polygon, and toggle whether random polygons auto-save or open the name
 * dialog. The whole strip mirrors the right-side drawing controls layout so
 * the two chips read as a pair.
 */
export const PolygonCanvasImageControls = ({
  refreshing,
  drawing,
  autoSaveRandom,
  onRefresh,
  onRandom,
  onAutoSaveRandomChange,
}: Props) => {
  const busy = refreshing || drawing;
  return (
    <div className="pointer-events-auto absolute top-4 left-4 flex items-center gap-1 rounded-md bg-slate-900/85 py-1 pr-3 pl-1 text-xs text-slate-300 ring-1 ring-slate-700">
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        title="Refresh background image"
        className="cursor-pointer rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
      >
        {refreshing ? 'Refreshing...' : 'Refresh image'}
      </button>
      <button
        type="button"
        onClick={onRandom}
        disabled={busy}
        title="Generate a random polygon"
        className="cursor-pointer rounded px-2 py-1 text-emerald-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Generate polygon
      </button>
      <label className="flex cursor-pointer items-center gap-1.5 px-1 select-none">
        <input
          type="checkbox"
          checked={autoSaveRandom}
          onChange={(event) => onAutoSaveRandomChange(event.target.checked)}
          className="cursor-pointer accent-emerald-500"
        />
        Auto save
      </label>
    </div>
  );
};
