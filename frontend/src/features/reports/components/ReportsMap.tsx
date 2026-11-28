import { CircleMarker, MapContainer, Tooltip, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useReportLocations } from '../hooks/useReportLocations';
import type { PublicReport } from '../../../types/reports';
import './ReportsMap.css';

interface ReportsProps {
  reports: PublicReport[];
}

export function ReportsMap({ reports }: ReportsProps) {
  const { locations, isLoading, hasError } = useReportLocations(reports);

  const isMobile = window.innerWidth <= 768;

  return (
    <div>
      {isLoading && <p role="status">Loading report locations...</p>}
      {hasError && (
        <p role="status">Some report locations could not be loaded.</p>
      )}

      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={isMobile ? 3 : 4}
        scrollWheelZoom={false}
        className="reports-map"
      >
        <TileLayer
          className="report-map-tiles"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((report) => {
          const location = report.location;
          if (!location) return null;

          const zip = locations.find(
            (item) => item.zipCode === location.zipCode,
          );

          const place = zip?.places.find(
            (item) =>
              item.city.toLowerCase() === location.city.toLowerCase() &&
              item.stateCode.toUpperCase() === location.state.toUpperCase(),
          );

          if (
            !place ||
            !Number.isFinite(place.latitude) ||
            !Number.isFinite(place.longitude)
          ) {
            return null;
          }

          const isReunited = report.status === 'REUNITED';

          const markerType = isReunited
            ? 'reunited'
            : report.reportType.toLowerCase();

          const overlapping = reports
            .filter((other) => {
              const otherLocation = other.location;
              if (!otherLocation) return false;

              return (
                otherLocation.zipCode === location.zipCode &&
                otherLocation.city.toLowerCase() ===
                  location.city.toLowerCase() &&
                otherLocation.state.toUpperCase() ===
                  location.state.toUpperCase()
              );
            })
            .sort((a, b) => a.petReportId - b.petReportId);

          const index = overlapping.findIndex(
            (other) => other.petReportId === report.petReportId,
          );

          return (
            <CircleMarker
              key={report.petReportId}
              center={[
                place.latitude,
                place.longitude + (index - (overlapping.length - 1) / 2) * 0.8,
              ]}
              radius={8}
              pathOptions={{
                fillOpacity: 0.95,
                weight: 2,
                className: `report-map-marker report-map-marker--${markerType}`,
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
                className={`report-map-tooltip--${markerType}`}
              >
                <strong>
                  {isReunited ? 'REUNITED' : report.reportType}:{' '}
                  {report.petName
                    ? `${report.petName} (${report.petType.toLowerCase()})`
                    : report.petType.toLowerCase()}
                </strong>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <p className="report-map__caption">
        Locations are approximate, based on ZIP codes.
      </p>
    </div>
  );
}
