import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Briefcase,
  Clock,
  Bell,
  Bookmark,
  FileText,
  WandSparkles,
  Download,
  Sparkles,
  CalendarDays,
  ClipboardList,
  BarChart3,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import studentsImage from "../../assets/students.avif";
import { useToast } from "../../components/ui/ToastProvider";

const initialResumeForm = {
  fullName: "",
  targetRole: "",
  professionalSummary: "",
  skills: "",
  projects: "",
  education: "",
  experience: ""
};

const buildLocalResumeDraft = (form) => {
  const toBullets = (value = "") =>
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");

  const name = form.fullName?.trim() || "Student Name";
  const role = form.targetRole?.trim() || "Target Role";
  const summary =
    form.professionalSummary?.trim() ||
    "Motivated student with strong learning agility and project execution focus.";
  const skills = toBullets(form.skills) || "- Add key technical skills";
  const projects = toBullets(form.projects) || "- Add project highlights";
  const education = form.education?.trim() || "Add education details";
  const experience = toBullets(form.experience) || "- Add internship/work experience";

  return `${name}
${role}

PROFESSIONAL SUMMARY
${summary}

SKILLS
${skills}

PROJECTS
${projects}

EDUCATION
${education}

EXPERIENCE
${experience}
`;
};

const splitCommaList = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseEducationInput = (value = "", existingEducation = []) => {
  const items = splitCommaList(value);
  if (items.length === 0) return existingEducation;

  const parsed = items.map((entry) => {
    const segments = entry.split("|").map((part) => part.trim());

    if (segments.length >= 3) {
      const [degree = "", field = "", institution = "", years = ""] = segments;
      const [startYearRaw = "", endYearRaw = ""] = years.split("-").map((part) => part.trim());

      return {
        institution: institution || "",
        degree: degree || "",
        field: field || "",
        startYear: Number.parseInt(startYearRaw, 10) || null,
        endYear: Number.parseInt(endYearRaw, 10) || null
      };
    }

    return {
      institution: entry,
      degree: "",
      field: "",
      startYear: null,
      endYear: null
    };
  });

  return parsed;
};

