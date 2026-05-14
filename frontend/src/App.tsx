import { useState } from 'react';
import { PolygonCanvas } from './components/PolygonCanvas';
import { PolygonDialog } from './components/PolygonDialog';
import { PolygonList } from './components/PolygonList';
import { ToastList } from './components/ToastList';
import { useAutoSaveRandom } from './hooks/useAutoSaveRandom';
import { useCreatePolygon } from './hooks/useCreatePolygon';
import { useDeletePolygon } from './hooks/useDeletePolygon';
import { usePolygons } from './hooks/usePolygons';
import { useRenamePolygon } from './hooks/useRenamePolygon';
import { useServerHealth } from './hooks/useServerHealth';
import { useTapToStart } from './hooks/useTapToStart';
import { useToasts } from './hooks/useToasts';

export const App = () => {
  // `data` already contains saved polygons + in-flight pending drafts +
  // failed drafts (the create hook keeps each one in place across status
  // transitions). No separate state to merge.
  const { data: polygons = [], isLoading, error } = usePolygons();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // Toasts are wired through each mutation's *central* lifecycle (not per-call
  // mutate options): React Query keeps only the latest per-call callbacks on
  // an observer, so concurrent saves/deletes/renames would otherwise collapse
  // into a single toast. Central callbacks fire once per completed mutation.
  const create = useCreatePolygon({
    onSuccess: (created) =>
      pushToast({ message: `Saved "${created.name}"`, tone: 'success' }),
    onError: (err) => pushToast({ message: err.message, tone: 'error' }),
  });
  const remove = useDeletePolygon({
    onSuccess: (_id, name) =>
      pushToast({ message: `Deleted "${name}"`, tone: 'success' }),
    onError: (err) => pushToast({ message: err.message, tone: 'error' }),
  });
  const rename = useRenamePolygon({
    onSuccess: ({ name }) =>
      pushToast({ message: `Renamed to "${name}"`, tone: 'success' }),
    onError: (err) => pushToast({ message: err.message, tone: 'error' }),
  });

  const [tapToStart, setTapToStart] = useTapToStart();
  const [autoSaveRandom, setAutoSaveRandom] = useAutoSaveRandom();

  // Background "is the backend reachable?" probe. Pushes a single toast per
  // connected ↔ disconnected transition. Subsumes the per-query error toast
  // for `usePolygons` (we only need one connection-level signal).
  useServerHealth(pushToast);

  const [pendingPoints, setPendingPoints] = useState<[number, number][] | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | string | null>(null);

  const handleFinishDrawing = (points: [number, number][]) => {
    setPendingPoints(points);
  };

  const handleAutoSaveRandom = (points: [number, number][]) => {
    create.mutate({ name: `P${polygons.length + 1}`, points });
  };

  const handleSubmitName = (name: string) => {
    if (!pendingPoints) {
      return;
    }
    const points = pendingPoints;
    // Close the dialog immediately - the pending draft is already on the
    // canvas/list via the create hook's optimistic onMutate, so there is no
    // reason to keep the user staring at a modal during the ~5s round trip.
    setPendingPoints(null);
    create.mutate({ name, points });
  };

  const handleCancelName = () => {
    setPendingPoints(null);
    create.reset();
  };

  const handleDelete = (polygonId: number) => {
    remove.mutate(polygonId);
  };

  const handleRename = (polygonId: number, name: string) => {
    rename.mutate({ id: polygonId, name });
  };

  const handleRetry = (failedId: string, name: string, points: [number, number][]) => {
    // retryId flips the existing failed draft to pending in place (no reorder)
    // instead of dropping it and appending a fresh draft at the end.
    create.mutate({ name, points, retryId: failedId });
  };

  const dialogDefaultName = `P${polygons.length + 1}`;

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div>
          <h1 className="text-base font-semibold">Polygons</h1>
          <p className="text-xs text-slate-400">
            Click to add vertices &middot; double-click / Enter to finish &middot; Esc to cancel
            &middot; Backspace to undo a vertex
          </p>
        </div>
        <span className="text-xs text-slate-500">
          Backend artificial delay: 5s &middot; optimistic UI hides it
        </span>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 flex-col border-r border-slate-800">
          <div className="flex flex-none items-baseline justify-between gap-2 px-4 pt-4 pb-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {`Polygons (${polygons.length})`}
            </h2>
            {polygons.length > 0
              ? <span className="text-[10px] text-slate-600">Double-click to edit</span>
              : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <PolygonList
              polygons={polygons}
              loading={isLoading}
              error={error ?? null}
              onDelete={handleDelete}
              onRename={handleRename}
              onRetry={handleRetry}
              onHover={setHighlightedId}
            />
          </div>
        </aside>
        <section className="relative min-w-0 flex-1 bg-slate-900">
          <PolygonCanvas
            polygons={polygons}
            highlightedId={highlightedId}
            tapToStart={tapToStart}
            autoSaveRandom={autoSaveRandom}
            previewPoints={pendingPoints}
            onTapToStartChange={setTapToStart}
            onAutoSaveRandomChange={setAutoSaveRandom}
            onHoverChange={setHighlightedId}
            onFinish={handleFinishDrawing}
            onAutoSave={handleAutoSaveRandom}
            onImageRefreshError={(err) =>
              pushToast({ message: `Failed to refresh image: ${err.message}`, tone: 'error' })}
          />
        </section>
      </main>
      <PolygonDialog
        open={pendingPoints !== null}
        defaultName={dialogDefaultName}
        onSubmit={handleSubmitName}
        onCancel={handleCancelName}
      />
      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
