import { useState } from "react";
import type { FC } from "react";
import {
  X,
  Menu,
  LogIn,
  // LogIn, Loader, Settings, LogOut, User
} from "lucide-react";
import { Link } from "react-router-dom";
import Loader from "./Loader";
import Account from "./Account";

interface ResponsiveNavProps {
  NavLinks: FC<{ showLabels: boolean; showIcons: boolean; className: string }>;
  appName?: string;
  logo?: string;
  isAuthenticated?: boolean;
  loading?: boolean;
  onLogout?: () => void;
}

function ResponsiveNav({
  NavLinks,
  appName = "APP",
  logo = "./android-chrome-192x192.png",
  isAuthenticated = false,
  loading = false,
  // onLogout,
}: ResponsiveNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <>
      {/* Hamburger Button (all screens below lg) */}
      <button
        onClick={toggleMenu}
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-900"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Tablets Nav (tabs ) */}
      <div className="hidden md:block lg:hidden">
        <NavLinks
          showLabels={false}
          showIcons
          className="flex flex-col gap-4 items-center justify-center text-gray-300"
        />
      </div>

      {/* Desktop Nav (lg and above) */}
      <div className="hidden lg:block">
        <NavLinks
          showLabels
          showIcons
          className="flex flex-col gap-4 text-gray-300"
        />
      </div>

      {/* Overlay */}
      <div
        onClick={toggleMenu}
        className={`fixed inset-0 bg-black/50 transition-opacity z-40 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-blue-950 shadow-lg z-50 transform transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-900">
          <Link to="/" onClick={toggleMenu} className="flex items-center gap-2">
            <img src={logo} alt="logo" className="w-6 h-6" />
            <span className="font-bold text-lg text-white">{appName}</span>
          </Link>

          <button onClick={toggleMenu}>
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Links (STACKED ALWAYS) */}
        <div className="flex flex-col gap-6 p-6" onClick={toggleMenu}>
          <NavLinks
            showLabels
            showIcons
            className="flex flex-col gap-6 text-gray-300"
          />
        </div>

        {/* Bottom Auth Section */}
        <div className="absolute bottom-0 left-0 w-full p-6 border-t">
          {loading ? (
            <Loader />
          ) : isAuthenticated ? (
            <div className="flex flex-col gap-3">
              <Account />
              {/* <Link to="/profile" className="flex items-center gap-2">
                <User size={18} /> Profile
              </Link>

              <Link to="/settings" className="flex items-center gap-2">
                <Settings size={18} /> Settings
              </Link>

              <button
                // onClick={onLogout}
                className="flex items-center gap-2 text-red-500"
              >
                <LogOut size={18} /> Sign out
              </button> */}
            </div>
          ) : (
            <Link to="/signin" className="flex items-center gap-2">
              <LogIn size={18} /> Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

export default ResponsiveNav;
