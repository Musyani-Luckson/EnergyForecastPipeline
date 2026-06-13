import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../../global/hooks/useAuth";

const PublicRoute = () => {
  const { isAuthenticated } = useUser();

  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default PublicRoute;
