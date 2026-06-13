import { Routes, Route } from "react-router-dom";
import Layout from "../pages/layout/Layout";
import PublicRoute from "../pages/auth/PublicRoutes";
import PrivateRoute from "../pages/auth/PrivateRotes";
import SigninPage from "../pages/auth/SigninPage";
import Overview from "../pages/overview/Overview";
import NewForecast from "../pages/newForecast/NewForecast";
import Forecasts from "../pages/forecasts/Forecasts";
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
          <Route path="/" element={<Overview />} />
          <Route path="/new-forecast" element={<NewForecast />} />
          <Route path="/forecasts" element={<Forecasts />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
