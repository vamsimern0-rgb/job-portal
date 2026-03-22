import { createElement, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, FileText, Settings, ChevronRight, AlertCircle } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

export default function CreateJob() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [submitting, setSubmitting] = useState(false);
  const [loadingJob, setLoadingJob] = useState(Boolean(editId));
  const [errors, setErrors] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    employmentType: "Full-time",
    remoteType: "Onsite",
    priority: "Normal",
    location: "",
    salaryRange: "",
    openingsCount: 1,
    description: "",
    responsibilities: "",
    requiredSkills: "",
    preferredSkills: "",
    experienceRequired: "",
    educationRequired: "",
    status: "Open",
    screeningQuestions: "",
    autoBroadcastEnabled: true,
    matchThreshold: 65,
    assignedRecruiters: []
  });

  const assignableMembers = useMemo(
    () =>
      teamMembers.filter((member) =>
        ["Recruiter", "Hiring Manager", "HR Manager"].includes(member.role)
      ),
    [teamMembers]
  );

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get("/team");
        setTeamMembers(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load team members", err);
      }
    };

    fetchTeam();
  }, []);

  useEffect(() => {
    if (!editId) return;

    const fetchJob = async () => {
      try {
        setLoadingJob(true);
        const response = await api.get(`/jobs/${editId}`);
        const data = response?.data || {};
        const threshold = Number(data.matchThreshold || 0.65);

        setFormData({
          title: data.title || "",
          department: data.department || "",
          employmentType: data.employmentType || "Full-time",
          remoteType: data.remoteType || "Onsite",
          priority: data.priority || "Normal",
          location: data.location || "",
          salaryRange: data.salaryRange || "",
          openingsCount: Number(data.openingsCount || 1),
          description: data.description || "",
          responsibilities: data.responsibilities || "",
          requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills.join(", ") : "",
          preferredSkills: Array.isArray(data.preferredSkills) ? data.preferredSkills.join(", ") : "",
          experienceRequired: Number(data.experienceRequired || 0),
          educationRequired: data.educationRequired || "",
          status: data.status || "Open",
          screeningQuestions: Array.isArray(data.screeningQuestions) ? data.screeningQuestions.join("\n") : "",
          autoBroadcastEnabled: data.autoBroadcastEnabled !== false,
          matchThreshold: Math.round((threshold > 1 ? threshold : threshold * 100) || 65),
          assignedRecruiters: Array.isArray(data.assignedRecruiters)
            ? data.assignedRecruiters.map((id) => id.toString())
            : []
        });
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load job details");
        navigate("/hr/jobs");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJob();
  }, [editId, navigate, toast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const toggleRecruiter = (memberId) => {
    setFormData((prev) => ({
      ...prev,
      assignedRecruiters: prev.assignedRecruiters.includes(memberId)
        ? prev.assignedRecruiters.filter((id) => id !== memberId)
        : [...prev.assignedRecruiters, memberId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Job title is required";
    if (!formData.description.trim()) newErrors.description = "Job description is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      if (isEditMode) {
        await api.put(`/jobs/${editId}`, formData);
        toast.success("Job updated successfully");
      } else {
        await api.post("/jobs", formData);
        toast.success("Job created successfully");
      }
      navigate("/hr/jobs");
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} job`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8">
          
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-emerald-400" />
              {isEditMode ? "Edit Job" : "Create New Job"}
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              {isEditMode
                ? "Update role details, recruiter assignments, and job settings."
                : "Fill in the details below to publish a new job posting to your talent pool."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information Section */}
            <Section title="Basic Information" icon={Briefcase} color="emerald">
              <div className="grid md:grid-cols-2 gap-6">
                <EnhancedInput
                  label="Job Title"
                  name="title"
                  required
                  onChange={handleChange}
                  value={formData.title}
                  placeholder="e.g. Senior MERN Developer"
                  error={errors.title}
                  icon="briefcase"
                />

                <EnhancedInput
                  label="Department"
                  name="department"
                  onChange={handleChange}
                  value={formData.department}
                  placeholder="e.g. Engineering"
                  icon="folder"
                />

                <EnhancedSelect
                  label="Employment Type"
                  name="employmentType"
                  onChange={handleChange}
                  value={formData.employmentType}
                  options={["Full-time", "Part-time", "Contract", "Internship"]}
                  icon="clock"
                />

                <EnhancedSelect
                  label="Work Mode"
                  name="remoteType"
                  onChange={handleChange}
                  value={formData.remoteType}
                  options={["Onsite", "Hybrid", "Remote"]}
                  icon="map-pin"
                />

                <EnhancedInput
                  label="Location"
                  name="location"
                  onChange={handleChange}
                  value={formData.location}
                  placeholder="e.g. Hyderabad / Remote"
                  error={errors.location}
                  icon="map-pin"
                  required
                />

                <EnhancedInput
                  label="Salary Range"
                  name="salaryRange"
                  onChange={handleChange}
                  value={formData.salaryRange}
                  placeholder="e.g. 8L - 12L"
                  icon="dollar-sign"
                />

                <EnhancedInput
                  label="Number of Openings"
                  name="openingsCount"
                  type="number"
                  onChange={handleChange}
                  value={formData.openingsCount}
                  min="1"
                  icon="users"
                />

                <EnhancedSelect
                  label="Hiring Priority"
                  name="priority"
                  onChange={handleChange}
                  value={formData.priority}
                  options={["Normal", "Low", "High", "Critical"]}
                  icon="zap"
                />
              </div>
            </Section>

            {/* Job Details Section */}
            <Section title="Job Details" icon={FileText} color="blue">
              <div className="space-y-6">
                <EnhancedTextarea
                  label="Job Description"
                  name="description"
                  required
                  rows="5"
                  onChange={handleChange}
                  value={formData.description}
                  placeholder="Describe the role, company culture, and expectations..."
                  error={errors.description}
                />

                <EnhancedTextarea
                  label="Key Responsibilities"
                  name="responsibilities"
                  rows="4"
                  onChange={handleChange}
                  value={formData.responsibilities}
                  placeholder="• Lead architecture design&#10;• Mentor junior developers&#10;• Code reviews and best practices..."
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <EnhancedInput
                    label="Required Skills (comma-separated)"
                    name="requiredSkills"
                    onChange={handleChange}
                    value={formData.requiredSkills}
                    placeholder="React, Node.js, MongoDB"
                    icon="code"
                  />

                  <EnhancedInput
                    label="Preferred Skills (comma-separated)"
                    name="preferredSkills"
                    onChange={handleChange}
                    value={formData.preferredSkills}
                    placeholder="Docker, AWS, CI/CD"
                    icon="star"
                  />

                  <EnhancedInput
                    label="Experience Required (Years)"
                    name="experienceRequired"
                    type="number"
                    onChange={handleChange}
                    value={formData.experienceRequired}
                    min="0"
                    icon="calendar"
                  />

                  <EnhancedInput
                    label="Education Required"
                    name="educationRequired"
                    onChange={handleChange}
                    value={formData.educationRequired}
                    placeholder="B.Tech / MCA / Any equivalent"
                    icon="book"
                  />
                </div>

                <EnhancedTextarea
                  label="Screening Questions (one per line)"
                  name="screeningQuestions"
                  rows="4"
                  onChange={handleChange}
                  value={formData.screeningQuestions}
                  placeholder={"Do you have 2+ years in React?\nCan you join in 30 days?\nAny experience with system design?"}
                />
              </div>
            </Section>

            {/* Job Settings Section */}
            <Section title="Job Settings" icon={Settings} color="purple">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <EnhancedSelect
                  label="Status"
                  name="status"
                  onChange={handleChange}
                  value={formData.status}
                  options={["Open", "Paused", "Closed", "Draft"]}
                  icon="check-circle"
                />

                <EnhancedInput
                  label="Minimum Match Threshold (%)"
                  name="matchThreshold"
                  type="number"
                  onChange={handleChange}
                  value={formData.matchThreshold}
                  min="0"
                  max="100"
                  icon="target"
                />
              </div>

              {/* Auto Broadcast Checkbox */}
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoBroadcast"
                  name="autoBroadcastEnabled"
                  checked={formData.autoBroadcastEnabled}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="autoBroadcast" className="flex flex-col flex-1 cursor-pointer">
                  <span className="text-sm font-semibold text-white">Enable Auto Outreach</span>
                  <span className="text-xs text-slate-400 mt-1">Automatically send emails and in-app notifications to matched candidates when this job opens</span>
                </label>
              </div>

              {assignableMembers.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm font-semibold text-slate-200 block mb-3">
                    Assigned Recruiters / Managers
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {assignableMembers.map((member) => {
                      const checked = formData.assignedRecruiters.includes(member._id);
                      return (
                        <label
                          key={member._id}
                          className={`flex items-start gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition ${
                            checked
                              ? "border-emerald-500/60 bg-emerald-900/20"
                              : "border-slate-600/50 bg-slate-700/30 hover:border-slate-500/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRecruiter(member._id)}
                            className="mt-1 w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-white font-medium truncate">
                              {member.fullName}
                            </span>
                            <span className="block text-xs text-slate-400 truncate">
                              {member.role} • {member.email}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/hr/jobs")}
                className="px-6 py-3 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? "Update Job" : "Create Job"}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Section Component with Color Variants
function Section({ title, icon, color = "emerald", children }) {
  const colorMap = {
    emerald: "from-emerald-500 to-teal-600",
    blue: "from-blue-500 to-indigo-600",
    purple: "from-purple-500 to-pink-600"
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colorMap[color]} p-6 flex items-center gap-3`}>
        {createElement(icon, { className: "w-6 h-6 text-white", size: 24 })}
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {children}
      </div>
    </div>
  );
}

// Enhanced Input Component
function EnhancedInput({
  label,
  name,
  type = "text",
  required,
  onChange,
  placeholder,
  value,
  error,
  min,
  max
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-200 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        onChange={onChange}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        className={`bg-slate-700/50 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/50 focus:border-emerald-500'} focus:ring-1 ${error ? 'focus:ring-red-500/50' : 'focus:ring-emerald-500/50'} text-white placeholder-slate-500 rounded-lg px-4 py-2.5 transition-all outline-none`}
      />
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}

// Enhanced Textarea Component
function EnhancedTextarea({
  label,
  name,
  rows,
  required,
  onChange,
  placeholder,
  value,
  error
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-200 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        name={name}
        rows={rows}
        required={required}
        onChange={onChange}
        value={value}
        placeholder={placeholder}
        className={`bg-slate-700/50 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/50 focus:border-emerald-500'} focus:ring-1 ${error ? 'focus:ring-red-500/50' : 'focus:ring-emerald-500/50'} text-white placeholder-slate-500 rounded-lg px-4 py-3 transition-all outline-none resize-none`}
      />
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}

// Enhanced Select Component
function EnhancedSelect({ label, name, options, onChange, value, required }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-200 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <select
        name={name}
        onChange={onChange}
        value={value}
        className="bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white rounded-lg px-4 py-2.5 transition-all outline-none appearance-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-900 text-white">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
