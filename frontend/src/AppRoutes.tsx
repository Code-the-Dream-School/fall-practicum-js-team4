import { Navigate, Route, Routes } from 'react-router';
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
      <Route path="/" element={<Layout />}>
        {/* Public routes*/}
        <Route index element={<HomePage />} />
        <Route
          path="lost-pets"
          element={<ReportsDirectoryPage key="lost" reportType="LOST" />}
        />
        <Route
          path="found-pets"
          element={<ReportsDirectoryPage key="found" reportType="FOUND" />}
        />
        <Route path="pets/:id" element={<PetDetailsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Signed-in only routes*/}
        <Route element={<ProtectedRoute />}>
          <Route path="report-pet" element={<ReportPetPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<LoggedInPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
