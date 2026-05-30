import { Routes, Route } from "react-router-dom";
import Layout from "../pages/layout/Layout";
import PublicRoute from "../pages/auth/PublicRoutes";
import PrivateRoute from "../pages/auth/PrivateRotes";
import SigninPage from "../pages/auth/SigninPage";
// import Views from "../pages/views";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/signin" element={<SigninPage />} />
      </Route>

      {/* Main Layout */}
      <Route element={<Layout />}>
        {/* Private routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<div>Overview</div>} />
          <Route path="/new-forecast" element={<div>New forecast</div>} />
          <Route path="/forecasts" element={<div>Forecasts</div>} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
