import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { Login } from "@/routes/Login";
import { Onboarding } from "@/routes/Onboarding";
import { Schedule } from "@/routes/Schedule";
import { OrderDetail } from "@/routes/OrderDetail";
import { ReportIssue } from "@/routes/ReportIssue";
import { Home } from "@/routes/Home";
import { Orders } from "@/routes/Orders";
import { Plan } from "@/routes/Plan";
import { Profile } from "@/routes/Profile";
import { ProfileEdit } from "@/routes/ProfileEdit";
import { Notifications } from "@/routes/Notifications";

export function App() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)
    ?.backgroundLocation;

  return (
    <AuthProvider>
      <div className="app-shell">
        <Routes location={backgroundLocation ?? location}>
          <Route path="/login" element={<Login />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route
            path="/schedule"
            element={
              <RequireAuth>
                <Schedule />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RequireAuth>
                <OrderDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <RequireAuth>
                <ProfileEdit />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {backgroundLocation && (
          <Routes>
            <Route
              path="/orders/:id/issue"
              element={
                <RequireAuth>
                  <ReportIssue />
                </RequireAuth>
              }
            />
          </Routes>
        )}
      </div>
    </AuthProvider>
  );
}
