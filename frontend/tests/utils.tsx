import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

interface QueryProviderProps {
  client: QueryClient;
  children: ReactNode;
}

const QueryProvider = ({ client, children }: QueryProviderProps) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

export const renderWithClient = (
  ui: ReactElement,
  client: QueryClient = createTestQueryClient(),
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult & { client: QueryClient } => {
  const result = render(ui, {
    wrapper: ({ children }) => <QueryProvider client={client}>{children}</QueryProvider>,
    ...options,
  });
  return Object.assign(result, { client });
};
