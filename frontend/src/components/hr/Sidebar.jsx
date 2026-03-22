import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileSearch,
  GitBranch,
  Calendar,
  Activity,
  User,
  LogOut,
  UserPlus,
  Menu,
  X,
  Zap
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar({
  collapsed,
  toggleCollapse,
  mobileOpen,
  setMobileOpen
}) {
  const navigate = useNavigate();
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

  const logout = () => {
    localStorage.clear();
    navigate("/hr/login");
  };

  const linkClass =
    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200";

  const renderLink = (to, label, Icon, allowedRoles = []) => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return null;
    }

    return (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `${linkClass} ${
            isActive
              ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/40"
          }`
        }
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative
          top-0 left-0
          z-50
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
          text-white
          border-r border-slate-700/50
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col
          h-full
          backdrop-blur-sm
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent whitespace-nowrap">
                Recruiter
              </h2>
            </div>
          )}

          <button onClick={toggleCollapse} className="hidden md:block text-slate-400 hover:text-slate-200 transition">
            <Menu size={18} />
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2">

          {renderLink("/hr/dashboard", "Dashboard", LayoutDashboard)}

          {renderLink(
            "/hr/create-job",
            "Create Job",
            Briefcase,
            ["Founder", "HR Manager"]
          )}

          {renderLink("/hr/jobs", "Jobs", Briefcase)}

          {renderLink("/hr/candidates", "Candidates", Users)}

          {renderLink("/hr/ats", "ATS", FileSearch)}

          {renderLink("/hr/pipeline", "Pipeline", GitBranch)}

          {/* ✅ FIXED ROUTES BELOW */}

          {renderLink("/hr/calendar", "Interviews", Calendar)}

          {renderLink("/hr/timeline", "Activity Timeline", Activity)}

          {renderLink("/hr/profile", "Profile", User)}

          {renderLink(
            "/hr/team",
            "Team Management",
            UserPlus,
            ["Founder", "HR Manager"]
          )}

        </div>

        <div className="p-4 border-t border-slate-700/50 shrink-0">
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 text-white py-2.5 rounded-lg font-semibold transition shadow-lg shadow-red-900/30"
          >
            <LogOut size={16} />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
