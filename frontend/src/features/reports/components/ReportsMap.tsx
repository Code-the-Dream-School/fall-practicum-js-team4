import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';
import 'leaflet/dist/leaflet.css';
import { useReportLocations } from '../hooks/useReportLocations';
import { PATHS } from '../../../app/paths';
import type { PublicReport } from '../../../types/reports';
import './ReportsMap.css';

interface ReportsProps {
  reports: PublicReport[];
}

export function ReportsMap({ reports }: ReportsProps) {
  const { locations, isLoading, hasError } = useReportLocations(reports);

  return (
    <div>
      {isLoading && <p role="status">Loading report locations...</p>}
      {hasError && (
        <p role="status">Some report locations could not be loaded.</p>
      )}

      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        scrollWheelZoom={false}
        style={{ height: 600, width: '100%', borderRadius: 12 }}
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

          const color = report.reportType === 'LOST' ? '#ff5733' : '#00b8d4';

          return (
            <CircleMarker
              key={report.petReportId}
              center={[place.latitude, place.longitude]}
              radius={8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.95,
                weight: 2,
                className: `report-map-marker report-map-marker--${report.reportType.toLowerCase()}`,
              }}
            >
              <Popup>
                <strong>
                  {report.reportType}: {report.petName || 'Pet report'}
                </strong>
                <p>
                  {location.city}, {location.state}
                </p>
                <Link to={PATHS.petDetails(String(report.petReportId))}>
                  View report
                </Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <p>Locations are approximate, based on ZIP codes.</p>
    </div>
  );
}
