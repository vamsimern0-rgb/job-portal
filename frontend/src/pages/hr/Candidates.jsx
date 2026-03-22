import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, User, X, RefreshCcw, Filter, Zap, CheckCircle, Clock, AlertCircle, MessageSquare } from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { useToast } from "../../components/ui/ToastProvider";
import {
  canManageCandidateOffers,
  canMutateCandidates,
  getStoredHrRole
} from "../../utils/hrPermissions";

const statusOptions = ["All", "Applied", "Shortlisted", "Interview", "Hired", "Rejected"];

const statusColorMap = {
  Applied: "from-blue-500 to-indigo-600 text-blue-300",
  Shortlisted: "from-amber-500 to-orange-600 text-amber-300",
  Interview: "from-purple-500 to-pink-600 text-purple-300",
  Hired: "from-emerald-500 to-teal-600 text-emerald-300",
  Rejected: "from-red-500 to-pink-600 text-red-300"
};

const statusIconMap = {
  Applied: <Clock className="w-4 h-4" />,
  Shortlisted: <Zap className="w-4 h-4" />,
  Interview: <MessageSquare className="w-4 h-4" />,
  Hired: <CheckCircle className="w-4 h-4" />,
  Rejected: <AlertCircle className="w-4 h-4" />
};

export default function Candidates() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(getStoredHrRole());

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("");
  const [minScore, setMinScore] = useState("");
  const [hasNotesOnly, setHasNotesOnly] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const selectedCandidateId = selectedCandidate?._id || "";

  const [noteInputs, setNoteInputs] = useState({});
  const [savingNoteFor, setSavingNoteFor] = useState("");
  const [offerSubmittingId, setOfferSubmittingId] = useState("");
  const canEditCandidates = canMutateCandidates(role);
  const canManageOffers = canManageCandidateOffers(role);

  const buildQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) params.set("q", query.trim());
    if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);
    if (jobFilter) params.set("jobId", jobFilter);
    if (minScore !== "") params.set("minScore", minScore);
    if (hasNotesOnly) params.set("hasNotes", "true");

    params.set("sortBy", "updatedAt");
    params.set("sortOrder", "desc");

    return params.toString();
  }, [query, statusFilter, jobFilter, minScore, hasNotesOnly]);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await api.get("/jobs");
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Jobs fetch failed", err);
      setJobs([]);
    }
  }, []);

  const fetchCandidates = useCallback(
    async ({ keepLoading = false } = {}) => {
      if (!keepLoading) {
        setRefreshing(true);
      }

      try {
        const response = await api.get(`/candidates?${buildQuery}`);
        setCandidates(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Candidates fetch failed", err);
        setCandidates([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery]
  );

  const fetchCandidateProfile = useCallback(async (candidateId) => {
    try {
      setProfileLoading(true);
      const response = await api.get(`/candidates/${candidateId}`);
      setSelectedCandidate(response.data || null);
    } catch (err) {
      console.error("Candidate profile fetch failed", err);
      toast.error(err.response?.data?.message || "Failed to load candidate profile");
    } finally {
      setProfileLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJobs(), fetchCandidates({ keepLoading: true })]);
    };

    loadData();
  }, [fetchJobs, fetchCandidates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, 250);

    return () => clearTimeout(timer);
  }, [buildQuery, fetchCandidates]);

  useEffect(() => {
    const syncRole = () => {
      setRole(getStoredHrRole());
    };

    syncRole();
    window.addEventListener("storage", syncRole);

    return () => window.removeEventListener("storage", syncRole);
  }, []);

  useEffect(() => {
    const handleLiveUpdate = () => {
      fetchCandidates();

      if (selectedCandidateId) {
        fetchCandidateProfile(selectedCandidateId);
      }
    };

    socket.on("pipelineUpdated", handleLiveUpdate);
    socket.on("candidateUpdated", handleLiveUpdate);

    return () => {
      socket.off("pipelineUpdated", handleLiveUpdate);
      socket.off("candidateUpdated", handleLiveUpdate);
    };
  }, [fetchCandidates, fetchCandidateProfile, selectedCandidateId]);

  const addNote = async (candidateId) => {
    if (!canEditCandidates) {
      toast.error("Your access is read-only for candidate updates");
      return;
    }

    const text = (noteInputs[candidateId] || "").trim();

    if (!text) return;

    try {
      setSavingNoteFor(candidateId);

      const response = await api.post(`/candidates/${candidateId}/notes`, { text });
      const updated = response.data;

      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate._id === candidateId ? updated : candidate
        )
      );

      if (selectedCandidateId === candidateId) {
        fetchCandidateProfile(candidateId);
      }

      setNoteInputs((prev) => ({
        ...prev,
        [candidateId]: ""
      }));
      toast.success("Note added successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add note");
    } finally {
      setSavingNoteFor("");
    }
  };

  const upsertCandidateInState = (updatedCandidate) => {
    if (!updatedCandidate?._id) return;

    setCandidates((prev) =>
      prev.map((item) => (item._id === updatedCandidate._id ? updatedCandidate : item))
    );

    setSelectedCandidate((prev) =>
      prev?._id === updatedCandidate._id ? updatedCandidate : prev
    );
  };

  const sendOffer = async (candidate) => {
    if (!candidate?._id) return;
    if (!canManageOffers) {
      toast.error("Your role cannot send offers");
      return;
    }

    const joiningDate = window.prompt(
      "Joining date (YYYY-MM-DD). Leave blank if not finalized yet.",
      ""
    );
    if (joiningDate === null) return;

    const salaryOffered = window.prompt("Salary offer (optional)", "") ?? "";
    const letterUrl = window.prompt("Offer letter URL (optional)", "") ?? "";
    const notes = window.prompt("Offer notes (optional)", "") ?? "";

    try {
      setOfferSubmittingId(candidate._id);
      const response = await api.put(`/candidates/${candidate._id}/send-offer`, {
        joiningDate: joiningDate?.trim() || null,
        salaryOffered,
        letterUrl,
        notes
      });
      upsertCandidateInState(response.data);
      toast.success("Offer sent successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send offer");
    } finally {
      setOfferSubmittingId("");
    }
  };

  const withdrawOffer = async (candidate) => {
    if (!candidate?._id) return;
    if (!canManageOffers) {
      toast.error("Your role cannot withdraw offers");
      return;
    }
    if (!window.confirm("Withdraw this offer?")) return;

    const reason = window.prompt("Withdrawal reason (optional)", "") ?? "";

    try {
      setOfferSubmittingId(candidate._id);
      const response = await api.put(`/candidates/${candidate._id}/withdraw-offer`, {
        reason
      });
      upsertCandidateInState(response.data);
      toast.success("Offer withdrawn");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to withdraw offer");
    } finally {
      setOfferSubmittingId("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-900/30 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 mb-2">
                <User className="w-8 h-8 text-emerald-400" />
                Candidates
              </h1>
              <p className="text-slate-400 text-sm">Live candidate tracking, profile search, and recruiter collaboration</p>
            </div>

            <button
              onClick={() => fetchCandidates()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm rounded-lg transition-all"
            >
              <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {!canEditCandidates && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              Candidate access is read-only for your role. Profiles, notes, interviews, and offers can be reviewed but not changed.
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-lg p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white">Search & Filter</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, email, skills..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white rounded-lg px-4 py-2.5 text-sm transition-all appearance-none cursor-pointer"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status} className="bg-slate-900 text-white">
                    {status}
                  </option>
                ))}
              </select>

              {/* Job Filter */}
              <select
                value={jobFilter}
                onChange={(event) => setJobFilter(event.target.value)}
                className="bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white rounded-lg px-4 py-2.5 text-sm transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-white">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id} className="bg-slate-900 text-white">
                    {job.title}
                  </option>
                ))}
              </select>

              {/* Min Score Input */}
              <input
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(event) => setMinScore(event.target.value)}
                placeholder="Min match %"
                className="bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm transition-all"
              />

              {/* Notes Only Checkbox */}
              <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={hasNotesOnly}
                  onChange={(event) => setHasNotesOnly(event.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <span className="text-sm font-medium">Has Notes</span>
              </label>
            </div>
          </div>

          {/* Candidates Grid */}
          {candidates.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl">
              <User className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-lg">No candidates found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate._id}
                  candidate={candidate}
                  noteInput={noteInputs[candidate._id] || ""}
                  onNoteChange={(value) =>
                    setNoteInputs((prev) => ({
                      ...prev,
                      [candidate._id]: value
                    }))
                  }
                  onAddNote={() => addNote(candidate._id)}
                  onViewProfile={() => fetchCandidateProfile(candidate._id)}
                  isSaving={savingNoteFor === candidate._id}
                  onSendOffer={() => sendOffer(candidate)}
                  onWithdrawOffer={() => withdrawOffer(candidate)}
                  offerSubmitting={offerSubmittingId === candidate._id}
                  canAddNotes={canEditCandidates}
                  canManageOffers={canManageOffers}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Candidate Profile Panel */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-700 overflow-y-auto">
            {profileLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-10 h-10 border-2 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400">Loading profile...</p>
                </div>
              </div>
            ) : (
              <ProfilePanel
                candidate={selectedCandidate}
                onClose={() => setSelectedCandidate(null)}
                onSendOffer={() => sendOffer(selectedCandidate)}
                onWithdrawOffer={() => withdrawOffer(selectedCandidate)}
                offerSubmitting={offerSubmittingId === selectedCandidate._id}
                canManageOffers={canManageOffers}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Candidate Card Component
function CandidateCard({
  candidate,
  noteInput,
  onNoteChange,
  onAddNote,
  onViewProfile,
  isSaving,
  onSendOffer,
  onWithdrawOffer,
  offerSubmitting,
  canAddNotes,
  canManageOffers
}) {
  const statusGradient = statusColorMap[candidate.status] || "from-slate-500 to-slate-600 text-slate-300";
  const offerStatus = candidate.offer?.status || "NotSent";
  
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/70 transition-colors group">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5 pb-5 border-b border-slate-700/50">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{candidate.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{candidate.email}</p>
          <p className="text-xs text-slate-500 mt-2">Job: {candidate.appliedJob?.title || "N/A"}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${statusGradient} font-semibold text-sm flex items-center gap-2`}>
            {statusIconMap[candidate.status]}
            {candidate.status}
          </div>

          <button
            onClick={onViewProfile}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition-all"
          >
            View
          </button>
        </div>
      </div>

      {/* Offer Summary */}
      {candidate.status === "Hired" && (
        <div className="mb-4 rounded-lg border border-cyan-700/40 bg-cyan-900/20 px-3 py-2 text-xs text-cyan-200">
          Offer Status: <span className="font-semibold">{offerStatus}</span>
          {canManageOffers ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {offerStatus !== "Sent" && offerStatus !== "Accepted" && (
                <button
                  onClick={onSendOffer}
                  disabled={offerSubmitting}
                  className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition disabled:opacity-60"
                >
                  {offerSubmitting ? "..." : "Send Offer"}
                </button>
              )}
              {offerStatus === "Sent" && (
                <button
                  onClick={onWithdrawOffer}
                  disabled={offerSubmitting}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-60"
                >
                  {offerSubmitting ? "..." : "Withdraw Offer"}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-cyan-300/80">
              Offer actions are disabled for your role.
            </p>
          )}
        </div>
      )}

      {/* Match Score */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400">Match Score</span>
          <span className="text-sm font-bold text-emerald-400">{candidate.matchScore || 0}%</span>
        </div>
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
            style={{ width: `${candidate.matchScore || 0}%` }}
          />
        </div>
      </div>

      {/* Notes Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Recruiter Notes</h4>

        {(candidate.recruiterNotes || []).length === 0 ? (
          <p className="text-xs text-slate-500 italic">No notes yet</p>
        ) : (
          <div className="space-y-2 mb-3">
            {candidate.recruiterNotes
              .slice(-2)
              .reverse()
              .map((note, index) => (
                <div
                  key={`${candidate._id}-note-${index}`}
                  className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2"
                >
                  <p className="text-sm text-slate-300">{note.text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {note.authorName || "HR"} | {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
          </div>
        )}

        {canAddNotes ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add internal recruiter note..."
              className="flex-1 bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm transition-all"
            />

            <button
              onClick={onAddNote}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-60"
            >
              {isSaving ? "..." : "Add"}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Notes are view-only for your role.</p>
        )}
      </div>
    </div>
  );
}

// Profile Panel Component
function ProfilePanel({
  candidate,
  onClose,
  onSendOffer,
  onWithdrawOffer,
  offerSubmitting,
  canManageOffers
}) {
  const offerStatus = candidate.offer?.status || "NotSent";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-700/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{candidate.name}</p>
            <p className="text-sm text-slate-400">{candidate.email}</p>
            <p className="text-xs text-slate-500 mt-1">Applied for {candidate.appliedJob?.title || "N/A"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Status" value={candidate.status} />
        <StatBox label="Match Score" value={`${candidate.matchScore || 0}%`} />
        <StatBox label="Experience" value={`${candidate.experience || 0} yrs`} />
        <StatBox label="Interview" value={candidate.interviewDate ? new Date(candidate.interviewDate).toLocaleDateString() : "Not scheduled"} />
      </div>

      {/* Offer Management */}
      {candidate.status === "Hired" && (
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-white">Offer Management</h4>
          <div className="bg-cyan-950/30 border border-cyan-700/40 rounded-lg p-4 space-y-3">
            <p className="text-sm text-cyan-200">
              Current Offer Status: <span className="font-semibold">{offerStatus}</span>
            </p>
            {candidate.offer?.salaryOffered && (
              <p className="text-xs text-cyan-300">Salary: {candidate.offer.salaryOffered}</p>
            )}
            {candidate.offer?.joiningDate && (
              <p className="text-xs text-cyan-300">
                Joining Date: {new Date(candidate.offer.joiningDate).toLocaleDateString()}
              </p>
            )}
            {candidate.offer?.letterUrl && (
              <a
                href={candidate.offer.letterUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs text-cyan-200 underline hover:text-cyan-100"
              >
                View Offer Letter
              </a>
            )}

            {canManageOffers ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {offerStatus !== "Sent" && offerStatus !== "Accepted" && (
                  <button
                    onClick={onSendOffer}
                    disabled={offerSubmitting}
                    className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition disabled:opacity-60"
                  >
                    {offerSubmitting ? "Processing..." : "Send Offer"}
                  </button>
                )}
                {offerStatus === "Sent" && (
                  <button
                    onClick={onWithdrawOffer}
                    disabled={offerSubmitting}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-60"
                  >
                    {offerSubmitting ? "Processing..." : "Withdraw Offer"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-cyan-300/80">Offer actions are disabled for your role.</p>
            )}
          </div>
        </section>
      )}

      {/* Student Profile */}
      {candidate.studentId && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white">Student Details</h4>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-400">Name</p>
              <p className="text-sm text-slate-300 mt-1">{candidate.studentId.fullName || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Email</p>
              <p className="text-sm text-slate-300 mt-1">{candidate.studentId.email || "N/A"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-semibold text-slate-400">Location</p>
                <p className="text-slate-300 mt-1">{candidate.studentId.location || "N/A"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-400">Phone</p>
                <p className="text-slate-300 mt-1">{candidate.studentId.phone || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skills */}
      {(candidate.skills || []).length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-white">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill) => (
              <span
                key={`${candidate._id}-${skill}`}
                className="px-3 py-1 bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-xs font-semibold rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* All Notes */}
      <section className="space-y-3">
        <h4 className="text-sm font-bold text-white">All Notes</h4>
        {(candidate.recruiterNotes || []).length === 0 ? (
          <p className="text-xs text-slate-500 italic">No notes yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {candidate.recruiterNotes
              .slice()
              .reverse()
              .map((note, index) => (
                <div
                  key={`${candidate._id}-profile-note-${index}`}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3"
                >
                  <p className="text-sm text-slate-300">{note.text}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {note.authorName || "HR"} | {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Stat Box Component
function StatBox({ label, value }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="text-sm font-bold text-white mt-1">{value}</p>
    </div>
  );
}

