import AppRoutes from "./router/AppRoutes";
import { AppProviders } from "./state-manager/AppProviders";

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
export default App;
