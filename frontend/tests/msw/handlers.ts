import { HttpResponse, http } from 'msw';
import type { components } from '../../src/api/schema';

type Polygon = components['schemas']['PolygonOut'];

interface State {
  polygons: Map<number, Polygon>;
  nextId: number;
  failNextCreate: boolean;
}

export const state: State = {
  polygons: new Map(),
  nextId: 1,
  failNextCreate: false,
};

export const resetState = () => {
  state.polygons.clear();
  state.nextId = 1;
  state.failNextCreate = false;
};

export const seedPolygon = (input: Omit<Polygon, 'id'>): Polygon => {
  const polygon: Polygon = { id: state.nextId++, ...input };
  state.polygons.set(polygon.id, polygon);
  return polygon;
};

export const handlers = [
  // Default healthcheck: tests that render the App and want to simulate a
  // backend outage can override this with `server.use(...)` per-test.
  http.get('/health', () => HttpResponse.json({ ok: true })),
  http.get('/api/polygons', () =>
    HttpResponse.json([...state.polygons.values()].sort((a, b) => a.id - b.id)),
  ),
  http.post('/api/polygons', async ({ request }) => {
    if (state.failNextCreate) {
      state.failNextCreate = false;
      return HttpResponse.json(
        { error: 'invalid_name', detail: 'name is required' },
        { status: 422 },
      );
    }
    const body = (await request.json()) as components['schemas']['PolygonIn'];
    const polygon: Polygon = { id: state.nextId++, name: body.name, points: body.points };
    state.polygons.set(polygon.id, polygon);
    return HttpResponse.json(polygon, { status: 201 });
  }),
  http.patch<{ polygon_id: string }>('/api/polygons/:polygon_id', async ({ params, request }) => {
    const id = Number(params.polygon_id);
    const existing = state.polygons.get(id);
    if (!existing) {
      return HttpResponse.json(
        { error: 'polygon_not_found', detail: 'not found', id },
        { status: 404 },
      );
    }
    const body = (await request.json()) as { name: string };
    const renamed: Polygon = { ...existing, name: body.name };
    state.polygons.set(id, renamed);
    return HttpResponse.json(renamed);
  }),
  http.delete<{ polygon_id: string }>('/api/polygons/:polygon_id', ({ params }) => {
    const id = Number(params.polygon_id);
    if (!state.polygons.delete(id)) {
      return HttpResponse.json(
        { error: 'polygon_not_found', detail: 'not found', id },
        { status: 404 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
