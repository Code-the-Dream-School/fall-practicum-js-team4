import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PhotoUpload } from '../features/reports/components/PhotoUpload';
import { textStyles } from '../styles/theme';
import type { ReportType } from '../types/reports';

export function ReportPetPage() {
  const [params] = useSearchParams();
  const [photos, setPhotos] = useState<File[]>([]);
  const reportType: ReportType =
    params.get('type') === 'found' ? 'FOUND' : 'LOST';

  return (
    <div>
      <h1 style={textStyles.pageTitle}>Report a pet: {reportType}</h1>
      <PhotoUpload photos={photos} onChange={setPhotos} />
    </div>
  );
}
