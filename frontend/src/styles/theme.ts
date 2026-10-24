import type { CSSProperties } from 'react';

export const colors = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  lost: '#f97316',
  found: '#06b6d4',
  success: '#10b981',
} as const;

export const layout = {
  contentWidth: 1280,
  navbarHeight: 64,
  bottomNavHeight: 64,
  radius: 8,
} as const;

const buttonBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: layout.radius,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  cursor: 'pointer',
};

export const buttonStyles = {
  lost: {
    ...buttonBase,
    border: '1px solid transparent',
    backgroundColor: colors.lost,
    color: '#fff',
  },
  found: {
    ...buttonBase,
    border: '1px solid transparent',
    backgroundColor: colors.found,
    color: colors.bg,
  },
  outline: {
    ...buttonBase,
    border: `1px solid ${colors.border}`,
    backgroundColor: 'transparent',
    color: colors.text,
  },
} satisfies Record<string, CSSProperties>;

export const textStyles = {
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 600 },
  pageSubtitle: { margin: '4px 0 0', color: colors.textMuted },
  link: { color: colors.found, textDecoration: 'none' },
} satisfies Record<string, CSSProperties>;
