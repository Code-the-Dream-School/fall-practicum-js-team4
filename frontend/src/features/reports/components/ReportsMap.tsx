import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { PublicReport } from '../../../types/reports';
import { useReportLocations } from '../hooks/useReportLocations';

interface ReportsProps {
  reports: PublicReport[];
}

export function ReportsMap({ reports }: ReportsProps) {
  const { locations, isLoading, hasError } = useReportLocations(reports);

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      scrollWheelZoom={false}
      style={{ height: 400, width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
