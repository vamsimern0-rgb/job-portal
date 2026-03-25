import { useEffect, useState } from "react";
import {
  Activity,
  Briefcase,
  Calendar,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  UserPlus,
  Users,
  X,
  Zap
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

export default function Sidebar({
  collapsed,
  toggleCollapse,
  mobileOpen,
  setMobileOpen
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(
    localStorage.getItem("hrRole") || localStorage.getItem("role") || ""
  );

  useEffect(() => {
    const syncRole = () => {
      setRole(localStorage.getItem("hrRole") || localStorage.getItem("role") || "");
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    return () => window.removeEventListener("storage", syncRole);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  const logout = () => {
    localStorage.clear();
    navigate("/hr/login");
  };

  const linkClass =
    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200";

  const isRouteActive = (patterns = []) =>
    patterns.some(
      (pattern) =>
        location.pathname === pattern || location.pathname.startsWith(`${pattern}/`)
    );

  const renderLink = (to, label, Icon, allowedRoles = [], matchRoutes = [to]) => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return null;
    }

    const active = isRouteActive(matchRoutes);

    return (
      <NavLink
        key={to}
        to={to}
        className={() =>
          `${linkClass} ${
            active
              ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/30"
              : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
          }`
        }
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-dvh flex-col overflow-y-auto border-r border-slate-700/50
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white backdrop-blur-sm
          transition-all duration-300 ease-in-out md:sticky md:h-screen
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-5 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Zap size={16} className="text-white" />
              </div>
              <h2 className="whitespace-nowrap bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-lg font-bold text-transparent">
                Recruiter
              </h2>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden text-slate-400 transition hover:text-slate-200 md:block"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="text-slate-400 transition hover:text-slate-200 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-2 px-4 py-6">
          {renderLink("/hr/dashboard", "Dashboard", LayoutDashboard)}
          {renderLink("/hr/create-job", "Create Job", Briefcase, ["Founder", "HR Manager"])}
          {renderLink("/hr/jobs", "Jobs", Briefcase, [], ["/hr/jobs"])}
          {renderLink("/hr/candidates", "Candidates", Users, [], ["/hr/candidates"])}
          {renderLink("/hr/ats", "ATS", FileSearch, [], ["/hr/ats"])}
          {renderLink("/hr/pipeline", "Pipeline", GitBranch, [], ["/hr/pipeline"])}
          {renderLink("/hr/calendar", "Interviews", Calendar, [], ["/hr/calendar", "/hr/interviews"])}
          {renderLink("/hr/timeline", "Activity Timeline", Activity, [], ["/hr/timeline", "/hr/activity"])}
          {renderLink("/hr/profile", "Profile", User, [], ["/hr/profile"])}
          {renderLink("/hr/team", "Team Management", UserPlus, ["Founder", "HR Manager"], ["/hr/team"])}
        </div>

        <div className="shrink-0 border-t border-slate-700/50 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600/80 to-red-700/80 py-2.5 font-semibold text-white shadow-lg shadow-red-900/30 transition hover:from-red-600 hover:to-red-700"
          >
            <LogOut size={16} />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
