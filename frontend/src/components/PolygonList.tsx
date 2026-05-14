import { type AnyPolygon } from '../api/client';
import { PolygonItem } from './PolygonItem';

interface Props {
  polygons: AnyPolygon[];
  loading: boolean;
  error: Error | null;
  onDelete: (polygonId: number) => void;
  onRename: (polygonId: number, name: string) => void;
  onRetry: (failedId: string, name: string, points: [number, number][]) => void;
  onHover: (polygonId: number | string | null) => void;
}

export const PolygonList = ({
  polygons,
  loading,
  error,
  onDelete,
  onRename,
  onRetry,
  onHover,
}: Props) => {
  if (loading) {
    return (
      <ul className="space-y-1" data-testid="polygon-list-loading">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-9 animate-pulse rounded-md bg-slate-800/70" aria-hidden="true" />
        ))}
      </ul>
    );
  }

  // Cached polygons always win over a fetch error: when the backend is
  // unreachable we keep showing the last-known list and surface the failure
  // through a toast instead. The error fallback below only fires when we have
  // nothing to show.
  if (polygons.length > 0) {
    return (
      <ul className="space-y-1" data-testid="polygon-list">
        {polygons.map((polygon) => (
          <PolygonItem
            key={String(polygon.id)}
            polygon={polygon}
            onDelete={onDelete}
            onRename={onRename}
            onRetry={onRetry}
            onHover={onHover}
          />
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-rose-300">
        {error.message}
      </p>
    );
  }

  return <p className="text-sm text-slate-400">No polygons yet. Draw one on the canvas.</p>;
};
