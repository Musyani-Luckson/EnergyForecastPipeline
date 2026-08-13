import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../state-manager/hooks/authHook";
import Loader from "../../components/Loader";

/** Guards public-only routes (e.g. sign-in): redirects authenticated users home. */
const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loader label="Verifying session…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default PublicRoute;
