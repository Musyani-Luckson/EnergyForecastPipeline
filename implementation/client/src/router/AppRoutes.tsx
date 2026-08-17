import { Routes, Route, BrowserRouter } from "react-router-dom";
import PublicRoute from "../pages/auth/PublicRoutes";
import PrivateRoute from "../pages/auth/PrivateRotes";
import Layout from "../pages/layout/Layout";
import SigninPage from "../pages/auth/SigninPage";
import Dashboard from "../pages/dashboard/Dashboard";
import Datasets from "../pages/datasets/Datasets";
import DatasetDetails from "../pages/datasets/DatasetDetails";
import DatasetWorkflow from "../pages/datasets/DatasetWorkflow";
import ForecastPage from "../pages/dashboard/ForecastPage";
import Users from "../pages/users/Users";
import Settings from "../pages/settings/Settings";
import NotFoundPage from "../pages/NotFoundPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: redirects to "/" once authenticated */}
        <Route element={<PublicRoute />}>
          <Route path="/signin" element={<SigninPage />} />
        </Route>

        {/* Protected: requires authentication (session verified first) */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/datasets/:runId" element={<DatasetDetails />} />
            <Route
              path="/datasets/:runId/versions/:versionId"
              element={<DatasetWorkflow />}
            />
            <Route
              path="/datasets/:runId/forecast"
              element={<ForecastPage />}
            />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            {/* Unknown authenticated routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
