import { Outlet } from 'react-router';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { layout } from '../../styles/theme';

export function Layout() {
  const isMobile = useMediaQuery('(max-width: 1023px)');

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
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
