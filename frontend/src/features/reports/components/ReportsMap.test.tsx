import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testReports } from '../../../test/server';
import type { PublicReport } from '../../../types/reports';
import { ReportsMap } from './ReportsMap';

vi.mock('../hooks/useReportLocations', () => ({
  useReportLocations: () => ({
    locations: [
      {
        zipCode: '27601',
        places: [
          {
            city: 'Raleigh',
            state: 'North Carolina',
            stateCode: 'NC',
            latitude: 35.78,
            longitude: -78.64,
          },
        ],
      },
    ],
    isLoading: false,
    hasError: false,
  }),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  CircleMarker: ({
    children,
    center,
    pathOptions,
  }: {
    children: ReactNode;
    center: [number, number];
    pathOptions: { className: string };
  }) => (
    <div
      data-testid="map-marker"
      data-center={JSON.stringify(center)}
      className={pathOptions.className}
    >
      {children}
    </div>
  ),
  Tooltip: ({
    children,
    className,
  }: {
    children: ReactNode;
    className: string;
  }) => (
    <div data-testid="map-tooltip" className={className}>
      {children}
    </div>
  ),
}));

const lostReport: PublicReport = { ...testReports[0] };

describe('ReportsMap', () => {
  it('keeps a single marker at its original coordinates', () => {
    render(<ReportsMap reports={[lostReport]} />);

    expect(screen.getByTestId('map-marker')).toHaveAttribute(
      'data-center',
      JSON.stringify([35.78, -78.64]),
    );
  });

  it('1. separates reports at the same location', () => {
    const foundReport: PublicReport = {
      ...lostReport,
      petReportId: 2,
      reportType: 'FOUND',
      petName: null,
    };

    render(<ReportsMap reports={[lostReport, foundReport]} />);

    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(2);

    expect(markers[0].getAttribute('data-center')).not.toBe(
      markers[1].getAttribute('data-center'),
    );

    expect(markers[0]).toHaveClass('report-map-marker--lost');
    expect(markers[1]).toHaveClass('report-map-marker--found');
  });

  it('2. uses reunited styling and text for a reunited report', () => {
    render(<ReportsMap reports={[{ ...lostReport, status: 'REUNITED' }]} />);

    expect(screen.getByTestId('map-marker')).toHaveClass(
      'report-map-marker--reunited',
    );
    expect(screen.getByTestId('map-tooltip')).toHaveClass(
      'report-map-tooltip--reunited',
    );
    expect(screen.getByTestId('map-tooltip')).toHaveTextContent(
      'REUNITED: Biscuit (dog)',
    );
  });

  it('3. shows the pet name and type in the tooltip', () => {
    render(<ReportsMap reports={[lostReport]} />);

    expect(screen.getByTestId('map-tooltip')).toHaveTextContent(
      'LOST: Biscuit (dog)',
    );
  });

  it('4. shows the pet type without parentheses when the name is missing', () => {
    render(
      <ReportsMap
        reports={[
          {
            ...lostReport,
            reportType: 'FOUND',
            petName: null,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('map-tooltip')).toHaveTextContent('FOUND: dog');
    expect(screen.getByTestId('map-tooltip')).not.toHaveTextContent('(dog)');
  });

  it('5. does not show markers for reports without location', () => {
    render(<ReportsMap reports={[{ ...lostReport, location: null }]} />);

    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument();
  });

  it('6. does not show a marker when no matching city is found', () => {
    render(
      <ReportsMap
        reports={[
          {
            ...lostReport,
            location: {
              zipCode: '27601',
              city: 'Unknown city',
              state: 'NC',
            },
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument();
  });
});
