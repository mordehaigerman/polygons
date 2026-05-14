import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// Fail loudly on any unhandled request — catches forgotten mocks early.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Clear the polygon-list cache so localStorage from one test never bleeds
  // into the next.
  localStorage.clear();
});
afterAll(() => server.close());
