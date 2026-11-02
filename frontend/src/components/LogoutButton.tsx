import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth';
import { buttonStyles } from '../styles/theme';
import { PATHS } from '../app/paths';

export default function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [isLoggingOff, setIsLoggingOff] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setIsLoggingOff(true);
    setError('');

    try {
      await signOut();
      navigate(PATHS.login, { replace: true });
    } catch {
      setError('Failed to log out. Please try again.');
      setIsLoggingOff(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOff}
        style={{
          ...buttonStyles.outline,
          opacity: isLoggingOff ? 0.5 : 1,
          cursor: isLoggingOff ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoggingOff ? 'Logging out...' : 'Log out'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
