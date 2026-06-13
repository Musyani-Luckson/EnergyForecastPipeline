import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Plus, ChartNoAxesColumn } from "lucide-react";

interface NavLinksProps extends React.HTMLAttributes<HTMLDivElement> {
  showIcons?: boolean;
  showLabels?: boolean;
  className?: string;
  hover?: string;
  activeClassName?: string;
}

function NavLinks({
  showIcons = false,
  showLabels = true,
  className = "flex gap-6 ",
  hover = "hover:text-white",
  activeClassName = "text-brand font-bold",
}: NavLinksProps) {
  const navItems: { name: string; link: string; icon?: React.ReactNode }[] = [
    {
      name: "Overview",
      link: "/",
      icon: <Home className="w-7 h-7" />,
    },
    {
      name: "New forecast",
      link: "/new-forecast",
      icon: <Plus className="w-7 h-7" />,
    },
    {
      name: "Forecasts",
      link: "/forecasts",
      icon: <ChartNoAxesColumn className="w-7 h-7" />,
    },
  ];

  return (
    <nav className={className}>
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.link}
          className={({ isActive }) =>
            `flex items-center gap-2 py-2 ${hover} ${
              isActive ? activeClassName : ""
            }`
          }
        >
          {showIcons && item.icon}
          {showLabels && (
            <span className="text-md font-medium">{item.name}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default NavLinks;
