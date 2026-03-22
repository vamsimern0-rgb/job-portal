import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, Crown, Shield, UserCheck, Eye, Search } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../components/ui/ToastProvider";

export default function TeamManagement() {
  const toast = useToast();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentRole, setCurrentRole] = useState(
    localStorage.getItem("hrRole") || localStorage.getItem("role") || ""
  );

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Recruiter"
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const canManageUsers = currentRole === "Founder";

  useEffect(() => {
    const syncRole = () => {
      setCurrentRole(localStorage.getItem("hrRole") || localStorage.getItem("role") || "");
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    return () => window.removeEventListener("storage", syncRole);
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/hr/team");
      setTeam(Array.isArray(res.data) ? res.data : res.data?.team || []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const createUser = async () => {
    if (!canManageUsers) {
      toast.error("Only Founder can add team members");
      return;
    }

    if (!newUser.fullName.trim()) {
      toast.error("Please enter full name");
      return;
    }
    if (!newUser.email.trim()) {
      toast.error("Please enter email");
      return;
    }
    if (!newUser.password.trim()) {
      toast.error("Please enter password");
      return;
    }

    try {
      setCreatingUser(true);
      await api.post("/hr/create-user", newUser);
      setNewUser({
        fullName: "",
        email: "",
        password: "",
        role: "Recruiter"
      });
      fetchTeam();
      toast.success("Team member added successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const changeRole = async (id, newRole) => {
    if (!canManageUsers) {
      toast.error("Only Founder can update team roles");
      return;
    }

    try {
      await api.put(`/team/${id}/role`, { role: newRole });
      fetchTeam();
      toast.success("Role updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    }
  };

  const removeMember = async (id) => {
    if (!canManageUsers) {
      toast.error("Only Founder can remove team members");
      return;
    }

    try {
      await api.delete(`/team/${id}`);
      setDeleteConfirm(null);
      fetchTeam();
      toast.success("Team member removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const filteredTeam = team.filter(
    (member) =>
      (member?.fullName || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (member?.email || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        {/* ================= HEADER ================= */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Team Management</h1>
          </div>
          <p className="text-slate-400 ml-13">Manage company recruiters, HR managers, and hiring team members</p>
        </div>

        {/* ================= CREATE USER SECTION ================= */}
        <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Plus size={20} className="text-emerald-500" />
            <h2 className="text-xl font-bold text-white">Add New Team Member</h2>
          </div>
          {!canManageUsers && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Founder access is required to add, remove, or change team roles.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Full Name */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={newUser.fullName}
                disabled={!canManageUsers}
                onChange={(e) =>
                  setNewUser({ ...newUser, fullName: e.target.value })
                }
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition group-hover:border-slate-600/50"
              />
            </div>

            {/* Email */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">Email Address</label>
              <input
                type="email"
                placeholder="john@company.com"
                value={newUser.email}
                disabled={!canManageUsers}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition group-hover:border-slate-600/50"
              />
            </div>

            {/* Password */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">Temporary Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                disabled={!canManageUsers}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition group-hover:border-slate-600/50"
              />
            </div>

            {/* Role */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">Role</label>
              <select
                value={newUser.role}
                disabled={!canManageUsers}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition appearance-none cursor-pointer group-hover:border-slate-600/50"
              >
                <option>HR Manager</option>
                <option>Recruiter</option>
                <option>Hiring Manager</option>
                <option>Viewer</option>
              </select>
            </div>
          </div>

          <button
            onClick={createUser}
            disabled={!canManageUsers || creatingUser || !newUser.fullName.trim()}
            className="mt-6 w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {creatingUser ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} />
                Add Team Member
              </>
            )}
          </button>
        </div>

        {/* ================= TEAM LIST SECTION ================= */}
        <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-white">Company Team Members ({filteredTeam.length})</h2>
            
            {team.length > 0 && (
              <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 flex-1 sm:flex-none">
                <Search size={16} className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-transparent outline-none text-slate-100 placeholder-slate-600 w-full text-sm"
                />
              </div>
            )}
          </div>

          {filteredTeam.length === 0 ? (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400 font-medium">No team members found</p>
              <p className="text-slate-600 text-sm mt-1">Add your first team member above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeam.map((member) => (
                <TeamMemberRow
                  key={member._id}
                  member={member}
                  canManageUsers={canManageUsers}
                  onChangeRole={changeRole}
                  onDelete={() => setDeleteConfirm(member._id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
              <div className="text-red-500 text-3xl mb-3 text-center">⚠️</div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Remove Team Member?</h3>
              <p className="text-slate-400 text-center mb-6">
                This action cannot be undone. Are you sure you want to remove this team member?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeMember(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ================= HELPER COMPONENTS =================

function TeamMemberRow({ member, canManageUsers, onChangeRole, onDelete }) {
  const isFounder = member?.role === "Founder";

  const getRoleIcon = (role) => {
    switch (role) {
      case "HR Manager":
        return <Crown size={16} className="text-amber-500" />;
      case "Hiring Manager":
        return <Shield size={16} className="text-blue-500" />;
      case "Recruiter":
        return <UserCheck size={16} className="text-emerald-500" />;
      case "Viewer":
        return <Eye size={16} className="text-slate-500" />;
      default:
        return <Users size={16} className="text-slate-500" />;
    }
  };

  const getRoleBgColor = (role) => {
    switch (role) {
      case "HR Manager":
        return "from-amber-600 to-amber-700";
      case "Hiring Manager":
        return "from-blue-600 to-blue-700";
      case "Recruiter":
        return "from-emerald-600 to-emerald-700";
      case "Viewer":
        return "from-slate-600 to-slate-700";
      default:
        return "from-slate-600 to-slate-700";
    }
  };

  return (
    <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/50 transition group">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getRoleBgColor(member.role)} flex items-center justify-center flex-shrink-0`}>
              {getRoleIcon(member.role)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-white">
                {member.fullName || "Unnamed User"}
              </h4>
              <p className="text-sm text-slate-400 break-all">
                {member.email || "No email"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={member.role}
            disabled={!canManageUsers || isFounder}
            onChange={(e) => onChangeRole(member._id, e.target.value)}
            className="border border-slate-700/50 bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-100 hover:border-slate-600 focus:ring-1 focus:ring-emerald-500/50 outline-none transition appearance-none cursor-pointer"
          >
            <option>HR Manager</option>
            <option>Recruiter</option>
            <option>Hiring Manager</option>
            <option>Viewer</option>
          </select>

          {canManageUsers && !isFounder && (
            <button
              onClick={() => onDelete(member._id)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/30 rounded-lg text-sm font-medium transition"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Remove</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
