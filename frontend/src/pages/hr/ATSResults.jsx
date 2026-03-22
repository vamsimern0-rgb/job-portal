import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Brain,
  Search,
  Users,
  Gauge,
  CheckCircle2,
  XCircle,
  Download,
  User,
  X,
  RefreshCcw,
  Filter,
  ArrowUpDown,
  Briefcase,
  AlertCircle
} from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { useToast } from "../../components/ui/ToastProvider";
import { canMutateCandidates, getStoredHrRole } from "../../utils/hrPermissions";

const ASSET_BASE_URL =
  import.meta.env.VITE_ASSET_BASE_URL || "http://localhost:5000/";

const toAssetUrl = (value = "") =>
  `${ASSET_BASE_URL.replace(/\/+$/, "")}/${String(value || "").replace(/^\/+/, "")}`;

const scoreBadgeStyles = {
  excellent: "from-emerald-600 to-teal-700 text-emerald-50",
  good: "from-amber-600 to-orange-700 text-amber-50",
  low: "from-red-600 to-pink-700 text-red-50"
};

const statusPillStyles = {
  Applied: "from-slate-600 to-slate-700 text-slate-100",
  Shortlisted: "from-amber-600 to-orange-700 text-amber-100",
  Interview: "from-blue-600 to-indigo-700 text-blue-100",
  Hired: "from-emerald-600 to-teal-700 text-emerald-100",
  Rejected: "from-red-600 to-pink-700 text-red-100"
};

const getScoreMeta = (score = 0) => {
  if (score >= 80) return { tone: "excellent", label: "High Fit" };
  if (score >= 60) return { tone: "good", label: "Medium Fit" };
  return { tone: "low", label: "Low Fit" };
};

