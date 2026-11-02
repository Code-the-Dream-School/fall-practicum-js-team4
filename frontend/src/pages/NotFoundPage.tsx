import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { textStyles } from '../styles/theme';

export function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '80px 0',
        textAlign: 'center',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 40, fontWeight: 700 }}>404</h1>
      <p style={textStyles.pageSubtitle}>
        This page ran away like a lost pup 🐕
      </p>
      <Link to={PATHS.home} style={textStyles.link}>
        Back to home
      </Link>
    </div>
  );
}
