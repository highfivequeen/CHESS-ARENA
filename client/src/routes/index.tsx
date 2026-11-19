import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import NotFound from "../pages/NotFound";
import { readGuestGameSession } from "../guestSession";
import ChessLoadingScreen from "../components/ChessLoadingScreen";

const MainApp = lazy(() => import("../pages/MainApp"));
const AuthPage = lazy(() => import("../pages/AuthPage"));
const PlayPage = lazy(() => import("../pages/PlayPage"));
const ComputerGamePage = lazy(() => import("../pages/ComputerGamePage"));

function getAuthReturnPath() {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  return requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <ChessLoadingScreen message="Vérification de votre session…" />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <NavigationProvider>{children}</NavigationProvider>;
}

function PublicPlayRoute() {
  return (
    <NavigationProvider>
      <PlayPage onNavigate={() => {}} />
    </NavigationProvider>
  );
}

function PublicHomeRoute() {
  return (
    <NavigationProvider>
      <MainApp />
    </NavigationProvider>
  );
}

function PublicComputerRoute() {
  const navigate = useNavigate();
  return (
    <NavigationProvider>
      <ComputerGamePage onExit={() => navigate("/")} />
    </NavigationProvider>
  );
}

export default function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <ChessLoadingScreen message="Vérification de votre session…" />;

  return (
    <Suspense fallback={<ChessLoadingScreen message="Chargement de la page…" />}>
      <Routes>
      {/* Auth */}
      <Route
        path="/auth"
        element={
          user ? (
            <Navigate to={getAuthReturnPath()} replace />
          ) : (
            <AuthPage onAuthSuccess={() => navigate(getAuthReturnPath(), { replace: true })} />
          )
        }
      />

      {/* App principale */}
      <Route
        path="/"
        element={
          user && !readGuestGameSession() ? (
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          ) : !user && !readGuestGameSession() ? (
            <PublicHomeRoute />
          ) : (
            <PublicPlayRoute />
          )
        }
      />

      {/* Liens de défi — PlayPage les lit via window.location.pathname */}
      <Route
        path="/challenge/:userId"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenge-link/:token"
        element={
          user ? (
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          ) : (
            <PublicPlayRoute />
          )
        }
      />
      <Route path="/guest-game/:token" element={<PublicPlayRoute />} />
      <Route
        path="/computer"
        element={
          user ? (
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          ) : (
            <PublicComputerRoute />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
