import { useParams, useLocation } from 'react-router';
import { textStyles } from '../styles/theme';

export function PetDetailsPage() {
  const { id } = useParams();
  const location = useLocation();

  const successMessage = (location.state as { successMessage?: string } | null)
    ?.successMessage;

  return (
    <>
      {successMessage && <p role="status">{successMessage}</p>}
      <h1 style={textStyles.pageTitle}>Pet details & matches: {id}</h1>
    </>
  );
}
