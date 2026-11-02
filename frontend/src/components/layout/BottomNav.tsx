import type { CSSProperties } from 'react';
import { Link, NavLink } from 'react-router';
import { Icon } from '../Icon';
import { PATHS } from '../../app/paths';
import { colors, layout } from '../../styles/theme';

const tabStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '6px 0',
  fontSize: 11,
  textDecoration: 'none',
  color: isActive ? colors.found : colors.textMuted,
});

export function BottomNav() {
  return (
    <>
      <Link
        to={PATHS.reportPet}
        aria-label="Report a pet"
        style={{
          position: 'fixed',
          right: 16,
          bottom: layout.bottomNavHeight + 16,
          zIndex: 60,
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: colors.lost,
          color: '#fff',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        }}
      >
        <Icon name="add" />
      </Link>

      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          height: layout.bottomNavHeight,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <NavLink to={PATHS.home} end style={tabStyle}>
          <Icon name="home" />
          <span>Home</span>
        </NavLink>
        <NavLink to={PATHS.lostPets} style={tabStyle}>
          <Icon name="pets" />
          <span>Lost</span>
        </NavLink>
        <NavLink to={PATHS.profile} style={tabStyle}>
          <Icon name="account_circle" />
          <span>Profile</span>
        </NavLink>
        <NavLink to={PATHS.foundPets} style={tabStyle}>
          <Icon name="radar" />
          <span>Found</span>
        </NavLink>
        <NavLink to={PATHS.analytics} style={tabStyle}>
          <Icon name="insights" />
          <span>Analytics</span>
        </NavLink>
      </nav>
    </>
  );
}
