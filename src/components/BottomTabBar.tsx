import { NavLink } from "react-router-dom";
import { Home, Package, CalendarClock, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/plan", label: "Plan", icon: CalendarClock },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function BottomTabBar() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="flex items-stretch justify-between px-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    fill={isActive ? "currentColor" : "none"}
                    className={isActive ? "text-primary" : "text-muted"}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
