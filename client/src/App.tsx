import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { DoctorSearchPage } from './pages/DoctorSearchPage';
import { DoctorDetailPage } from './pages/DoctorDetailPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { TelehealthRoomPage } from './pages/TelehealthRoomPage';
import { RecordsTimelinePage } from './pages/RecordsTimelinePage';
import { AIHealthAssistantPage } from './pages/AIHealthAssistantPage';
import { EmergencySOSPage } from './pages/EmergencySOSPage';
import { ProviderPortalPage } from './pages/ProviderPortalPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-clinical-surface">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/doctors" element={<DoctorSearchPage />} />
          <Route path="/doctors/:id" element={<DoctorDetailPage />} />
          <Route path="/emergency" element={<EmergencySOSPage />} />

          {/* Protected Patient Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/records"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <RecordsTimelinePage />
              </ProtectedRoute>
            }
          />

          {/* Protected Clinician & Provider Routes */}
          <Route
            path="/provider"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <ProviderPortalPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Clinical Interaction Routes (Patient & Doctor) */}
          <Route
            path="/consultation/:id"
            element={
              <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <TelehealthRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <AIHealthAssistantPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