export default function ATSResults() {
  const toast = useToast();
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(jobId || "");
  const [role, setRole] = useState(getStoredHrRole());

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const canEditCandidates = canMutateCandidates(role);

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const response = await api.get("/jobs");
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Jobs fetch failed:", err);
      setJobs([]);
      toast.error("Failed to load jobs.");
    } finally {
      setJobsLoading(false);
    }
  }, [toast]);

  const fetchATS = useCallback(async () => {
    if (!selectedJob) {
      setResults([]);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/ats/${selectedJob}`);
      setResults(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("ATS fetch failed:", err);
      setResults([]);
      setError(err.response?.data?.message || "Failed to load ATS results");
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    setSelectedJob(jobId || "");
  }, [jobId]);

  useEffect(() => {
    if (selectedJob && selectedJob !== jobId) {
      navigate(`/hr/ats/${selectedJob}`);
    } else if (!selectedJob && jobId) {
      navigate("/hr/ats");
    }

    fetchATS();
  }, [fetchATS, jobId, navigate, selectedJob]);

  useEffect(() => {
    const handleLiveUpdate = () => {
      fetchATS();
    };

    socket.on("pipelineUpdated", handleLiveUpdate);
    socket.on("candidateUpdated", handleLiveUpdate);

    return () => {
      socket.off("pipelineUpdated", handleLiveUpdate);
      socket.off("candidateUpdated", handleLiveUpdate);
    };
  }, [fetchATS]);

  useEffect(() => {
    const syncRole = () => {
      setRole(getStoredHrRole());
    };

    syncRole();
    window.addEventListener("storage", syncRole);

    return () => window.removeEventListener("storage", syncRole);
  }, []);

  const fetchCandidateProfile = async (candidateId) => {
    try {
      setProfileLoading(true);
      const response = await api.get(`/candidates/${candidateId}`);
      setSelectedCandidate(response.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load candidate profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const moveToPipeline = async (id, status) => {
    if (!canEditCandidates) {
      toast.error("Your access is read-only for candidate updates.");
      return;
    }

    try {
      setActionLoading(`${id}-${status}`);
      await api.put(`/candidates/${id}/status`, { status });

      setResults((prev) =>
        prev.map((candidate) =>
          candidate._id === id ? { ...candidate, status } : candidate
        )
      );

      toast.success(`Candidate moved to ${status}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const filteredResults = useMemo(() => {
    let items = [...results];

    if (query.trim()) {
      const search = query.trim().toLowerCase();
      items = items.filter((candidate) =>
        [candidate.name, candidate.email, ...(candidate.skills || [])]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }

    if (statusFilter !== "All") {
      items = items.filter((candidate) => (candidate.status || "Applied") === statusFilter);
    }

    if (minScore !== "") {
      const threshold = Number(minScore) || 0;
      items = items.filter((candidate) => (candidate.matchScore || 0) >= threshold);
    }

    if (sortBy === "latest") {
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "experience") {
      items.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    } else if (sortBy === "name") {
      items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      items.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return items;
  }, [results, query, statusFilter, minScore, sortBy]);

  const selectedJobTitle = useMemo(
    () => jobs.find((job) => job._id === selectedJob)?.title || "",
    [jobs, selectedJob]
  );

  const summary = useMemo(() => {
    const total = filteredResults.length;
    const highFit = filteredResults.filter((item) => (item.matchScore || 0) >= 80).length;
    const shortlisted = filteredResults.filter((item) => item.status === "Shortlisted").length;
    const avgScore =
      total > 0
        ? Math.round(filteredResults.reduce((sum, item) => sum + (item.matchScore || 0), 0) / total)
        : 0;

    return { total, highFit, shortlisted, avgScore };
  }, [filteredResults]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8">
          
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-20 blur-xl" />
            <div className="relative bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 rounded-2xl p-6 md:p-8 border border-emerald-600/50">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-emerald-100 border border-white/20 mb-4">
                    <Brain className="w-4 h-4" /> ATS Command Center
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                    AI Candidate Ranking
                  </h1>
                  <p className="text-emerald-100 mt-2 text-sm md:text-base max-w-2xl">
                    Screen and prioritize applicants using match score, skill coverage, and experience fit.
                  </p>
                </div>

                <button
                  onClick={fetchATS}
                  disabled={!selectedJob || loading}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-emerald-700 font-bold px-5 py-2.5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh Ranking
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard label="Visible Candidates" value={summary.total} icon={Users} color="from-slate-700 to-slate-800" />
            <KpiCard label="Average Score" value={`${summary.avgScore}%`} icon={Gauge} color="from-blue-700 to-indigo-800" />
            <KpiCard label="High Fit (80%+)" value={summary.highFit} icon={CheckCircle2} color="from-emerald-700 to-teal-800" />
            <KpiCard label="Shortlisted" value={summary.shortlisted} icon={ArrowUpDown} color="from-amber-700 to-orange-800" />
          </div>

          {/* Filter Bar */}
          <div className="sticky top-0 z-30 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-slate-300">Search & Filter</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Job Selector */}
              <select
                value={selectedJob}
                onChange={(event) => setSelectedJob(event.target.value)}
                className="lg:col-span-2 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 rounded-lg px-4 py-2.5 text-sm transition-all"
              >
                <option value="">Choose Job</option>
                {jobsLoading ? (
                  <option disabled>Loading jobs...</option>
                ) : (
                  jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}
                    </option>
                  ))
                )}
              </select>

              {/* Search */}
              <div className="lg:col-span-2 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, email, skill..."
                  className="w-full bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 rounded-lg px-4 py-2.5 text-sm transition-all"
              >
                <option>All Status</option>
                <option value="Applied">Applied</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Min Score */}
              <div className="relative group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(event) => setMinScore(event.target.value)}
                  placeholder="Min score"
                  className="w-full bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all"
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-slate-700/50 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 rounded-lg px-4 py-2.5 text-sm transition-all"
              >
                <option value="score">Top Score</option>
                <option value="experience">Experience</option>
                <option value="latest">Latest</option>
                <option value="name">Name</option>
              </select>
            </div>

            {selectedJobTitle && (
              <p className="text-xs text-slate-400 border-t border-slate-700/50 pt-3 mt-3">
                Showing ATS results for: <span className="font-semibold text-emerald-400">{selectedJobTitle}</span>
              </p>
            )}
          </div>

          {!canEditCandidates && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              ATS candidate actions are read-only for your role. Rankings and profiles can be reviewed but statuses cannot be changed.
            </div>
          )}

          {/* Content Area */}
          {!selectedJob ? (
            <div className="text-center py-20 px-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 font-medium text-lg">Select a job to start ATS</p>
              <p className="text-slate-500 text-sm mt-1">Choose one job from the filter bar to load ranked candidates</p>
            </div>
          ) : loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Running ATS ranking...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 px-4 bg-red-950/30 border border-red-900/50 rounded-xl">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-300 font-semibold text-lg">{error}</p>
              <button
                onClick={fetchATS}
                className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
              >
                Try Again
              </button>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-20 px-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 font-medium text-lg">No candidates found</p>
              <p className="text-slate-500 text-sm mt-1">Try changing filters, score threshold, or select another job</p>
            </div>
          ) : (
            <div className="overflow-hidden bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 border-b border-slate-700/50">
                    <tr>
                      <th className="text-left px-4 py-4 font-semibold text-slate-300">Rank</th>
                      <th className="text-left px-4 py-4 font-semibold text-slate-300">Candidate</th>
                      <th className="text-left px-4 py-4 font-semibold text-slate-300">Score</th>
                      <th className="text-left px-4 py-4 font-semibold text-slate-300">Status</th>
                      <th className="text-left px-4 py-4 font-semibold text-slate-300">Experience</th>
                      <th className="text-right px-4 py-4 font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((candidate, index) => {
                      const score = candidate.matchScore || 0;
                      const scoreMeta = getScoreMeta(score);
                      const status = candidate.status || "Applied";

                      return (
                        <tr
                          key={candidate._id}
                          className="border-b border-slate-700/30 hover:bg-slate-700/40 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold">
                              {index + 1}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-100">{candidate.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{candidate.email}</p>
                            {candidate.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.skills.slice(0, 3).map((skill) => (
                                  <span
                                    key={`${candidate._id}-${skill}`}
                                    className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <span className="text-xs text-slate-400 self-center">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 min-w-[220px]">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r ${scoreBadgeStyles[scoreMeta.tone]}`}
                                >
                                  {scoreMeta.label}
                                </span>
                                <span className="font-bold text-slate-200">{score}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    score >= 80
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                                      : score >= 60
                                      ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                      : "bg-gradient-to-r from-red-500 to-pink-600"
                                  }`}
                                  style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-block text-xs px-3 py-1.5 rounded-lg font-bold bg-gradient-to-r ${
                                statusPillStyles[status] || statusPillStyles.Applied
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-slate-400">{candidate.experience || 0} yrs</td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => fetchCandidateProfile(candidate._id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs transition-all"
                              >
                                <User className="w-3.5 h-3.5" /> Profile
                              </button>

                              {candidate.resumeUrl && (
                                <a
                                  href={toAssetUrl(candidate.resumeUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" /> Resume
                                </a>
                              )}

                              {canEditCandidates ? (
                                <>
                                  <button
                                    onClick={() => moveToPipeline(candidate._id, "Shortlisted")}
                                    disabled={actionLoading === `${candidate._id}-Shortlisted`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {actionLoading === `${candidate._id}-Shortlisted` ? "..." : "Shortlist"}
                                  </button>

                                  <button
                                    onClick={() => moveToPipeline(candidate._id, "Rejected")}
                                    disabled={actionLoading === `${candidate._id}-Rejected`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    {actionLoading === `${candidate._id}-Rejected` ? "..." : "Reject"}
                                  </button>
                                </>
                              ) : (
                                <span className="inline-flex items-center rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-400">
                                  Read only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Profile Slide-Out */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-700/50 shadow-2xl overflow-y-auto">
            {profileLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-10 h-10 border-3 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400">Loading profile...</p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-700/50 pb-6">
                  <div>
                    <p className="text-xl font-bold text-slate-100">{selectedCandidate.name}</p>
                    <p className="text-sm text-slate-400 mt-1">{selectedCandidate.email}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <ProfileMetric label="Job" value={selectedCandidate.appliedJob?.title || "N/A"} />
                  <ProfileMetric label="Status" value={selectedCandidate.status || "Applied"} />
                  <ProfileMetric label="Match" value={`${selectedCandidate.matchScore || 0}%`} />
                  <ProfileMetric label="Experience" value={`${selectedCandidate.experience || 0} yrs`} />
                </div>

                {/* ATS Breakdown */}
                {selectedCandidate.scoreBreakdown && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
                    <p className="font-semibold text-slate-200 text-sm uppercase tracking-wide">ATS Breakdown</p>
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Resume Score" value={`${Math.round(selectedCandidate.scoreBreakdown.resumeScore || 0)}%`} />
                      <DetailRow label="Required Skills" value={`${Math.round((selectedCandidate.scoreBreakdown.requiredSkillCoverage || 0) * 100)}%`} />
                      <DetailRow label="Preferred Skills" value={`${Math.round((selectedCandidate.scoreBreakdown.preferredSkillCoverage || 0) * 100)}%`} />
                      <DetailRow label="Experience Fit" value={`${Math.round((selectedCandidate.scoreBreakdown.experienceScore || 0) * 100)}%`} />
                    </div>
                  </div>
                )}

                {/* Skills */}
                <section>
                  <h4 className="font-semibold text-slate-200 text-sm mb-3 uppercase tracking-wide">Skills</h4>
                  {(selectedCandidate.skills || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No skills listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill) => (
                        <span
                          key={`${selectedCandidate._id}-${skill}`}
                          className="text-xs bg-gradient-to-r from-emerald-600/50 to-teal-600/50 text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-500/30"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                {/* Student Details */}
                {selectedCandidate.studentId && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
                    <p className="font-semibold text-slate-200 text-sm uppercase tracking-wide">Student Details</p>
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Name" value={selectedCandidate.studentId.fullName || "N/A"} />
                      <DetailRow label="Email" value={selectedCandidate.studentId.email || "N/A"} />
                      <DetailRow label="Phone" value={selectedCandidate.studentId.phone || "N/A"} />
                      <DetailRow label="Location" value={selectedCandidate.studentId.location || "N/A"} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color }) {
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

function ProfileMetric({ label, value }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-100 mt-2">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-200">{value}</p>
    </div>
  );
}
