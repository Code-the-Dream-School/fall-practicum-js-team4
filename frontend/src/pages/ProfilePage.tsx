import { useAuth } from '../context/useAuth';
import { textStyles } from '../styles/theme';

export function ProfilePage() {
  const { user } = useAuth();
  return (
    <h1 style={textStyles.pageTitle}>{user?.name}: profile & my reports</h1>
  );
}
