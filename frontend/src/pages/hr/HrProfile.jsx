import { createElement, useCallback, useEffect, useState } from "react";
import { Building2, Mail, Phone, MapPin, Globe, Users, Lock, Edit2, Check, X } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../components/ui/ToastProvider";
import { getAssetBaseUrl } from "../../config/runtime";

const ASSET_BASE_URL = getAssetBaseUrl();

const toAssetUrl = (value = "") =>
  `${ASSET_BASE_URL.replace(/\/+$/, "")}/${String(value || "").replace(/^\/+/, "")}`;

export default function HrProfile() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: ""
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/hr/profile");
      const nextProfile =
        res?.data && typeof res.data === "object" && res.data.hr
          ? res.data.hr
          : res?.data;

      if (!nextProfile || typeof nextProfile !== "object") {
        throw new Error("Invalid profile response");
      }

      setProfile(nextProfile);

      if (nextProfile.role === "Founder") {
        const teamRes = await api.get("/hr/team");
        setTeam(Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.team || []);
      } else {
        setTeam([]);
      }
    } catch (err) {
      console.log(err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      await api.put("/hr/profile", profile);
      setEditing(false);
      fetchProfile();
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Update failed");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      setUploading(true);
      await api.put("/hr/profile/upload-logo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setLogoPreview(URL.createObjectURL(file));
      fetchProfile();
      toast.success("Logo uploaded successfully");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      await api.put("/hr/profile/change-password", passwordData);
      toast.success("Password changed successfully");
      setPasswordData({ currentPassword: "", newPassword: "" });
      setShowPassword(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const logoSrc =
    logoPreview ||
    (profile.companyLogo
      ? toAssetUrl(profile.companyLogo)
      : "https://dummyimage.com/200x200/059669/ffffff&text=Logo");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-20 blur-xl" />
          <div className="relative bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 rounded-2xl p-6 md:p-12 border border-emerald-600/50">
            <div className="flex flex-col md:flex-row gap-10 md:gap-12 items-center md:items-start">
              
              {/* Logo */}
              <div className="relative group flex-shrink-0">
                <img
                  src={logoSrc}
                  alt="Company Logo"
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-white shadow-xl"
                />
                {editing && (
                  <label className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-all">
                    <span className="text-white text-xs font-bold">Change Logo</span>
                    <input
                      type="file"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                      accept="image/*"
                    />
                  </label>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
                    <Building2 className="w-8 h-8" />
                    {profile.companyName}
                  </h1>
                  <p className="text-emerald-100 text-sm md:text-base mt-2">
                    {profile.industry} • {profile.city}, {profile.country}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-4 py-2 bg-white/15 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-white/20">
                    {profile.role}
                  </span>
                  {profile.role === "Founder" && (
                    <span className="px-4 py-2 bg-amber-400/90 text-amber-900 text-xs font-bold rounded-lg">
                      ⭐ Founder Account
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard 
            icon={Globe} 
            label="Open Positions" 
            value={profile.openPositions || 0}
            color="from-blue-700 to-indigo-800"
          />
          <StatCard 
            icon={Users} 
            label="Team Members" 
            value={profile.role === "Founder" ? Math.max(team.length, 1) : 1}
            color="from-emerald-700 to-teal-800"
          />
          <StatCard 
            icon={Building2} 
            label="Industry" 
            value={profile.industry || "—"}
            color="from-amber-700 to-orange-800"
          />
          <StatCard 
            icon={Globe} 
            label="Website" 
            value={profile.website ? "Active" : "—"}
            color="from-purple-700 to-pink-800"
          />
        </div>

        {/* Profile Info */}
        {!editing ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-emerald-400" />
                Company Information
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoDisplay icon={Building2} label="Company Name" value={profile.companyName} />
              <InfoDisplay icon={Mail} label="Email" value={profile.email} />
              <InfoDisplay icon={Phone} label="Phone" value={profile.phone} />
              <InfoDisplay icon={MapPin} label="City" value={profile.city} />
              <InfoDisplay icon={MapPin} label="Country" value={profile.country} />
              <InfoDisplay icon={Globe} label="Website" value={profile.website} />
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 border-b border-slate-700/50 pb-4">
              <Edit2 className="w-6 h-6 text-emerald-400" />
              Edit Profile
            </h2>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { name: "companyName", label: "Company Name", icon: Building2 },
                { name: "industry", label: "Industry", icon: Globe },
                { name: "city", label: "City", icon: MapPin },
                { name: "country", label: "Country", icon: MapPin },
                { name: "website", label: "Website", icon: Globe },
                { name: "fullName", label: "Full Name", icon: Users },
                { name: "phone", label: "Phone", icon: Phone },
                { name: "openPositions", label: "Open Positions", icon: Globe }
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <field.icon className="w-4 h-4" />
                    {field.label}
                  </label>
                  <input
                    type={field.name === "openPositions" ? "number" : "text"}
                    name={field.name}
                    value={profile[field.name] || ""}
                    onChange={handleChange}
                    className="w-full bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 rounded-lg px-4 py-2.5 transition-all"
                  />
                </div>
              ))}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  value={profile.description || ""}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 rounded-lg px-4 py-2.5 resize-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-lg transition-all"
            >
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={handleUpdate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-lg transition-all"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-all"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </>
          )}

          <button
            onClick={() => setShowPassword(!showPassword)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-all"
          >
            <Lock className="w-4 h-4" /> {showPassword ? "Hide" : "Security"}
          </button>
        </div>

        {/* Team Section */}
        {profile.role === "Founder" && team.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 border-b border-slate-700/50 pb-4">
              <Users className="w-6 h-6 text-emerald-400" />
              Team Members ({team.length})
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {team.map((member) => (
                <div
                  key={member._id}
                  className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-5 hover:border-emerald-500/50 hover:shadow-lg transition-all"
                >
                  <p className="font-semibold text-slate-100 line-clamp-1">{member.fullName}</p>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1">{member.email}</p>
                  <span className="inline-block mt-3 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-300 rounded-lg border border-emerald-500/30">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Section */}
        {showPassword && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3 border-b border-slate-700/50 pb-4">
              <Lock className="w-6 h-6 text-amber-400" />
              Change Password
            </h2>

            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value
                    })
                  }
                  className="w-full bg-slate-700/50 border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-slate-200 placeholder-slate-500 rounded-lg px-4 py-2.5 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value
                    })
                  }
                  className="w-full bg-slate-700/50 border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-slate-200 placeholder-slate-500 rounded-lg px-4 py-2.5 transition-all"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white font-bold rounded-lg transition-all mt-2"
              >
                Update Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoDisplay({ icon, label, value }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        {createElement(icon, { className: "w-4 h-4" })}
        {label}
      </p>
      <p className="text-lg font-semibold text-slate-100">{value || "—"}</p>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} border border-slate-700/30 rounded-xl p-5 md:p-6 group hover:shadow-lg transition-all`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity rounded-xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          {createElement(icon, { className: "w-5 h-5 text-slate-300" })}
        </div>
        <p className="text-3xl font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}
