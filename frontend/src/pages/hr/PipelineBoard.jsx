import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";
import {
  Briefcase,
  Users,
  X,
  GripVertical,
  CheckCircle,
  Clock,
  Video,
  Trash2,
  BarChart3
} from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import socket from "../../socket";
import { canMutateCandidates, getStoredHrRole } from "../../utils/hrPermissions";

const statuses = ["Applied", "Shortlisted", "Interview", "Hired", "Rejected"];

const statusColors = {
  Applied: {
    bg: "bg-gradient-to-br from-blue-600 to-blue-700",
    border: "border-blue-500/50",
    icon: Clock,
    count: "text-blue-300"
  },
  Shortlisted: {
    bg: "bg-gradient-to-br from-amber-600 to-amber-700",
    border: "border-amber-500/50",
    icon: CheckCircle,
    count: "text-amber-300"
  },
  Interview: {
    bg: "bg-gradient-to-br from-purple-600 to-purple-700",
    border: "border-purple-500/50",
    icon: Video,
    count: "text-purple-300"
  },
  Hired: {
    bg: "bg-gradient-to-br from-emerald-600 to-emerald-700",
    border: "border-emerald-500/50",
    icon: CheckCircle,
    count: "text-emerald-300"
  },
  Rejected: {
    bg: "bg-gradient-to-br from-red-600 to-red-700",
    border: "border-red-500/50",
    icon: X,
    count: "text-red-300"
  }
};

const normalizeStatus = (value) =>
  statuses.includes(value) ? value : "Applied";

