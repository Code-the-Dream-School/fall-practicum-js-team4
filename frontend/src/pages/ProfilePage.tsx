import { useAuth } from '../context/useAuth';
import { MyReportsList } from '../features/reports/components/MyReportsList';
import { ProfileCard } from '../features/user/components/ProfileCard';
import './ProfilePage.css';

export function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="profile-page">
      {/* The page title for screen readers; the card shows the name on screen */}
      <h1 className="visually-hidden">{user?.name}'s profile</h1>
      {user && <ProfileCard user={user} />}
      <div className="profile-page__main">
        <MyReportsList />
      </div>
    </div>
  );
}
