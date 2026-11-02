import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '../ErrorBoundary';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { layout } from '../../styles/theme';

export function Layout() {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { pathname } = useLocation();

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Navbar isMobile={isMobile} />
      <main
        style={{
          flexGrow: 1,
          width: '100%',
          maxWidth: layout.contentWidth,
          margin: '0 auto',
          padding: isMobile
            ? `16px 16px ${layout.bottomNavHeight + 24}px`
            : '24px 16px',
        }}
      >
        {/* A new key per page, so navigating away clears a crash */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