export default function PipelineBoard() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(getStoredHrRole());
  const canEditCandidates = canMutateCandidates(role);

  /* ================= FETCH JOBS ================= */
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/jobs");
        const jobList = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
        setJobs(jobList);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        toast.error("Failed to load jobs.");
      }
    };
    fetchJobs();
  }, [toast]);

  /* ================= FETCH CANDIDATES ================= */
  const fetchCandidates = useCallback(async () => {
    try {
      let url = "/candidates";
      if (selectedJob) url += `?jobId=${selectedJob}`;

      const res = await api.get(url);
      const candidateList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];
      setCandidates(
        candidateList.map((candidate) => ({
          ...candidate,
          status: normalizeStatus(candidate.status)
        }))
      );
    } catch {
      setCandidates([]);
      toast.error("Failed to load pipeline candidates.");
    } finally {
      setLoading(false);
    }
  }, [selectedJob, toast]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    const syncRole = () => {
      setRole(getStoredHrRole());
    };

    syncRole();
    window.addEventListener("storage", syncRole);

    return () => window.removeEventListener("storage", syncRole);
  }, []);

  /* ================= REAL-TIME ================= */
  useEffect(() => {
    socket.on("pipelineUpdated", fetchCandidates);
    return () => socket.off("pipelineUpdated", fetchCandidates);
  }, [fetchCandidates]);

  /* ================= DRAG ================= */
  const onDragEnd = async (result) => {
    if (!canEditCandidates) {
      toast.error("Your access is read-only for candidate updates");
      return;
    }

    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    setCandidates(prev =>
      prev.map(c =>
        c._id === draggableId
          ? { ...c, status: destination.droppableId }
          : c
      )
    );

    if (candidates.length > 0) {
      try {
        await api.put(`/candidates/${draggableId}/status`, {
          status: destination.droppableId
        });
        toast.success(`Candidate moved to ${destination.droppableId}.`, { duration: 1800 });
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to update candidate stage.");
        fetchCandidates();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  /* Stats */
  const totalCandidates = candidates.length;
  const selectedStatusConfig =
    statusColors[normalizeStatus(selectedCandidate?.status)] || statusColors.Applied;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-8">

        {/* ================= HEADER ================= */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <BarChart3 size={20} className="text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Recruitment Pipeline</h1>
            </div>
            <p className="text-slate-400 ml-13">Drag candidates across hiring stages in real-time</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            {/* Stats Card */}
            <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm px-4 py-3 rounded-xl text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Users size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-300 font-semibold text-lg">{totalCandidates}</p>
                <p className="text-slate-500 text-xs">Total Candidates</p>
              </div>
            </div>

            {/* Job Filter */}
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none text-slate-100 text-sm cursor-pointer transition hover:border-slate-600/50"
            >
              <option value="">All Jobs</option>
              {jobs.map(job => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!canEditCandidates && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            Pipeline access is read-only for your role. Candidate stages can be reviewed but not moved.
          </div>
        )}

        {/* ================= BOARD ================= */}
        <div className="overflow-x-auto pb-8">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 min-w-[1440px] lg:min-w-0">

              {statuses.map(status => {
                const filtered = candidates.filter(c => c.status === status);
                const StatusIcon = statusColors[status].icon;

                return (
                  <Droppable droppableId={status} key={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-6 w-80 min-h-[600px] transition ${
                          snapshot.isDraggingOver ? "border-emerald-500/50 bg-emerald-950/20" : ""
                        }`}
                      >
                        {/* COLUMN HEADER */}
                        <div className="sticky top-0 bg-gradient-to-r from-slate-800/50 to-slate-900/50 z-10 pb-4 mb-4 -mx-6 px-6 pt-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${statusColors[status].bg} flex items-center justify-center`}>
                                <StatusIcon size={16} className="text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white text-sm">
                                  {status}
                                </h3>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900/50 border ${statusColors[status].border} ${statusColors[status].count}`}>
                              {filtered.length}
                            </span>
                          </div>
                        </div>

                        {/* CARDS */}
                        <div className="flex flex-col gap-3 flex-1">

                          {filtered.map((candidate, index) => (
                            <Draggable
                              key={candidate._id}
                              draggableId={candidate._id}
                              index={index}
                              isDragDisabled={!canEditCandidates}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() =>
                                    setSelectedCandidate(candidate)
                                  }
                                  className={`p-4 rounded-xl border ${statusColors[status].border} bg-slate-900/50 transition group ${
                                    canEditCandidates ? "cursor-move" : "cursor-pointer"
                                  } ${
                                    snapshot.isDragging
                                      ? "shadow-2xl scale-105 shadow-emerald-500/50"
                                      : "hover:shadow-lg hover:bg-slate-900/70"
                                  }`}
                                >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-100 text-sm truncate group-hover:text-emerald-400 transition">
                                        {candidate.name || "Candidate"}
                                      </h4>
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                        {candidate.appliedJob?.title || "Applied"}
                                      </p>
                                    </div>
                                    <GripVertical size={14} className="text-slate-600 flex-shrink-0 group-hover:text-emerald-500 transition opacity-0 group-hover:opacity-100" />
                                  </div>
                                  
                                  {/* Score Badge */}
                                  {candidate.matchScore && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Match</span>
                                        <span className="font-bold text-emerald-400">{candidate.matchScore}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-800/50 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                          style={{ width: `${candidate.matchScore}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}

                          {provided.placeholder}

                          {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                              <StatusIcon size={28} className="mb-2 text-slate-600" />
                              <p className="text-xs">No candidates</p>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}

            </div>
          </DragDropContext>
        </div>

        {/* ================= CANDIDATE MODAL ================= */}
        {selectedCandidate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative">

              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 transition"
              >
                <X size={20} />
              </button>

              <div className="pr-8">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedCandidate.name || "Candidate"}
                </h3>

                {selectedCandidate.appliedJob && (
                  <p className="text-sm text-slate-400 mb-6">
                    Applied for: <span className="text-emerald-400 font-semibold">{selectedCandidate.appliedJob.title}</span>
                  </p>
                )}

                {/* Status Badge */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 mb-6">
                  <p className="text-xs text-slate-500 mb-2">Current Stage</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg ${selectedStatusConfig.bg} flex items-center justify-center`}>
                      {selectedStatusConfig.icon &&
                        <selectedStatusConfig.icon size={14} className="text-white" />
                      }
                    </div>
                    <span className="font-semibold text-white">
                      {normalizeStatus(selectedCandidate.status)}
                    </span>
                  </div>
                </div>

                {/* Match Score */}
                {selectedCandidate.matchScore && (
                  <div className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-3">Match Score</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-400">{selectedCandidate.matchScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${selectedCandidate.matchScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="flex-1 px-4 py-2.5 border border-slate-700/50 text-slate-300 hover:bg-slate-700/30 hover:border-slate-600/50 rounded-lg font-medium text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <Briefcase size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium text-lg">No candidates in pipeline</p>
            <p className="text-slate-600 text-sm mt-1">Select a job or wait for applications</p>
          </div>
        )}

      </div>
    </div>
  );
}
