import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import type { components } from '../src/api/schema';
import { PolygonList } from '../src/components/PolygonList';
import { useCreatePolygon } from '../src/hooks/useCreatePolygon';
import { useDeletePolygon } from '../src/hooks/useDeletePolygon';
import { usePolygons } from '../src/hooks/usePolygons';
import { useRenamePolygon } from '../src/hooks/useRenamePolygon';
import { polygonsQueryKey } from '../src/lib/queryClient';
import { resetState, seedPolygon, state } from './msw/handlers';
import { server } from './msw/server';
import { createTestQueryClient, renderWithClient } from './utils';

interface HarnessProps {
  onError?: (err: Error) => void;
}

const Harness = ({ onError }: HarnessProps) => {
  const { data: polygons = [], isLoading, error } = usePolygons();
  // Wire the error sink through the hook's *central* onError (not per-call)
  // so it fires for every completed mutation, even concurrent ones.
  const remove = useDeletePolygon({ onError: (err) => onError?.(err) });
  const rename = useRenamePolygon({ onError: (err) => onError?.(err) });
  return (
    <PolygonList
      polygons={polygons}
      loading={isLoading}
      error={error ?? null}
      onDelete={(id) => remove.mutate(id)}
      onRename={(id, name) => rename.mutate({ id, name })}
      onRetry={() => undefined}
      onHover={() => undefined}
    />
  );
};

