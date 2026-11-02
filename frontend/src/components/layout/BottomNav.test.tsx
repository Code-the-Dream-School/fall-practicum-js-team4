import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('links to the main sections and the report page', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('navigation', { name: /mobile navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lost/i })).toHaveAttribute(
      'href',
      '/lost-pets',
    );
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.getByRole('link', { name: /report a pet/i })).toHaveAttribute(
      'href',
      '/report-pet',
    );
  });
});
