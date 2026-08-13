import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Database, Users, Settings, Zap, Bell, Menu, X, LogOut,
} from "lucide-react";
import { useAuth } from "../../state-manager/hooks/authHook";
import { canManageUsers } from "../users/roles";

const NAV = [
  { name: "Dashboard", link: "/",         icon: LayoutDashboard },
  { name: "Datasets",  link: "/datasets", icon: Database },
  // User administration is admin-only, so managers never see the entry point.
  { name: "Users",     link: "/users",    icon: Users, adminOnly: true },
  { name: "Settings",  link: "/settings", icon: Settings },
];

function initials(first?: string, last?: string, username?: string): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return "??";
}

function displayName(first?: string, last?: string, username?: string): string {
  const full = `${first ?? ""} ${last ?? ""}`.trim();
  return full || username || "User";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const items = NAV.filter((item) => !item.adminOnly || canManageUsers(role));

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map(({ name, link, icon: Icon }) => (
        <NavLink
          key={name}
          to={link}
          end={link === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span>{name}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function AccountStrip({ showLogout = true }: { showLogout?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="h-8 w-8 rounded-full bg-blue-600 grid place-items-center text-white text-xs font-bold shrink-0">
        {initials(user?.first_name, user?.last_name, user?.username)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {displayName(user?.first_name, user?.last_name, user?.username)}
        </p>
        <p className="text-xs text-gray-400 truncate">{user?.email ?? ""}</p>
      </div>
      {showLogout && (
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-blue-600 grid place-items-center shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">BEFDSS</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Energy Forecast System</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <p className="px-6 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Navigation
          </p>
          <SidebarNav />
        </div>

        <div className="border-t border-gray-100 p-3">
          <AccountStrip />
        </div>
      </aside>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 grid place-items-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">BEFDSS</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </div>
        <div className="border-t border-gray-100 p-3">
          <AccountStrip showLogout={false} />
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500 hover:text-gray-900">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-600 grid place-items-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">BEFDSS</span>
          </div>
          <button className="text-gray-500 hover:text-gray-900" title="Notifications">
            <Bell className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop topbar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <div />
          <button className="text-gray-400 hover:text-gray-700 transition-colors" title="Notifications">
            <Bell className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