describe('PolygonList', () => {
  afterEach(() => {
    resetState();
  });

  it('renders polygons fetched from the API', async () => {
    seedPolygon({
      name: 'P1',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });
    seedPolygon({
      name: 'P2',
      points: [
        [1, 1],
        [2, 1],
        [1.5, 2],
      ],
    });

    renderWithClient(<Harness />);

    expect(await screen.findByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  it('marks the row as Deleting and removes it once the server confirms', async () => {
    seedPolygon({
      name: 'Solo',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });

    // Hold the server response so we can observe the in-flight "Deleting"
    // state. Without this, React batches onMutate + onSuccess into a single
    // commit and the intermediate render never reaches the DOM.
    server.use(
      http.delete<{ polygon_id: string }>('/api/polygons/:polygon_id', async () => {
        await delay(50);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    renderWithClient(<Harness />, client);

    const row = await screen.findByTestId(/^polygon-row-/);
    const user = userEvent.setup();
    await user.hover(row);
    const deleteBtn = within(row).getByRole('button', { name: /delete/i });
    await user.click(deleteBtn);

    // Mid-flight: row still in the list, name still visible, marked Deleting.
    expect(await screen.findByText(/deleting/i)).toBeInTheDocument();
    expect(screen.getByText('Solo')).toBeInTheDocument();

    // Once the DELETE settles the row goes away for real.
    await waitFor(() => {
      expect(screen.queryByText('Solo')).not.toBeInTheDocument();
    });
    expect(client.getQueryData(polygonsQueryKey)).toEqual([]);
  });

  it('reverts the Deleting state in place when the server fails', async () => {
    seedPolygon({
      name: 'Sticky',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });

    // Delayed failure -- same reason as above: we need to observe the in-flight
    // state before the rollback lands.
    server.use(
      http.delete<{ polygon_id: string }>('/api/polygons/:polygon_id', async () => {
        await delay(50);
        return HttpResponse.json(
          { error: 'server_error', detail: 'boom' },
          { status: 500 },
        );
      }),
    );

    let receivedError: Error | null = null;
    const onError = (err: Error) => {
      receivedError = err;
    };

    renderWithClient(<Harness onError={onError} />);

    const row = await screen.findByTestId(/^polygon-row-/);
    const user = userEvent.setup();
    await user.hover(row);
    await user.click(within(row).getByRole('button', { name: /delete/i }));

    // Mid-flight: row still there, marked Deleting.
    expect(await screen.findByText(/deleting/i)).toBeInTheDocument();
    expect(screen.getByText('Sticky')).toBeInTheDocument();

    await waitFor(() => {
      expect(receivedError).not.toBeNull();
    });

    // After the rollback the row is back to its idle state -- no Deleting
    // badge, name still present, cache un-wiped.
    await waitFor(() => {
      expect(screen.queryByText(/deleting/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it('renames a polygon optimistically via double-click + Enter', async () => {
    seedPolygon({
      name: 'old',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });

    const client = createTestQueryClient();
    renderWithClient(<Harness />, client);

    const row = await screen.findByTestId(/^polygon-row-/);
    const nameSpan = await within(row).findByText('old');

    await act(async () => {
      fireEvent.doubleClick(nameSpan);
    });

    const input = within(row).getByLabelText(/rename old/i) as HTMLInputElement;
    expect(input.value).toBe('old');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'fresh' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(within(row).queryByRole('textbox')).not.toBeInTheDocument();
    });
    expect(await within(row).findByText('fresh')).toBeInTheDocument();
  });

  it('marks the row as Renaming and clears the badge once the server confirms', async () => {
    seedPolygon({
      name: 'before',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });

    // Hold the PATCH so the optimistic "Renaming" UI lands in the DOM before
    // the success callback strips it. Same trick as the delete tests.
    server.use(
      http.patch<{ polygon_id: string }>('/api/polygons/:polygon_id', async ({ request }) => {
        await delay(50);
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ id: 1, name: body.name, points: [[0, 0], [10, 0], [5, 10]] });
      }),
    );

    renderWithClient(<Harness />);

    const row = await screen.findByTestId(/^polygon-row-/);
    const nameSpan = await within(row).findByText('before');

    await act(async () => {
      fireEvent.doubleClick(nameSpan);
    });

    const input = within(row).getByLabelText(/rename before/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'after' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    // Mid-flight: optimistic new name visible, Renaming badge present.
    expect(await within(row).findByText('after')).toBeInTheDocument();
    expect(await within(row).findByText(/renaming/i)).toBeInTheDocument();

    // After the server settles the badge disappears, the new name sticks.
    await waitFor(() => {
      expect(within(row).queryByText(/renaming/i)).not.toBeInTheDocument();
    });
    expect(within(row).getByText('after')).toBeInTheDocument();
  });

  it('reverts the optimistic rename in place when the server fails', async () => {
    seedPolygon({
      name: 'keep',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });

    // Delayed failure so the Renaming badge lands before the rollback fires.
    server.use(
      http.patch<{ polygon_id: string }>('/api/polygons/:polygon_id', async () => {
        await delay(50);
        return HttpResponse.json(
          { error: 'invalid_name', detail: 'nope' },
          { status: 422 },
        );
      }),
    );

    let receivedError: Error | null = null;
    const onError = (err: Error) => {
      receivedError = err;
    };

    renderWithClient(<Harness onError={onError} />);

    const row = await screen.findByTestId(/^polygon-row-/);
    const nameSpan = await within(row).findByText('keep');

    await act(async () => {
      fireEvent.doubleClick(nameSpan);
    });

    const input = within(row).getByLabelText(/rename keep/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'bad' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    // Mid-flight: optimistic new name + Renaming badge.
    expect(await within(row).findByText('bad')).toBeInTheDocument();
    expect(await within(row).findByText(/renaming/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(receivedError).not.toBeNull();
    });

    // After the rollback the row is back to 'keep' with no Renaming badge,
    // and the rest of the cache stays intact -- no full snapshot rollback.
    await waitFor(() => {
      expect(within(row).queryByText(/renaming/i)).not.toBeInTheDocument();
    });
    expect(within(row).getByText('keep')).toBeInTheDocument();
  });

  it('flips a failed save in place and preserves its row position on retry', async () => {
    // Seed two existing rows so we can assert order around the failed draft.
    seedPolygon({ name: 'before', points: [[0, 0], [10, 0], [5, 10]] });
    seedPolygon({ name: 'after', points: [[0, 0], [10, 0], [5, 10]] });

    // The first POST fails -> failed draft. The second (retry) succeeds.
    state.failNextCreate = true;

    const RetryHarness = () => {
      const { data: polygons = [] } = usePolygons();
      const create = useCreatePolygon();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              create.mutate({ name: 'oops', points: [[0, 0], [10, 0], [5, 10]] })}
          >
            create
          </button>
          <PolygonList
            polygons={polygons}
            loading={false}
            error={null}
            onDelete={() => undefined}
            onRename={() => undefined}
            onRetry={(failedId, name, points) => {
              create.mutate({ name, points, retryId: failedId });
            }}
            onHover={() => undefined}
          />
        </>
      );
    };

    renderWithClient(<RetryHarness />);

    // Wait for the seeded rows to land.
    await screen.findByText('before');
    await screen.findByText('after');

    await act(async () => {
      screen.getByRole('button', { name: /^create$/ }).click();
    });

    // The failed draft sits at the bottom (it was appended).
    const retryBtn = await screen.findByRole('button', { name: /retry saving oops/i });
    expect(retryBtn).toBeInTheDocument();

    const positionBefore = screen
      .getAllByTestId(/^polygon-row-/)
      .findIndex((row) => row.textContent?.includes('oops'));
    expect(positionBefore).toBe(2);

    await act(async () => {
      retryBtn.click();
    });

    // Retry succeeded: row is no longer "failed", but it stays at index 2 --
    // not jumping to a different section of the list.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry saving/i })).not.toBeInTheDocument();
    });

    const rows = screen.getAllByTestId(/^polygon-row-/);
    const positionAfter = rows.findIndex((row) => row.textContent?.includes('oops'));
    expect(positionAfter).toBe(positionBefore);
    expect(rows).toHaveLength(3);
  });

  it('keeps showing cached polygons when the fetch fails', async () => {
    // Seed the same key usePolygons reads on mount.
    const cached: components['schemas']['PolygonOut'][] = [
      { id: 42, name: 'Cached', points: [[0, 0], [10, 0], [5, 10]] },
    ];
    localStorage.setItem('polygons:list-cache-v1', JSON.stringify(cached));

    // Backend is "down" for this test.
    server.use(
      http.get('/api/polygons', () =>
        HttpResponse.json({ error: 'server_error', detail: 'boom' }, { status: 500 }),
      ),
    );

    renderWithClient(<Harness />);

    expect(await screen.findByText('Cached')).toBeInTheDocument();
    // The error fallback should NOT replace the cached list.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not wipe the cache when the proxy returns 500 with an empty body', async () => {
    // Exactly what the Vite dev proxy returns when the backend is unreachable:
    // a non-2xx with an empty text/plain body. openapi-fetch surfaces this as
    // `error: ""` (falsy), so the queryFn must lean on response.ok, not error.
    const cached: components['schemas']['PolygonOut'][] = [
      { id: 7, name: 'Survivor', points: [[0, 0], [10, 0], [5, 10]] },
    ];
    localStorage.setItem('polygons:list-cache-v1', JSON.stringify(cached));

    server.use(
      http.get('/api/polygons', () =>
        new HttpResponse('', { status: 500, headers: { 'Content-Type': 'text/plain' } }),
      ),
    );

    renderWithClient(<Harness />);

    // The cached row stays visible...
    expect(await screen.findByText('Survivor')).toBeInTheDocument();
    // ...and -- crucially -- the cache wasn't blown away to "[]".
    await waitFor(() => {
      expect(localStorage.getItem('polygons:list-cache-v1')).toBe(JSON.stringify(cached));
    });
  });
});
