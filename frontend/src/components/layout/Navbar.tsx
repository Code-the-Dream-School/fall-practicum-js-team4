import type { CSSProperties } from 'react';
import { Link, NavLink } from 'react-router';
import { Icon } from '../Icon';
import { useAuth } from '../../context/useAuth';
import { PATHS } from '../../app/paths';
import { buttonStyles, colors, layout } from '../../styles/theme';
import LogoutButton from '../LogoutButton';

const navLinkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
  padding: '8px 12px',
  borderRadius: layout.radius,
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
  color: isActive ? colors.text : colors.textMuted,
  backgroundColor: isActive ? colors.surface : 'transparent',
});

const iconButtonStyle: CSSProperties = {
  display: 'flex',
  padding: 8,
  background: 'none',
  border: 'none',
  borderRadius: layout.radius,
  color: colors.textMuted,
  cursor: 'pointer',
};

const avatarStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: colors.success,
  color: colors.bg,
  fontSize: 14,
  fontWeight: 700,
};

interface NavbarProps {
  isMobile: boolean;
}

export function Navbar({ isMobile }: NavbarProps) {
  const { user, status } = useAuth();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          maxWidth: layout.contentWidth,
          height: layout.navbarHeight,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link
          to={PATHS.home}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 20,
            fontWeight: 700,
            color: colors.text,
            textDecoration: 'none',
          }}
        >
          <Icon name="radar" />
          PawRadar
        </Link>

        {!isMobile && (
          <nav aria-label="Main navigation" style={{ display: 'flex', gap: 4 }}>
            <NavLink to={PATHS.home} end style={navLinkStyle}>
              Home
            </NavLink>
            <NavLink to={PATHS.lostPets} style={navLinkStyle}>
              Lost Pets
            </NavLink>
            <NavLink to={PATHS.foundPets} style={navLinkStyle}>
              Found Pets
            </NavLink>
            <NavLink to={PATHS.analytics} style={navLinkStyle}>
              Analytics
            </NavLink>
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={PATHS.reportLost} style={buttonStyles.lost}>
                + Report Lost
              </Link>
              <Link to={PATHS.reportFound} style={buttonStyles.found}>
                + Report Found
              </Link>
            </div>
          )}

          {status === 'authenticated' && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isMobile && (
                <button
                  type="button"
                  aria-label="Notifications"
                  style={iconButtonStyle}
                >
                  <Icon name="notifications" />
                </button>
              )}
              <Link
                to={PATHS.profile}
                aria-label={`Profile (${user.name})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  color: colors.text,
                  textDecoration: 'none',
                }}
              >
                <span style={avatarStyle} aria-hidden="true">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                {!isMobile && <span style={{ fontSize: 14 }}>{user.name}</span>}
              </Link>
              <LogoutButton />
            </div>
          )}

          {status === 'unauthenticated' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link to={PATHS.login} style={buttonStyles.outline}>
                Sign In
              </Link>
              <Link to={PATHS.register} style={buttonStyles.outline}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
