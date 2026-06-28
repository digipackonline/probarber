import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ToastProvider } from './context/ToastContext';
import { I18nProvider } from './lib/i18n';
import { FeatureFlagsProvider } from './lib/features';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import { Spinner } from './components/ui';

// Public pages (eager load)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// Lazy load all protected pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const BarbersPage = lazy(() => import('./pages/BarbersPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const WhatsAppConfigPage = lazy(() => import('./pages/WhatsAppConfigPage'));
const WhatsAppTemplatesPage = lazy(() => import('./pages/WhatsAppTemplatesPage'));
const WhatsAppHistoryPage = lazy(() => import('./pages/WhatsAppHistoryPage'));
const MyAppointmentsPage = lazy(() => import('./pages/MyAppointmentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-zinc-500 text-sm mt-4">Cargando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <TenantProvider>{children}</TenantProvider>;
}

function FeatureFlagsWrapper({ children }: { children: React.ReactNode }) {
  const { subscription, plan } = useTenant();

  return (
    <FeatureFlagsProvider
      tenantId={subscription?.tenant_id}
      planSlug={plan?.slug}
    >
      {children}
    </FeatureFlagsProvider>
  );
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
      <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/book" element={<BookingPage />} />

      {/* Onboarding (authenticated, but no tenant required) */}
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense>
        </ProtectedRoute>
      } />

      {/* Subscription management */}
      <Route path="/subscription" element={
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><SubscriptionPage /></Suspense></Layout>
        </ProtectedRoute>
      } />

      {/* Protected routes with Layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={['admin', 'barber']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/agenda" element={
        <ProtectedRoute roles={['admin', 'barber']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><AgendaPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute roles={['admin', 'barber']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><ClientsPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/barbers" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><BarbersPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/services" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><ServicesPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/branches" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><BranchesPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute roles={['admin', 'barber']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><ReportsPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/marketing" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><MarketingPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/loyalty" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><LoyaltyPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/whatsapp" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><WhatsAppConfigPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/whatsapp/templates" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><WhatsAppTemplatesPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/whatsapp/history" element={
        <ProtectedRoute roles={['admin']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><WhatsAppHistoryPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/ai" element={
        <ProtectedRoute roles={['admin', 'barber']}>
          <TenantProvider>
            <FeatureFlagsWrapper>
              <Layout><Suspense fallback={<PageLoader />}><AIAssistantPage /></Suspense></Layout>
            </FeatureFlagsWrapper>
          </TenantProvider>
        </ProtectedRoute>
      } />
      <Route path="/my-appointments" element={
        <ProtectedRoute roles={['client']}>
          <Layout><Suspense fallback={<PageLoader />}><MyAppointmentsPage /></Suspense></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></Layout>
        </ProtectedRoute>
      } />

      {/* Help and feedback */}
      <Route path="/help" element={
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><HelpCenterPage /></Suspense></Layout>
        </ProtectedRoute>
      } />
      <Route path="/feedback" element={
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><FeedbackPage /></Suspense></Layout>
        </ProtectedRoute>
      } />

      {/* Admin only */}
      <Route path="/system-health" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><Suspense fallback={<PageLoader />}><SystemHealthPage /></Suspense></Layout>
        </ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/app" element={
        user ? (
          profile?.role === 'client' ? <Navigate to="/my-appointments" replace /> : <Navigate to="/dashboard" replace />
        ) : (
          <Navigate to="/auth" replace />
        )
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <I18nProvider>
            <AppRoutes />
          </I18nProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
