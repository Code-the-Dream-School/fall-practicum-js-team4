import { Route, Routes } from 'react-router';
import { PATHS } from './app/paths';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoggedInPage } from './pages/LoggedInPage';
import { LoginPage } from './pages/LoginPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PetDetailsPage } from './pages/PetDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportPetPage } from './pages/ReportPetPage';
import { ReportsDirectoryPage } from './pages/ReportsDirectoryPage';

// Kept apart from App so tests can render the routes inside a MemoryRouter
export function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.home} element={<Layout />}>
        {/* Public routes*/}
        <Route index element={<HomePage />} />
        <Route
          path={PATHS.lostPets}
          element={<ReportsDirectoryPage key="lost" reportType="LOST" />}
        />
        <Route
          path={PATHS.foundPets}
          element={<ReportsDirectoryPage key="found" reportType="FOUND" />}
        />
        <Route path={PATHS.petDetails(':id')} element={<PetDetailsPage />} />
        <Route path={PATHS.analytics} element={<AnalyticsPage />} />
        <Route path={PATHS.login} element={<LoginPage />} />
        <Route path={PATHS.register} element={<RegisterPage />} />

        {/* Signed-in only routes*/}
        <Route element={<ProtectedRoute />}>
          <Route path={PATHS.reportPet} element={<ReportPetPage />} />
          <Route path={PATHS.profile} element={<ProfilePage />} />
          <Route path={PATHS.dashboard} element={<LoggedInPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