const formatEducation = (education = []) => {
  if (!Array.isArray(education) || education.length === 0) return "";

  return education
    .map((item) => {
      const parts = [item.degree, item.field, item.institution].filter(Boolean);
      const years =
        item.startYear || item.endYear
          ? `${item.startYear || ""}${item.endYear ? `-${item.endYear}` : ""}`
          : "";
      return [parts.join(" "), years].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(", ");
};

const RESUME_SECTIONS = [
  "PROFESSIONAL SUMMARY",
  "SKILLS",
  "PROJECTS",
  "EDUCATION",
  "EXPERIENCE"
];

const parseResumeContent = (resumeText = "") => {
  const lines = String(resumeText)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const name = lines[0] || "Student Name";
  const role = lines[1] || "Target Role";
  const sections = {};
  let currentSection = null;

  for (const rawLine of lines.slice(2)) {
    const line = rawLine.toUpperCase();
    if (RESUME_SECTIONS.includes(line)) {
      currentSection = line;
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }

    if (!currentSection) continue;
    sections[currentSection].push(rawLine);
  }

  return {
    name,
    role,
    sections
  };
};

export default function StudentHome() {
  const toast = useToast();
  const token = localStorage.getItem("studentToken");

  const [dashboard, setDashboard] = useState(null);
  const [_profile, setProfile] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [resumeForm, setResumeForm] = useState(initialResumeForm);
  const [generatedResume, setGeneratedResume] = useState("");
  const [resumeSource, setResumeSource] = useState("");
  const [resumeModel, setResumeModel] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState("corporate");
  const [refillLoading, setRefillLoading] = useState(false);
  const [jobActionLoadingId, setJobActionLoadingId] = useState("");
  const [jobActionMessage, setJobActionMessage] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  const fetchHomeData = useCallback(async () => {
    try {
      const [dashboardRes, profileRes] = await Promise.all([
        api.get("/student/dashboard"),
        api.get("/student/profile")
      ]);

      setDashboard(dashboardRes.data);

      const profile = profileRes.data || {};
      setProfile(profile);
      setResumeForm({
        fullName: profile.fullName || "",
        targetRole: "Software Engineer Intern",
        professionalSummary: profile.bio || "",
        skills: (profile.skills || []).join(", "),
        projects: "",
        education: formatEducation(profile.education),
        experience:
          profile.experience !== undefined && profile.experience !== null
            ? `${profile.experience} years experience`
            : ""
      });

      const jobsRes = await api.get("/student/jobs?limit=3&sort=match");
      setRecommendedJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
    } catch (err) {
      console.error("Student home fetch error:", err);
      toast.error("Failed to load student home data.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetchHomeData();
  }, [token, fetchHomeData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResumeField = (event) => {
    const { name, value } = event.target;
    setResumeForm((prev) => ({ ...prev, [name]: value }));
  };

  const generateResume = async (event) => {
    event.preventDefault();
    setResumeError("");
    setGeneratedResume("");
    setResumeSource("");
    setResumeModel("");

    if (!resumeForm.fullName.trim() || !resumeForm.targetRole.trim()) {
      setResumeError("Please fill Name and Target Role to generate resume.");
      toast.error("Please fill Name and Target Role.");
      return;
    }

    try {
      setResumeLoading(true);
      const { data } = await api.post("/student/resume-builder", resumeForm);
      setGeneratedResume(data?.resume || "");
      setResumeSource(data?.source || "");
      setResumeModel(data?.model || "");
      toast.success("Resume generated successfully.");
    } catch (err) {
      console.error("Resume generation failed:", err);
      if (err?.response?.status === 404) {
        setGeneratedResume(buildLocalResumeDraft(resumeForm));
        setResumeSource("template");
        setResumeModel("");
        setResumeError(
          "Backend resume-builder route not available. Generated with local template. Restart backend to enable LLM route."
        );
        toast.info("Backend route not available, generated with template.");
      } else {
        setResumeError("Unable to generate resume right now. Please try again.");
        toast.error("Unable to generate resume right now.");
      }
    } finally {
      setResumeLoading(false);
    }
  };

  const refillFromProfile = async () => {
    setProfileMessage("");
    try {
      setRefillLoading(true);
      const { data } = await api.get("/student/profile");
      const latestProfile = data || {};
      setProfile(latestProfile);

      setResumeForm((prev) => ({
        fullName: latestProfile.fullName || "",
        targetRole: prev.targetRole || "Software Engineer Intern",
        professionalSummary: latestProfile.bio || "",
        skills: (latestProfile.skills || []).join(", "),
        projects: prev.projects || "",
        education: formatEducation(latestProfile.education),
        experience:
          latestProfile.experience !== undefined && latestProfile.experience !== null
            ? `${latestProfile.experience} years experience`
            : ""
      }));

      setProfileMessage("Refilled latest data from Student Profile.");
      toast.success("Refilled from Student Profile.");
    } catch (err) {
      console.error("Refill from profile failed:", err);
      setProfileMessage("Failed to refill from Student Profile.");
      toast.error("Failed to refill from Student Profile.");
    } finally {
      setRefillLoading(false);
    }
  };

  const saveToStudentProfile = async () => {
    setProfileMessage("");
    if (!resumeForm.fullName.trim()) {
      setProfileMessage("Name is required to save profile.");
      toast.error("Name is required to save profile.");
      return;
    }

    try {
      setProfileSaving(true);
      const latestProfileRes = await api.get("/student/profile");
      const latestProfile = latestProfileRes.data || {};

      const payload = {
        ...latestProfile,
        fullName: resumeForm.fullName.trim(),
        bio: resumeForm.professionalSummary?.trim() || latestProfile.bio || "",
        skills: splitCommaList(resumeForm.skills),
        education: parseEducationInput(resumeForm.education, latestProfile.education || []),
        experience: Number.parseFloat(resumeForm.experience) || latestProfile.experience || 0,
        resumeText: generatedResume || latestProfile.resumeText || ""
      };

      const { data } = await api.put("/student/profile", payload);
      setProfile(data);
      setProfileMessage("Saved successfully to Student Profile.");
      toast.success("Saved successfully to Student Profile.");
    } catch (err) {
      console.error("Profile save from home failed:", err);
      setProfileMessage("Failed to save in Student Profile.");
      toast.error("Failed to save in Student Profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const applyRecommendedJob = async (job) => {
    if (!job?._id) return;

    if ((job.screeningQuestions || []).length > 0) {
      setJobActionMessage(`"${job.title}" has screening questions. Use Jobs page to apply.`);
      toast.info(`"${job.title}" has screening questions. Use Jobs page.`);
      return;
    }

    try {
      setJobActionLoadingId(job._id);
      await api.post("/student/apply", { jobId: job._id });
      setJobActionMessage(`Applied successfully to "${job.title}".`);
      toast.success(`Applied successfully to "${job.title}".`);
      const jobsRes = await api.get("/student/jobs?limit=3&sort=match");
      setRecommendedJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
    } catch (err) {
      setJobActionMessage(err.response?.data?.message || "Failed to apply.");
      toast.error(err.response?.data?.message || "Failed to apply.");
    } finally {
      setJobActionLoadingId("");
    }
  };

  const toggleSaveRecommendedJob = async (job) => {
    if (!job?._id) return;

    try {
      setJobActionLoadingId(job._id);
      if (job.isSaved) {
        await api.delete(`/student/saved-jobs/${job._id}`);
      } else {
        await api.post(`/student/saved-jobs/${job._id}`);
      }

      setRecommendedJobs((prev) =>
        prev.map((item) =>
          item._id === job._id ? { ...item, isSaved: !item.isSaved } : item
        )
      );
      setJobActionMessage(
        job.isSaved
          ? `Removed "${job.title}" from saved jobs.`
          : `Saved "${job.title}" successfully.`
      );
      toast.success(
        job.isSaved
          ? `Removed "${job.title}" from saved jobs.`
          : `Saved "${job.title}" successfully.`
      );
    } catch (err) {
      setJobActionMessage(err.response?.data?.message || "Failed to update saved job.");
      toast.error(err.response?.data?.message || "Failed to update saved job.");
    } finally {
      setJobActionLoadingId("");
    }
  };

  const downloadResume = async () => {
    if (!generatedResume) return;

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });

      const margin = 44;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - margin * 2;
      const { name, role, sections } = parseResumeContent(generatedResume);
      let y = margin;

      const ensurePage = (requiredHeight = 18) => {
        if (y + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const drawParagraph = (text, fontSize = 11, lineHeight = 14) => {
        const wrapped = pdf.splitTextToSize(text, printableWidth);
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", "normal");
        wrapped.forEach((line) => {
          ensurePage(lineHeight);
          pdf.text(line, margin, y);
          y += lineHeight;
        });
      };

      const drawBullet = (text) => {
        const bulletIndent = 14;
        const bulletWidth = printableWidth - bulletIndent;
        const wrapped = pdf.splitTextToSize(text, bulletWidth);
        const lineHeight = 14;

        wrapped.forEach((line, index) => {
          ensurePage(lineHeight);
          if (index === 0) {
            pdf.text("•", margin, y);
          }
          pdf.text(line, margin + bulletIndent, y);
          y += lineHeight;
        });
      };

      if (pdfTemplate === "creative") {
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, 96, pageHeight, "F");
        pdf.setFillColor(16, 185, 129);
        pdf.rect(96, 0, pageWidth - 96, 76, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.text(name, 112, 38);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.text(role, 112, 58);
        y = 98;
      } else {
        pdf.setFillColor(29, 78, 216);
        pdf.rect(0, 0, pageWidth, 88, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.text(name, margin, 42);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(role, margin, 64);
        y = 110;
      }

      pdf.setTextColor(31, 41, 55);

      RESUME_SECTIONS.forEach((sectionName) => {
        const content = sections[sectionName] || [];
        if (content.length === 0) return;

        ensurePage(32);

        if (pdfTemplate === "creative") {
          pdf.setFillColor(241, 245, 249);
          pdf.rect(margin, y - 14, printableWidth, 20, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(15, 23, 42);
          pdf.text(sectionName, margin + 6, y);
        } else {
          pdf.setFillColor(239, 246, 255);
          pdf.roundedRect(margin, y - 14, printableWidth, 22, 4, 4, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(30, 64, 175);
          pdf.text(sectionName, margin + 8, y);
        }

        y += 20;
        pdf.setTextColor(31, 41, 55);

        content.forEach((line) => {
          const cleanLine = line.replace(/^[-*•]\s*/, "").trim();
          if (!cleanLine) return;
          if (sectionName === "PROFESSIONAL SUMMARY") {
            drawParagraph(cleanLine, 11, 14);
          } else {
            drawBullet(cleanLine);
          }
        });

        y += 8;
      });

      const fileName = `${(resumeForm.fullName || "resume")
        .replace(/\s+/g, "-")
        .toLowerCase()}-resume.pdf`;
      pdf.save(fileName);
      toast.success("Resume PDF downloaded.");
    } catch (err) {
      console.error("PDF download failed:", err);
      setResumeError("PDF generation failed. Please try again.");
      toast.error("PDF generation failed. Please try again.");
    }
  };

  const stats = useMemo(
    () => [
      {
        icon: <Briefcase size={22} />,
        title: "Total Applications",
        value: dashboard?.stats?.total || 0
      },
      {
        icon: <TrendingUp size={22} />,
        title: "Shortlisted",
        value: dashboard?.stats?.shortlisted || 0
      },
      {
        icon: <Clock size={22} />,
        title: "Interviews",
        value: dashboard?.stats?.interviews || 0
      },
      {
        icon: <Briefcase size={22} />,
        title: "Offers",
        value: dashboard?.stats?.hired || 0
      },
      {
        icon: <Bookmark size={22} />,
        title: "Saved Jobs",
        value: dashboard?.stats?.savedJobs || 0
      },
      {
        icon: <Bell size={22} />,
        title: "Unread Alerts",
        value: dashboard?.unreadNotifications || 0
      }
    ],
    [dashboard]
  );

  const resumeChecklist = useMemo(
    () => [
      { key: "fullName", label: "Full Name", ready: Boolean(resumeForm.fullName?.trim()) },
      { key: "targetRole", label: "Target Role", ready: Boolean(resumeForm.targetRole?.trim()) },
      {
        key: "professionalSummary",
        label: "Professional Summary",
        ready: Boolean(resumeForm.professionalSummary?.trim() && resumeForm.professionalSummary.trim().length >= 30)
      },
      { key: "skills", label: "Skills", ready: splitCommaList(resumeForm.skills).length >= 3 },
      { key: "projects", label: "Projects", ready: splitCommaList(resumeForm.projects).length >= 1 },
      { key: "education", label: "Education", ready: Boolean(resumeForm.education?.trim()) },
      { key: "experience", label: "Experience", ready: Boolean(resumeForm.experience?.trim()) }
    ],
    [resumeForm]
  );

  const resumeStrengthScore = useMemo(() => {
    const completed = resumeChecklist.filter((item) => item.ready).length;
    return Math.round((completed / resumeChecklist.length) * 100);
  }, [resumeChecklist]);

  const resumeStrengthTone =
    resumeStrengthScore >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : resumeStrengthScore >= 55
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <p className="inline-flex items-center gap-2 bg-blue-100/80 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold mb-4">
                  <Sparkles className="w-4 h-4" /> Launch Your Career Journey
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
                  AI-Powered Career Discovery Awaits
                </h1>
              </div>
              <p className="text-lg text-slate-600 max-w-lg">
                Find personalized internship & job opportunities, track applications in real-time, and build stunning ATS-friendly resumes with AI assistance.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/student/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3.5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/student/register" className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 px-6 py-3.5 rounded-lg font-semibold transition-all">
                  Create Account
                </Link>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
              <img src={studentsImage} alt="Career growth" className="w-full h-full object-cover min-h-[320px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8 md:space-y-10">
          {/* Hero Section */}
          <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl p-8 md:p-10 shadow-2xl border border-indigo-400/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-20 right-10 w-40 h-40 rounded-full blur-2xl bg-white" />
              </div>
              <div className="relative space-y-6">
                <div>
                  <p className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-xs font-semibold mb-4">
                    <Sparkles className="w-4 h-4" /> Student Growth Hub
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold leading-tight">Make Your Profile Stand Out</h1>
                  <p className="text-blue-100 mt-2 text-lg">Get matched with opportunities aligned with your goals</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                    <p className="text-2xl font-bold">{dashboard?.stats?.shortlisted || 0}</p>
                    <p className="text-xs text-blue-100 mt-1">Shortlisted</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                    <p className="text-2xl font-bold">{dashboard?.stats?.interviews || 0}</p>
                    <p className="text-xs text-blue-100 mt-1">Interviews</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                    <p className="text-2xl font-bold">{dashboard?.stats?.total || 0}</p>
                    <p className="text-xs text-blue-100 mt-1">Applications</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-2 pt-4">
                  <QuickAction to="/student/jobs" icon={<Briefcase className="w-4 h-4" />} label="Explore Jobs" />
                  <QuickAction to="/student/applications" icon={<ClipboardList className="w-4 h-4" />} label="Applications" />
                  <QuickAction to="/student/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
              <img src={studentsImage} alt="Students planning careers" className="w-full h-full object-cover min-h-[280px]" />
            </div>
          </section>

          {/* Stats Section */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {stats.map((stat) => (
              <EnhancedStatCard key={stat.title} {...stat} />
            ))}
          </section>

          {/* Upcoming Interviews & Applications */}
          <section className="grid lg:grid-cols-2 gap-6">
            <EnhancedFeatureCard
              icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
              title="Upcoming Interviews"
              subtitle="Prepare early and exceed expectations"
              items={dashboard?.upcomingInterviewList || []}
              emptyText="No upcoming interviews scheduled."
              renderItem={(item) => (
                <div key={item.candidateId} className="border border-slate-200 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white hover:shadow-md hover:border-blue-300/50 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{item.jobTitle}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Clock className="w-4 h-4" />
                          {new Date(item.interviewDate).toLocaleString()}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                          {item.interviewMode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm font-semibold text-indigo-900">
                      ⏱ Time Left: {formatTimeLeft(item.interviewDate, nowTick)}
                    </p>
                  </div>
                  {item.zoomLinkLocked && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                      {item.zoomLinkMessage || "Zoom link will be shared before the interview"}
                    </p>
                  )}
                  {(item.googleMeetLink || item.zoomLink) && (
                    <div className="pt-3 space-y-2">
                      {item.googleMeetLink && (
                        <a
                          href={item.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-blue-600 hover:text-blue-700 font-semibold underline"
                        >
                          → Join Google Meet
                        </a>
                      )}
                      {item.zoomLink && (
                        <a
                          href={item.zoomLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-indigo-600 hover:text-indigo-700 font-semibold underline"
                        >
                          → Join Zoom Meeting
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            />

            <EnhancedFeatureCard
              icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
              title="Recent Applications"
              subtitle="Track status and match scores"
              items={dashboard?.recentApplications || []}
              emptyText="No recent applications yet. Start applying!"
              renderItem={(item) => (
                <div key={item.candidateId} className="border border-slate-200 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white hover:shadow-md hover:border-blue-300/50 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{item.jobTitle}</p>
                      <p className="text-sm text-slate-600 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        item.status === 'Shortlisted' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        item.status === 'Applied' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          item.status === 'Shortlisted' ? 'bg-emerald-500' :
                          item.status === 'Rejected' ? 'bg-red-500' :
                          item.status === 'Applied' ? 'bg-blue-500' :
                          'bg-slate-500'
                        }`} />
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${item.matchScore || 0}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-900 min-w-fit">
                      {item.matchScore || 0}%
                    </span>
                  </div>
                </div>
              )}
            />
          </section>

          {/* Recommended Jobs Section */}
          <section className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Top Matched Opportunities
                </h3>
                <p className="text-slate-600 text-sm mt-1">Jobs tailored to your profile and skills</p>
              </div>
              <Link to="/student/jobs" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all">
                View All Jobs →
              </Link>
            </div>

            {recommendedJobs.length === 0 ? (
              <div className="text-center py-12 px-6 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-dashed border-slate-300">
                <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No recommendations right now</p>
                <p className="text-sm text-slate-500 mt-1">Complete your profile to get personalized job matches</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedJobs.map((job) => (
                  <EnhancedJobCard 
                    key={job._id} 
                    job={job}
                    isLoading={jobActionLoadingId === job._id}
                    onApply={() => applyRecommendedJob(job)}
                    onToggleSave={() => toggleSaveRecommendedJob(job)}
                  />
                ))}
              </div>
            )}

            {jobActionMessage && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium">
                {jobActionMessage}
              </div>
            )}
          </section>

          {/* AI Resume Builder Section */}
          <section className="bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-200/30 rounded-2xl shadow-lg p-6 md:p-10">
            <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                  <WandSparkles className="w-8 h-8 text-purple-600" />
                  AI Resume Builder
                </h2>
                <p className="text-slate-600 max-w-2xl">
                  Generate an ATS-optimized resume powered by AI. Customize every section or use our smart templates.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 text-xs font-bold rounded-full whitespace-nowrap">
                <Sparkles className="w-4 h-4" /> Premium Feature
              </span>
            </div>

            {/* PDF Template Selection */}
            <div className="mb-6 pb-6 border-b border-purple-200/30">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Choose PDF Template
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'corporate', label: '💼 Corporate', color: 'from-blue-500 to-indigo-600' },
                  { id: 'creative', label: '🎨 Creative', color: 'from-emerald-500 to-teal-600' }
                ].map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setPdfTemplate(template.id)}
                    className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      pdfTemplate === template.id
                        ? `bg-gradient-to-r ${template.color} text-white shadow-lg`
                        : 'bg-white border border-slate-300 text-slate-700 hover:border-purple-300'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume Form */}
            <form onSubmit={generateResume} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <EnhancedInputField
                  label="Full Name"
                  name="fullName"
                  value={resumeForm.fullName}
                  onChange={handleResumeField}
                  placeholder="John Doe"
                  icon={FileText}
                  required
                />
                <EnhancedInputField
                  label="Target Role"
                  name="targetRole"
                  value={resumeForm.targetRole}
                  onChange={handleResumeField}
                  placeholder="Software Engineer Intern"
                  icon={Briefcase}
                  required
                />
              </div>

              <EnhancedTextAreaField
                label="Professional Summary"
                name="professionalSummary"
                value={resumeForm.professionalSummary}
                onChange={handleResumeField}
                placeholder="Brief overview of your strengths and career goals (2-3 sentences)"
              />

              <div className="grid md:grid-cols-2 gap-5">
                <EnhancedTextAreaField
                  label="Technical Skills (comma separated)"
                  name="skills"
                  value={resumeForm.skills}
                  onChange={handleResumeField}
                  placeholder="React, Node.js, MongoDB, Git"
                  rows={3}
                />
                <EnhancedTextAreaField
                  label="Key Projects (comma separated)"
                  name="projects"
                  value={resumeForm.projects}
                  onChange={handleResumeField}
                  placeholder="Job portal application, E-commerce platform"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <EnhancedTextAreaField
                  label="Education Details"
                  name="education"
                  value={resumeForm.education}
                  onChange={handleResumeField}
                  placeholder="B.Tech Computer Science, XYZ University, 2024"
                  rows={3}
                />
                <EnhancedTextAreaField
                  label="Experience / Internships"
                  name="experience"
                  value={resumeForm.experience}
                  onChange={handleResumeField}
                  placeholder="Intern at ABC Corp, developed REST APIs"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="submit"
                  disabled={resumeLoading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <WandSparkles className="w-5 h-5" />
                  {resumeLoading ? "Generating..." : "Generate Resume"}
                </button>

                <button
                  type="button"
                  onClick={refillFromProfile}
                  disabled={refillLoading}
                  className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-purple-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-60"
                >
                  {refillLoading ? "Refilling..." : "Refill from Profile"}
                </button>

                {generatedResume && (
                  <>
                    <button
                      type="button"
                      onClick={downloadResume}
                      className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-all"
                    >
                      <Download className="w-5 h-5" /> Download PDF
                    </button>

                    <button
                      type="button"
                      onClick={saveToStudentProfile}
                      disabled={profileSaving}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                    >
                      {profileSaving ? "Saving..." : "Save to Profile"}
                    </button>
                  </>
                )}
              </div>

              {resumeError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">Generation Error</p>
                    <p className="text-sm text-red-700 mt-1">{resumeError}</p>
                  </div>
                </div>
              )}

              {profileMessage && (
                <div className={`p-4 border rounded-lg flex gap-3 ${
                  profileMessage.includes('successfully') 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    profileMessage.includes('successfully')
                      ? 'text-emerald-600'
                      : 'text-orange-600'
                  }`}>
                    {profileMessage.includes('successfully') ? '✓' : '!'}
                  </div>
                  <p className={`text-sm font-medium ${
                    profileMessage.includes('successfully')
                      ? 'text-emerald-900'
                      : 'text-orange-900'
                  }`}>
                    {profileMessage}
                  </p>
                </div>
              )}
            </form>

            {/* Resume Strength Score */}
            {Object.values(resumeForm).some(val => val.trim()) && (
              <div className="mt-8 pt-8 border-t border-purple-200/30">
                <EnhancedResumeStrengthScore 
                  score={resumeStrengthScore} 
                  checklist={resumeChecklist}
                  tone={resumeStrengthTone}
                />
              </div>
            )}

            {/* Generated Resume Preview */}
            {generatedResume && (
              <div className="mt-8 pt-8 border-t border-purple-200/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Generated Resume Preview
                  </h3>
                  <span className="text-xs text-slate-600 font-medium">
                    Source: {resumeSource === 'ai' ? '🤖 AI Generated' : '📋 Template'}
                    {resumeModel ? ` (${resumeModel})` : ''}
                  </span>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
                  <pre className="p-6 text-sm whitespace-pre-wrap text-slate-800 max-h-96 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
                    {generatedResume}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      </div>
    );
}

function formatTimeLeft(interviewDate, nowMs) {
  const targetMs = new Date(interviewDate).getTime();
  if (!Number.isFinite(targetMs)) return "N/A";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Started / Completed";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (days > 0) return `${days}d ${hh}:${mm}:${ss}`;
  return `${hh}:${mm}:${ss}`;
}

function QuickAction({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/20 backdrop-blur hover:bg-white/30 px-4 py-2.5 font-semibold text-white transition-all hover:border-white/60"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function EnhancedStatCard({ icon, title, value }) {
  return (
    <div className="group bg-white/80 backdrop-blur border border-slate-200/50 rounded-xl p-5 hover:shadow-lg hover:border-blue-300/50 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-all">
          {icon}
        </div>
      </div>
    </div>
  );
}

function EnhancedFeatureCard({ icon, title, subtitle, items, emptyText, renderItem }) {
  return (
    <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl shadow-lg p-6 md:p-8">
      <div className="flex items-start gap-3 mb-2">
        {icon}
        <div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-600 font-medium">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );
}

function EnhancedInputField({ label, icon: Icon, ...props }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/50">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
        )}
        <input
          {...props}
          className={`w-full bg-white/50 border border-slate-300 focus:border-indigo-500 rounded-lg py-2.5 px-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm sm:text-base ${
            Icon ? 'pl-11' : 'pl-4'
          }`}
        />
      </div>
    </div>
  );
}

function EnhancedTextAreaField({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/50">
        <textarea
          {...props}
          className="w-full bg-white/50 border border-slate-300 focus:border-indigo-500 rounded-lg py-2.5 px-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm sm:text-base resize-none"
        />
      </div>
    </div>
  );
}

function EnhancedJobCard({ job, isLoading, onApply, onToggleSave }) {
  return (
    <article className="group bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300/50 transition-all hover:scale-[1.02] transform">
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
              {job.title}
            </h4>
            <button
              onClick={onToggleSave}
              disabled={isLoading}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              title={job.isSaved ? "Remove from saved" : "Save job"}
            >
              <Bookmark
                className={`w-5 h-5 transition-colors ${
                  job.isSaved 
                    ? 'fill-amber-400 text-amber-500' 
                    : 'text-slate-400 hover:text-amber-500'
                }`}
              />
            </button>
          </div>
          <p className="text-sm text-slate-600">
            {job.location || "Remote"} • {job.employmentType || "Full-time"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Match Score</span>
              <span className="text-sm font-bold text-blue-600">{job.matchScore || 0}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                style={{ width: `${job.matchScore || 0}%` }}
              />
            </div>
          </div>
        </div>

        {job.remoteType && (
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
              {job.remoteType}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onApply}
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "Apply Now"}
          </button>
        </div>
      </div>
    </article>
  );
}

function EnhancedResumeStrengthScore({ score, checklist, tone }) {
  return (
    <div className={`border rounded-xl p-5 ${tone}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-lg">Resume Strength Score</p>
          <p className="text-xs opacity-90 mt-0.5">
            {score >= 80 ? "Excellent - Ready to apply!" : score >= 55 ? "Good - Almost there" : "Needs attention"}
          </p>
        </div>
        <div className="text-4xl font-bold">{score}%</div>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden bg-white/40">
        <div
          className="h-full bg-current transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg ${
              item.ready
                ? 'bg-white/40 opacity-100'
                : 'bg-white/20 opacity-75'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${
              item.ready ? 'bg-current' : 'border border-current opacity-40'
            }`}>
              {item.ready ? "✓" : ""}
            </span>
            <span className="line-clamp-1">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
