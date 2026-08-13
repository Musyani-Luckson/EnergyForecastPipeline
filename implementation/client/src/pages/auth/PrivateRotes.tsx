import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../state-manager/hooks/authHook";
import Loader from "../../components/Loader";

/** Guards protected routes: waits out session verification, then requires auth. */
const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loader label="Verifying session…" />;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  return <Outlet />;
};

export default PrivateRoute;
