import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  isDeleting,
  isFailed,
  isPending,
  isRenaming,
  type AnyPolygon,
} from '../api/client';
import { colorForId } from '../lib/colors';

const DRAFT_DOT_COLOR = '#94a3b8';

interface Props {
  polygon: AnyPolygon;
  onDelete: (polygonId: number) => void;
  onRename: (polygonId: number, name: string) => void;
  onRetry: (failedId: string, name: string, points: [number, number][]) => void;
  onHover: (polygonId: number | string | null) => void;
}

export const PolygonItem = ({
  polygon,
  onDelete,
  onRename,
  onRetry,
  onHover,
}: Props) => {
  const pending = isPending(polygon);
  const failed = isFailed(polygon);
  const deleting = isDeleting(polygon);
  const renaming = isRenaming(polygon);
  // Shared "in-flight" treatment: pending save, failed save, in-flight delete,
  // or in-flight rename. They all use the neutral gray palette so the row
  // clearly says "the server is still in charge of this one".
  const transient = pending || failed || deleting || renaming;
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.value = polygon.name;
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing, polygon.name]);

  const beginEdit = () => {
    if (transient) {
      return;
    }
    setEditing(true);
  };

  const commit = () => {
    // Read straight from the DOM rather than mirrored state -- the input is
    // uncontrolled, and during keyboard events React may not have flushed the
    // latest keystroke into a synced state yet.
    const raw = inputRef.current?.value ?? '';
    const next = raw.trim();
    setEditing(false);
    if (!next || next === polygon.name || transient) {
      return;
    }
    onRename(polygon.id as number, next);
  };

  const cancel = () => {
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  const renderTrailing = () => {
    if (pending) {
      return (
        <span
          aria-live="polite"
          className="rounded p-1 text-xs uppercase tracking-wide text-emerald-300"
        >
          Saving
        </span>
      );
    }
    if (deleting) {
      return (
        <span
          aria-live="polite"
          className="rounded p-1 text-xs uppercase tracking-wide text-rose-300"
        >
          Deleting
        </span>
      );
    }
    if (renaming) {
      return (
        <span
          aria-live="polite"
          className="rounded p-1 text-xs uppercase tracking-wide text-sky-300"
        >
          Renaming
        </span>
      );
    }
    if (failed) {
      return (
        <button
          type="button"
          onClick={() => onRetry(polygon.id as string, polygon.name, polygon.points)}
          aria-label={`Retry saving ${polygon.name}`}
          className="cursor-pointer rounded p-1 text-xs uppercase tracking-wide text-amber-300 hover:bg-slate-700 hover:text-amber-200"
        >
          Retry
        </button>
      );
    }
    // Always rendered (just hidden while editing) so the row keeps the same
    // height regardless of mode. Both edit-mode and idle-no-hover states use
    // `opacity-0`, so the transition never animates a fade-out -- prevents a
    // brief flash when committing the edit.
    return (
      <button
        type="button"
        onClick={() => onDelete(polygon.id as number)}
        disabled={editing}
        aria-hidden={editing || undefined}
        aria-label={`Delete ${polygon.name}`}
        className={`rounded p-1 text-xs text-slate-400 opacity-0 transition ${
          editing
            ? 'pointer-events-none'
            : 'cursor-pointer group-hover:opacity-100 hover:bg-slate-700 hover:text-rose-300'
        }`}
      >
        Delete
      </button>
    );
  };

  return (
    <li
      onMouseEnter={() => onHover(polygon.id)}
      onMouseLeave={() => onHover(null)}
      className={`group flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 select-none hover:bg-slate-800/70 ${
        transient ? 'opacity-60' : ''
      }`}
      data-testid={`polygon-row-${polygon.id}`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-900"
        style={{ backgroundColor: transient ? DRAFT_DOT_COLOR : colorForId(polygon.id) }}
      />
      {editing
        ? (
            <input
              ref={inputRef}
              type="text"
              defaultValue={polygon.name}
              onBlur={commit}
              onKeyDown={onKeyDown}
              maxLength={100}
              aria-label={`Rename ${polygon.name}`}
              // Visually identical to the read-only span -- no border, no
              // padding, no background. Only the caret signals edit mode.
              className="min-w-0 flex-1 truncate bg-transparent text-sm text-inherit outline-none"
            />
          )
        : (
            <span
              onDoubleClick={beginEdit}
              title={transient ? undefined : 'Double-click to rename'}
              className="min-w-0 flex-1 truncate text-sm"
            >
              {polygon.name}
            </span>
          )}
      {renderTrailing()}
    </li>
  );
};
