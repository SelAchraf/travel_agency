import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { AdminLayout } from "./components/layout/AdminLayout.js";

// Route-level code splitting as mandated by Performance Rules (03-performance)
const LoginPage = React.lazy(() =>
  import("./pages/LoginPage.js").then((m) => ({ default: m.LoginPage }))
);
const ForgotPasswordPage = React.lazy(() =>
  import("./pages/ForgotPasswordPage.js").then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = React.lazy(() =>
  import("./pages/ResetPasswordPage.js").then((m) => ({ default: m.ResetPasswordPage }))
);
const DashboardPage = React.lazy(() =>
  import("./pages/DashboardPage.js").then((m) => ({ default: m.DashboardPage }))
);
const DocumentsPage = React.lazy(() =>
  import("./pages/DocumentsPage.js").then((m) => ({ default: m.DocumentsPage }))
);
const ReportsPage = React.lazy(() =>
  import("./pages/ReportsPage.js").then((m) => ({ default: m.ReportsPage }))
);
const StaffUsersPage = React.lazy(() =>
  import("./pages/StaffUsersPage.js").then((m) => ({ default: m.StaffUsersPage }))
);
const OffersListPage = React.lazy(() =>
  import("./pages/OffersListPage.js").then((m) => ({ default: m.OffersListPage }))
);
const DeparturesPage = React.lazy(() =>
  import("./pages/DeparturesPage.js").then((m) => ({ default: m.DeparturesPage }))
);
const PortalAuthPage = React.lazy(() =>
  import("./pages/portal/PortalAuthPage.js").then((m) => ({ default: m.PortalAuthPage }))
);
const PortalReservationPage = React.lazy(() =>
  import("./pages/portal/PortalReservationPage.js").then((m) => ({ default: m.PortalReservationPage }))
);
const CustomersListPage = React.lazy(() =>
  import("./pages/CustomersListPage.js").then((m) => ({ default: m.CustomersListPage }))
);
const CustomerDetailPage = React.lazy(() =>
  import("./pages/CustomerDetailPage.js").then((m) => ({ default: m.CustomerDetailPage }))
);
const EnquiriesListPage = React.lazy(() =>
  import("./pages/EnquiriesListPage.js").then((m) => ({ default: m.EnquiriesListPage }))
);
const ReservationsListPage = React.lazy(() =>
  import("./pages/ReservationsListPage.js").then((m) => ({ default: m.ReservationsListPage }))
);
const ReservationDetailPage = React.lazy(() =>
  import("./pages/ReservationDetailPage.js").then((m) => ({ default: m.ReservationDetailPage }))
);
const PaymentsListPage = React.lazy(() =>
  import("./pages/PaymentsListPage.js").then((m) => ({ default: m.PaymentsListPage }))
);
const AuditLogsPage = React.lazy(() =>
  import("./pages/AuditLogsPage.js").then((m) => ({ default: m.AuditLogsPage }))
);
const DesignSystemShowcase = React.lazy(() =>
  import("./pages/DesignSystemShowcase.js").then((m) => ({ default: m.DesignSystemShowcase }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4">
      <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Authentication Pages */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected Staff & Admin Pages */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredPermission="reports:operational">
                    <AdminLayout>
                      <DashboardPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/offers"
                element={
                  <ProtectedRoute requiredPermission="offers:read">
                    <AdminLayout>
                      <OffersListPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/departures"
                element={
                  <ProtectedRoute requiredPermission="offers:read">
                    <AdminLayout>
                      <DeparturesPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/customers"
                element={
                  <ProtectedRoute requiredPermission="customers:read">
                    <AdminLayout>
                      <CustomersListPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/customers/:id"
                element={
                  <ProtectedRoute requiredPermission="customers:read">
                    <AdminLayout>
                      <CustomerDetailPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/enquiries"
                element={
                  <ProtectedRoute requiredPermission="enquiries:read">
                    <AdminLayout>
                      <EnquiriesListPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/reservations"
                element={
                  <ProtectedRoute requiredPermission="reservations:read">
                    <AdminLayout>
                      <ReservationsListPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/reservations/:id"
                element={
                  <ProtectedRoute requiredPermission="reservations:read">
                    <AdminLayout>
                      <ReservationDetailPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute requiredPermission="payments:read">
                    <AdminLayout>
                      <PaymentsListPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/documents"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <DocumentsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <ReportsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredPermission="users:manage">
                    <AdminLayout>
                      <StaffUsersPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute requiredPermission="audit:read">
                    <AdminLayout>
                      <AuditLogsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Design System Living Gallery */}
              <Route
                path="/design-system"
                element={
                  <AdminLayout>
                    <DesignSystemShowcase />
                  </AdminLayout>
                }
              />

              {/* Customer Portal Public & Magic Link Routes */}
              <Route path="/portal" element={<PortalAuthPage />} />
              <Route path="/portal/my-bookings" element={<PortalReservationPage />} />
              <Route path="/portal/reservations/:id" element={<PortalReservationPage />} />

              {/* Default Redirection */}
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;
