import type { ReactNode } from 'react';
import { Icon } from '../../../components/Icon';
import type { User } from '../../../services/authApi';
import { useMyReports } from '../../reports/hooks/useMyReports';
import './ProfileCard.css';

const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

function Stat({
  value,
  label,
  tone,
}: {
  value: ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <div className="profile-card__stat">
      <span
        className={`profile-card__stat-value profile-card__stat-value--${tone}`}
      >
        {value}
      </span>
      <span className="profile-card__stat-label">{label}</span>
    </div>
  );
}

function Detail({
  icon,
  tone,
  label,
  children,
}: {
  icon: string;
  tone: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="profile-card__detail">
      <Icon name={icon} className={`profile-card__detail-icon--${tone}`} />
      <div className="profile-card__detail-text">
        <span className="profile-card__detail-label">{label}</span>
        <span className="profile-card__detail-value">{children}</span>
      </div>
    </div>
  );
}

// The signed-in user's card on the left of the profile page.
// Counts come from the same query as the reports list (one request).
export function ProfileCard({ user }: { user: User }) {
  const { data } = useMyReports();
  const reports = data?.reports;
  const count = (filter: (status: string) => boolean) =>
    reports ? reports.filter((r) => filter(r.status)).length : '–';

  return (
    <aside className="profile-card" aria-label="Your profile">
      <div className="profile-card__identity">
        <div className="profile-card__avatar">
          <span className="profile-card__avatar-glow" aria-hidden="true" />
          <span className="profile-card__avatar-initial" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="profile-card__name">{user.name}</h2>
      </div>

      <div className="profile-card__stats">
        <Stat value={data?.total ?? '–'} label="Reports Filed" tone="found" />
        <Stat value={count((s) => s === 'ACTIVE')} label="Active" tone="lost" />
        <Stat
          value={count((s) => s === 'REUNITED')}
          label="Reunited"
          tone="success"
        />
      </div>

      <div className="profile-card__details">
        <Detail icon="mail" tone="found" label="Email">
          {user.email}
        </Detail>
        <Detail icon="calendar_month" tone="found" label="Member since">
          {memberSince(user.createdAt)}
        </Detail>
      </div>
    </aside>
  );
}
