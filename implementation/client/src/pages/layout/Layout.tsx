import { Bell } from "lucide-react";
import Account from "../../components/Account";
import NavLinks from "../../components/NavLinks";
import ResponsiveNav from "../../components/ResponsiveNav";
import Workspace from "./Workspace";

function Layout() {
  const isAuthenticated = true;
  const loading = false;

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden h-screen flex flex-col">
        {/* Fixed Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-blue-950 border-b border-blue-900">
          {/* Left */}
          <div>
            <ResponsiveNav
              NavLinks={NavLinks}
              appName="BEDFDSS"
              isAuthenticated={isAuthenticated}
              loading={loading}
            />
          </div>

          {/* Center */}
          <div className="flex-1 px-3">
            <h1 className="text-white font-semibold text-lg">BEDFDSS</h1>
          </div>

          {/* Right */}
          <button className="relative text-white">
            <Bell size={22} />

            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <Workspace />
        </div>
        {/* Optional Bottom Navigation */}
        <div className="shrink-0 border-t border-gray-700 bg-blue-950 p-3">
          Bottom Navigation
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar */}
        <div className="w-20 lg:w-72 bg-blue-950 flex flex-col">
          <div className="h-25 bg-gray-900 shrink-0" />

          <div className="flex-1 overflow-y-auto p-4">
            <ResponsiveNav
              NavLinks={NavLinks}
              appName="BEDFDSS"
              isAuthenticated={isAuthenticated}
              loading={loading}
            />
          </div>

          <div className="h-15 border-t-2 border-gray-600 flex items-center justify-center shrink-0">
            <Account />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <Workspace />
        </div>
      </div>
    </>
  );
}

export default Layout;
