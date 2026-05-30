import Account from "../../components/Account";
import NavLinks from "../../components/NavLinks";
import ResponsiveNav from "../../components/ResponsiveNav";
import Workspace from "./Workspace";

function Layout() {
  const isAuthenticated = true;
  const loading = false;

  return (
    <div className="md:flex md:min-h-screen md:absolute md:inset-0">
      {/* Mobile */}
      <div className="grid md:hidden grid-cols-[1fr_auto] items-center gap-4 px-2 py-2 bg-blue-950">
        <div className="text-white text-semibold">BEDFDSS</div>

        <ResponsiveNav
          NavLinks={NavLinks}
          appName="BEDFDSS"
          isAuthenticated={isAuthenticated}
          loading={loading}
        />
      </div>

      {/* Sidebar */}
      <div className="hidden md:flex md:w-20 lg:w-72 overflow-auto transition-all duration-300 bg-blue-950 border-0">
        <div className="flex flex-col h-full w-full border-0">
          <div className="shrink-0 h-25 border-0 bg-gray-900"></div>

          <div className="flex-1 overflow-auto p-4">
            <ResponsiveNav
              NavLinks={NavLinks}
              appName="BEDFDSS"
              isAuthenticated={isAuthenticated}
              loading={loading}
            />
          </div>

          <div className="shrink-0 h-15 border-t-2 border-gray-600 flex items-center justify-center">
            <Account />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1">
        <Workspace />
      </div>
    </div>
  );
}

export default Layout;
