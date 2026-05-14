import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  defaultName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

// Window during which a submit is ignored after the dialog opens. Prevents the
// Enter keypress that finished the drawing from also auto-submitting the form
// (the dialog mounts mid-keystroke and the focused input would otherwise catch
// the same Enter on auto-repeat).
const OPEN_GRACE_MS = 200;

export const PolygonDialog = ({
  open,
  defaultName,
  onSubmit,
  onCancel,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittableRef = useRef(false);

  const [name, setName] = useState(defaultName);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      setName(defaultName);
      dialog.showModal();
      // The browser's <dialog> focus algorithm runs after showModal(); defer
      // our select() by one frame so it wins, and double-click selection (which
      // can steal focus mid-tick) has already settled.
      requestAnimationFrame(() => inputRef.current?.select());
      submittableRef.current = false;
      const timer = window.setTimeout(() => {
        submittableRef.current = true;
      }, OPEN_GRACE_MS);
      return () => window.clearTimeout(timer);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, defaultName]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      aria-labelledby="polygon-dialog-title"
      className="m-auto rounded-lg bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-black/60"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit || !submittableRef.current) {
            return;
          }
          onSubmit(trimmed);
        }}
        className="flex w-80 flex-col gap-3 p-5"
      >
        <h2 id="polygon-dialog-title" className="text-base font-semibold">
          Name your polygon
        </h2>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Name
          <input
            ref={inputRef}
            type="text"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={1}
            maxLength={100}
            className="mt-1 w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-emerald-400"
          />
        </label>
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="cursor-pointer rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
};
