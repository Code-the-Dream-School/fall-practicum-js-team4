import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../AppRoutes';
import { AuthProvider } from '../context/AuthProvider';
import { QueryProvider } from '../app/QueryProvider';

// Renders the whole app (auth + routes) starting at `path`
export const renderApp = (path = '/') => {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <QueryProvider retryDelay={0}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryProvider>
    </AuthProvider>,
  );
  return { user };
};
