import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthProvider';
import { Layout } from './layout/Layout';

function BrokenPage(): never {
  throw new Error('Cannot read properties of undefined');
}

// The real Layout around a page that crashes while rendering
const renderLayoutAt = (path: string) => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<h1>Home page</h1>} />
            <Route path="broken" element={<BrokenPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
  return userEvent.setup();
};

describe('ErrorBoundary in Layout', () => {
  beforeEach(() => {
    // React and the boundary log the crash; keep the test output readable
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows a crash message instead of a blank page, and logs the error', async () => {
    renderLayoutAt('/broken');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page stopped working',
    );
    expect(console.error).toHaveBeenCalledWith(
      'Page crashed:',
      expect.objectContaining({
        message: 'Cannot read properties of undefined',
      }),
      expect.any(String),
    );
  });

  it('keeps the navigation working, and clears the crash on the next page', async () => {
    const user = renderLayoutAt('/broken');
    await screen.findByRole('alert');

    const mainNav = screen.getByRole('navigation', {
      name: /main navigation/i,
    });
    await user.click(mainNav.querySelector('a[href="/"]')!);

    expect(
      await screen.findByRole('heading', { name: 'Home page' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('This page stopped working'),
    ).not.toBeInTheDocument();
  });

  it('reloads the page from the button', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const user = renderLayoutAt('/broken');

    await user.click(
      await screen.findByRole('button', { name: /reload page/i }),
    );

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
