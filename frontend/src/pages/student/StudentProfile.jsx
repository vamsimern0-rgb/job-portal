import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import {
  Upload,
  Plus,
  X,
  Loader2,
  UserCircle2,
  Mail,
  Phone,
  MapPin,
  Link2,
  GraduationCap,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import { getAssetBaseUrl } from "../../config/runtime";

const API_ASSET_BASE = getAssetBaseUrl();

const normalizeString = (value = "") => String(value ?? "").trim();

const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];

const normalizeYear = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeEducation = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry = {}) => ({
      institution: normalizeString(entry.institution),
      degree: normalizeString(entry.degree),
      field: normalizeString(entry.field),
      startYear: normalizeYear(entry.startYear),
      endYear: normalizeYear(entry.endYear)
    }))
    .filter(
      (entry) =>
        entry.institution ||
        entry.degree ||
        entry.field ||
        entry.startYear ||
        entry.endYear
    );

const normalizeDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export default function StudentProfile() {
  const toast = useToast();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/student/profile");
      setStudent({
        ...data,
        skills: Array.isArray(data.skills) ? data.skills : [],
        education: Array.isArray(data.education) ? data.education : [],
        communicationPreferences: {
          emailJobAlerts: data.communicationPreferences?.emailJobAlerts ?? true,
          inAppAlerts: data.communicationPreferences?.inAppAlerts ?? true
        },
        jobAlertSettings: {
          minMatchScore: data.jobAlertSettings?.minMatchScore ?? 60,
          preferredLocations: data.jobAlertSettings?.preferredLocations || [],
          preferredEmploymentTypes: data.jobAlertSettings?.preferredEmploymentTypes || []
        }
      });
      setError(null);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Failed to load profile");
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async () => {
    if (!student?.fullName?.trim()) {
      toast.error("Full name is required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        fullName: normalizeString(student.fullName),
        phone: normalizeString(student.phone),
        location: normalizeString(student.location),
        headline: normalizeString(student.headline),
        currentRole: normalizeString(student.currentRole),
        dateOfBirth: normalizeDateValue(student.dateOfBirth),
        linkedin: normalizeString(student.linkedin),
        github: normalizeString(student.github),
        portfolio: normalizeString(student.portfolio),
        bio: normalizeString(student.bio),
        skills: normalizeStringArray(student.skills),
        education: normalizeEducation(student.education),
        communicationPreferences: {
          emailJobAlerts: student.communicationPreferences?.emailJobAlerts !== false,
          inAppAlerts: student.communicationPreferences?.inAppAlerts !== false
        },
        jobAlertSettings: {
          minMatchScore: Number(student.jobAlertSettings?.minMatchScore || 60),
          preferredLocations: normalizeStringArray(
            student.jobAlertSettings?.preferredLocations
          ),
          preferredEmploymentTypes: normalizeStringArray(
            student.jobAlertSettings?.preferredEmploymentTypes
          )
        }
      };

      const { data } = await api.put("/student/profile", payload);
      setStudent({
        ...data,
        skills: Array.isArray(data.skills) ? data.skills : [],
        education: Array.isArray(data.education) ? data.education : [],
        communicationPreferences: {
          emailJobAlerts: data.communicationPreferences?.emailJobAlerts ?? true,
          inAppAlerts: data.communicationPreferences?.inAppAlerts ?? true
        },
        jobAlertSettings: {
          minMatchScore: data.jobAlertSettings?.minMatchScore ?? 60,
          preferredLocations: data.jobAlertSettings?.preferredLocations || [],
          preferredEmploymentTypes: data.jobAlertSettings?.preferredEmploymentTypes || []
        }
      });
      toast.success("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setUploadingResume(true);
      await api.post("/student/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Resume uploaded successfully.");
      await fetchProfile();
    } catch (err) {
      console.error("Resume upload error:", err);
      toast.error("Resume upload failed.");
    } finally {
      setUploadingResume(false);
    }
  };

  const uploadProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploadingImage(true);
      const { data } = await api.put("/student/profile/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setStudent((prev) => ({ ...prev, profileImage: data.profileImage }));
      toast.success("Profile photo updated.");
    } catch (err) {
      console.error("Profile image upload error:", err);
      toast.error("Profile photo upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const addSkill = () => {
    const value = newSkill.trim();
    if (!value) return;

    if ((student.skills || []).includes(value)) {
      setNewSkill("");
      return;
    }

    setStudent((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), value]
    }));
    setNewSkill("");
  };

  const removeSkill = (skill) => {
    setStudent((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((item) => item !== skill)
    }));
  };

  const addEducation = () => {
    const next = {
      institution: "",
      degree: "",
      field: "",
      startYear: "",
      endYear: ""
    };

    setStudent((prev) => ({
      ...prev,
      education: [...(prev.education || []), next]
    }));
  };

  const updateEducation = (index, field, value) => {
    setStudent((prev) => {
      const updated = [...(prev.education || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const removeEducation = (index) => {
    setStudent((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
  };

  const profileImageSrc = useMemo(() => {
    if (student?.profileImage) {
      return `${API_ASSET_BASE}${student.profileImage}`;
    }
    return "";
  }, [student?.profileImage]);

  if (loading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState message={error} onRetry={fetchProfile} />;
  if (!student) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />
        
        <div className="relative px-4 sm:px-6 md:px-8 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] lg:grid-cols-[180px_1fr] gap-6 sm:gap-8 items-start md:items-center">
              {/* Profile Image */}
              <div className="flex flex-col items-center mx-auto md:mx-0">
                <div className="relative group">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-2xl backdrop-blur-sm">
                    {profileImageSrc ? (
                      <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 size={80} className="text-white/60 sm:w-[96px] sm:h-[96px]" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 cursor-pointer inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-blue-600 shadow-lg hover:shadow-xl hover:scale-110 transition-all">
                    {uploadingImage ? <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" /> : <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    <input type="file" accept="image/*" hidden onChange={uploadProfileImage} />
                  </label>
                </div>
              </div>

              {/* Profile Info */}
              <div className="text-white space-y-3 sm:space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 justify-center md:justify-start w-full md:w-auto">
                  <Sparkles size={12} className="sm:w-[14px] sm:h-[14px] text-yellow-300" />
                  <span className="text-xs font-semibold tracking-wide">PROFESSIONAL PROFILE</span>
                </div>
                
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 break-words">{student.fullName || "Your Name"}</h1>
                  <p className="text-blue-100 text-xs sm:text-sm md:text-base break-words">{student.headline || "Add a strong headline to stand out to recruiters"}</p>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4 justify-center md:justify-start">
                  <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 flex-1 sm:flex-initial">
                    <p className="text-xs text-blue-200 font-medium">PROFILE</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{student.profileCompletion || 0}%</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 flex-1 sm:flex-initial">
                    <p className="text-xs text-blue-200 font-medium">RESUME</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{student.resumeScore || 0}<span className="text-sm sm:text-lg">/100</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Progress Bar */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/20">
              <div className="flex items-center justify-between mb-2 sm:mb-3 text-xs sm:text-sm">
                <span className="font-semibold text-blue-100">Profile Progress</span>
                <span className="font-bold text-white">{student.profileCompletion || 0}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 sm:h-2.5 overflow-hidden backdrop-blur-sm">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${student.profileCompletion || 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 space-y-6 sm:space-y-8 mt-6 sm:mt-8">

        {/* Basic Information Section */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 size={18} className="sm:w-[20px] sm:h-[20px] text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <Field icon={<UserCircle2 size={16} />} label="Full Name" value={student.fullName || ""} onChange={(v) => setStudent({ ...student, fullName: v })} />
            <Field icon={<Mail size={16} />} label="Email" value={student.email || ""} disabled />
            <Field icon={<Sparkles size={16} />} label="Headline" value={student.headline || ""} onChange={(v) => setStudent({ ...student, headline: v })} placeholder="Frontend Developer | React | UI Enthusiast" />
            <Field icon={<ShieldCheck size={16} />} label="Current Role" value={student.currentRole || ""} onChange={(v) => setStudent({ ...student, currentRole: v })} placeholder="Student / Intern" />
            <Field icon={<Phone size={16} />} label="Phone" value={student.phone || ""} onChange={(v) => setStudent({ ...student, phone: v })} />
            <Field icon={<MapPin size={16} />} label="Location" value={student.location || ""} onChange={(v) => setStudent({ ...student, location: v })} />
            <Field type="date" icon={<UserCircle2 size={16} />} label="Date of Birth" value={toDateInputValue(student.dateOfBirth)} onChange={(v) => setStudent({ ...student, dateOfBirth: v || null })} />
            <Field icon={<Link2 size={16} />} label="Portfolio" value={student.portfolio || ""} onChange={(v) => setStudent({ ...student, portfolio: v })} />
            <Field icon={<Link2 size={16} />} label="LinkedIn" value={student.linkedin || ""} onChange={(v) => setStudent({ ...student, linkedin: v })} />
            <Field icon={<Link2 size={16} />} label="GitHub" value={student.github || ""} onChange={(v) => setStudent({ ...student, github: v })} />
          </div>

          <div className="mt-4 sm:mt-6">
            <label className="block">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 block">Professional Summary</span>
              <textarea
                rows={4}
                value={student.bio || ""}
                onChange={(e) => setStudent({ ...student, bio: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Write a crisp summary about your strengths and career goals"
              />
            </label>
          </div>
        </section>

        {/* Skills Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-blue-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="sm:w-[20px] sm:h-[20px] text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Skills & Expertise</h2>
          </div>

          {(student.skills || []).length > 0 && (
            <div className="mb-6 sm:mb-8">
              <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4 font-medium">Your Skills ({(student.skills || []).length})</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {(student.skills || []).map((skill) => (
                  <div key={skill} className="inline-flex items-center gap-1.5 sm:gap-2 bg-white text-blue-600 px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl shadow-sm border border-blue-200 hover:shadow-md hover:scale-105 transition-all group text-xs sm:text-sm">
                    <span className="font-semibold">{skill}</span>
                    <button 
                      onClick={() => removeSkill(skill)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                    >
                      <X size={14} className="sm:w-[16px] sm:h-[16px] text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-300 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addSkill()}
              placeholder="Add new skill (e.g., React, JavaScript)"
              className="flex-1 text-xs sm:text-sm outline-none bg-transparent"
            />
            <button 
              onClick={addSkill}
              className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </section>

        {/* Education Section */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={18} className="sm:w-[20px] sm:h-[20px] text-amber-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Education</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {(student.education || []).length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                {(student.education || []).map((edu, index) => (
                  <div key={`${edu.institution || "edu"}-${index}`} className="p-3 sm:p-4 md:p-6 border-2 border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                      <input 
                        className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Institution" 
                        value={edu.institution ?? ""} 
                        onChange={(e) => updateEducation(index, "institution", e.target.value)} 
                      />
                      <input 
                        className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Degree" 
                        value={edu.degree ?? ""} 
                        onChange={(e) => updateEducation(index, "degree", e.target.value)} 
                      />
                      <input 
                        className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Field" 
                        value={edu.field ?? ""} 
                        onChange={(e) => updateEducation(index, "field", e.target.value)} 
                      />
                      <input 
                        className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Start" 
                        value={edu.startYear ?? ""} 
                        onChange={(e) => updateEducation(index, "startYear", e.target.value)} 
                      />
                      <div className="flex gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
                        <input 
                          className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="End" 
                          value={edu.endYear ?? ""} 
                          onChange={(e) => updateEducation(index, "endYear", e.target.value)} 
                        />
                        <button 
                          onClick={() => removeEducation(index)} 
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0"
                        >
                          <X size={18} className="sm:w-[20px] sm:h-[20px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(student.education || []).length === 0 && (
              <div className="text-center py-8 sm:py-12 px-4 sm:px-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300">
                <GraduationCap size={32} className="sm:w-[40px] sm:h-[40px] text-slate-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-slate-600 font-medium text-sm sm:text-base">No education entries yet</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Add your educational background to strengthen your profile</p>
              </div>
            )}
          </div>

          <button 
            onClick={addEducation} 
            className="mt-4 sm:mt-6 inline-flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all"
          >
            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Add Education</span><span className="sm:hidden">Add</span>
          </button>
        </section>

        {/* Job Alert Preferences Section */}
        <section className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-emerald-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="sm:w-[20px] sm:h-[20px] text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Job Alert Preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Email Alerts */}
            <label className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border-2 border-emerald-200 cursor-pointer hover:shadow-md transition-all">
              <input
                type="checkbox"
                checked={student.communicationPreferences?.emailJobAlerts ?? true}
                onChange={(e) =>
                  setStudent({
                    ...student,
                    communicationPreferences: {
                      ...student.communicationPreferences,
                      emailJobAlerts: e.target.checked
                    }
                  })
                }
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-slate-900 text-sm">Email Job Alerts</p>
                <p className="text-xs text-slate-500">Get notified via email</p>
              </div>
            </label>

            {/* In-app Alerts */}
            <label className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border-2 border-emerald-200 cursor-pointer hover:shadow-md transition-all">
              <input
                type="checkbox"
                checked={student.communicationPreferences?.inAppAlerts ?? true}
                onChange={(e) =>
                  setStudent({
                    ...student,
                    communicationPreferences: {
                      ...student.communicationPreferences,
                      inAppAlerts: e.target.checked
                    }
                  })
                }
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-slate-900 text-sm">In-App Alerts</p>
                <p className="text-xs text-slate-500">Get notified on platform</p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6">
            {/* Min Match Score */}
            <div>
              <label className="block mb-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-900">Minimum Match Score</span>
                <p className="text-xs text-slate-500 mt-0.5">Only recommend jobs above this score</p>
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={student.jobAlertSettings?.minMatchScore ?? 60}
                  onChange={(e) =>
                    setStudent({
                      ...student,
                      jobAlertSettings: {
                        ...student.jobAlertSettings,
                        minMatchScore: e.target.value
                      }
                    })
                  }
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={student.jobAlertSettings?.minMatchScore ?? 60}
                  onChange={(e) =>
                    setStudent({
                      ...student,
                      jobAlertSettings: {
                        ...student.jobAlertSettings,
                        minMatchScore: e.target.value
                      }
                    })
                  }
                  className="w-12 sm:w-16 border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-center font-semibold"
                />
              </div>
            </div>

            {/* Preferred Locations */}
            <div>
              <label className="block mb-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-900">Preferred Locations</span>
                <p className="text-xs text-slate-500 mt-0.5">Comma separated</p>
              </label>
              <input
                type="text"
                value={(student.jobAlertSettings?.preferredLocations || []).join(", ")}
                onChange={(e) =>
                  setStudent({
                    ...student,
                    jobAlertSettings: {
                      ...student.jobAlertSettings,
                      preferredLocations: e.target.value.split(",").map((v) => v.trim()).filter(Boolean)
                    }
                  })
                }
                placeholder="e.g., Mumbai, Bangalore"
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Preferred Employment Types */}
            <div className="md:col-span-2">
              <label className="block mb-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-900">Preferred Employment Types</span>
                <p className="text-xs text-slate-500 mt-0.5">Comma separated</p>
              </label>
              <input
                type="text"
                value={(student.jobAlertSettings?.preferredEmploymentTypes || []).join(", ")}
                onChange={(e) =>
                  setStudent({
                    ...student,
                    jobAlertSettings: {
                      ...student.jobAlertSettings,
                      preferredEmploymentTypes: e.target.value.split(",").map((v) => v.trim()).filter(Boolean)
                    }
                  })
                }
                placeholder="e.g., Full-time, Internship, Freelance"
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Resume Section */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Upload size={18} className="sm:w-[20px] sm:h-[20px] text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Resume & Documents</h2>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">Resume Score</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1"><span>{student.resumeScore || 0}</span><span className="text-lg sm:text-xl text-slate-500">/100</span></p>
              </div>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl sm:text-3xl font-bold text-white">{student.resumeScore || 0}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">Your resume quality score is based on completeness and keyword optimization</p>
          </div>

          <label className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 sm:py-6 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition-all group">
            {uploadingResume ? (
              <>
                <Loader2 size={20} className="sm:w-[24px] sm:h-[24px] text-purple-600 animate-spin" />
                <span className="font-semibold text-purple-600 text-xs sm:text-sm">Uploading Resume...</span>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-all flex-shrink-0">
                  <Upload size={18} className="sm:w-[20px] sm:h-[20px] text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">Upload Your Resume</p>
                  <p className="text-xs text-slate-500">PDF format, up to 5MB</p>
                </div>
              </>
            )}
            <input type="file" accept=".pdf" hidden onChange={uploadResume} />
          </label>
        </section>

      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-40">
        <button
          onClick={updateProfile}
          disabled={saving}
          className={`inline-flex items-center justify-center sm:justify-start gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-white shadow-2xl transition-all transform text-xs sm:text-base ${
            saving
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/50 hover:scale-105 active:scale-95"
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Save Profile</span><span className="sm:hidden">Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, icon, placeholder = "", disabled = false, type = "text" }) {
  return (
    <label className="space-y-1.5 sm:space-y-2 block">
      <span className="text-xs sm:text-sm font-semibold text-slate-900">{label}</span>
      <div className="flex items-center gap-2 border-2 border-slate-300 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
        <span className="text-slate-400 flex-shrink-0">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full text-xs sm:text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
      </div>
    </label>
  );
}

function LoadingState({ message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center px-4">
      <div className="text-center py-16 px-4 bg-red-50 border border-red-200 rounded-xl max-w-md">
        <h3 className="text-lg font-bold text-red-700 mb-2">Error Loading Profile</h3>
        <p className="text-red-600 text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
