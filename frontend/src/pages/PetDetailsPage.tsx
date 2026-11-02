import { useParams } from 'react-router';
import { textStyles } from '../styles/theme';

export function PetDetailsPage() {
  const { id } = useParams();
  return <h1 style={textStyles.pageTitle}>Pet details & matches: {id}</h1>;
}
