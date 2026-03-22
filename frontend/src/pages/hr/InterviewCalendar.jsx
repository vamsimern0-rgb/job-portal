import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  CalendarDays,
  Plus,
  Clock,
  User,
  X,
  Bell,
  RefreshCcw,
  AlertCircle,
  Video,
  MapPin,
  Phone,
  CheckCircle,
  Trash2
} from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { useToast } from "../../components/ui/ToastProvider";
import { canMutateCandidates, getStoredHrRole } from "../../utils/hrPermissions";

const interviewModes = ["Online", "Onsite", "Phone"];

const modeColor = (mode) => {
  if (mode === "Online") return { bg: "bg-gradient-to-br from-blue-600 to-blue-700", icon: Video, text: "text-blue-300" };
  if (mode === "Onsite") return { bg: "bg-gradient-to-br from-emerald-600 to-emerald-700", icon: MapPin, text: "text-emerald-300" };
  if (mode === "Phone") return { bg: "bg-gradient-to-br from-purple-600 to-purple-700", icon: Phone, text: "text-purple-300" };
  return { bg: "bg-gradient-to-br from-slate-600 to-slate-700", icon: Clock, text: "text-slate-300" };
};

export default function InterviewCalendar() {
  const toast = useToast();
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(getStoredHrRole());
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [cancelModal, setCancelModal] = useState({
    open: false,
    candidate: null,
    reason: "Interview cancelled by recruiter"
  });

  const [form, setForm] = useState({
    candidateId: "",
    date: "",
    time: "",
    mode: "Online",
    googleMeetLink: "",
    zoomLink: "",
    manager: "HR Manager",
    reminder: true,
    notes: ""
  });
  const canEditCandidates = canMutateCandidates(role);

  const scheduleableCandidates = useMemo(
    () => candidates.filter((candidate) => ["Applied", "Shortlisted", "Interview"].includes(candidate.status)),
    [candidates]
  );

  const fetchInterviews = useCallback(async () => {
    try {
      let response;
      try {
        response = await api.get("/candidates/interviews/upcoming?includePast=true");
      } catch (primaryErr) {
        if (![404, 405].includes(primaryErr?.response?.status)) {
          throw primaryErr;
        }

        try {
          response = await api.get("/candidates/interviews?includePast=true");
        } catch (secondaryErr) {
          if (![404, 405].includes(secondaryErr?.response?.status)) {
            throw secondaryErr;
          }

          response = await api.get("/candidates?interviews=true&sortBy=interviewDate&sortOrder=asc");
        }
      }

      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.items)
        ? response.data.items
        : [];
      setInterviews(data.sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate)));
    } catch (err) {
      console.error("Failed to fetch interviews", err);
      setInterviews([]);
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCandidates = useCallback(async () => {
    try {
      const response = await api.get("/candidates?sortBy=createdAt&sortOrder=desc");
      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
        ? response.data.items
        : [];
      setCandidates(items);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
      setCandidates([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInterviews(), fetchCandidates()]);
    };

    loadData();
  }, [fetchInterviews, fetchCandidates]);

  useEffect(() => {
    const secondTicker = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(secondTicker);
  }, []);

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
      fetchInterviews();
      fetchCandidates();
    };

    socket.on("pipelineUpdated", handleLiveUpdate);
    socket.on("candidateUpdated", handleLiveUpdate);

    return () => {
      socket.off("pipelineUpdated", handleLiveUpdate);
      socket.off("candidateUpdated", handleLiveUpdate);
    };
  }, [fetchCandidates, fetchInterviews]);

  const createInterview = async () => {
    if (!canEditCandidates) {
      toast.error("Your access is read-only for candidate updates.");
      return;
    }

    if (!form.candidateId || !form.date || !form.time) {
      toast.error("Candidate, date and time are required.");
      return;
    }

    const interviewDate = dayjs(`${form.date} ${form.time}`).toDate();

    if (dayjs(interviewDate).isBefore(dayjs())) {
      toast.error("Interview date/time should be in the future.");
      return;
    }

    try {
      setSaving(true);

      await api.put(`/candidates/${form.candidateId}/schedule-interview`, {
        interviewDate,
        interviewMode: form.mode,
        googleMeetLink: form.googleMeetLink,
        zoomLink: form.zoomLink,
        interviewNotes: `${form.manager ? `Manager: ${form.manager}. ` : ""}${form.notes || ""}`
      });

      setShowModal(false);
      setForm({
        candidateId: "",
        date: "",
        time: "",
        mode: "Online",
        googleMeetLink: "",
        zoomLink: "",
        manager: "HR Manager",
        reminder: true,
        notes: ""
      });

      await Promise.all([fetchInterviews(), fetchCandidates()]);
      toast.success("Interview scheduled successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule interview");
    } finally {
      setSaving(false);
    }
  };

  const rescheduleByOneDay = async (candidate) => {
    if (!canEditCandidates) {
      toast.error("Your access is read-only for candidate updates.");
      return;
    }

    if (!candidate.interviewDate) return;

    try {
      const nextDate = dayjs(candidate.interviewDate).add(1, "day").toDate();

      await api.put(`/candidates/${candidate._id}/schedule-interview`, {
        interviewDate: nextDate,
        interviewMode: candidate.interviewMode || "Online",
        googleMeetLink: candidate.googleMeetLink || "",
        zoomLink: candidate.zoomLink || "",
        interviewNotes: candidate.interviewNotes || "Rescheduled +1 day"
      });

      fetchInterviews();
      toast.success("Interview rescheduled.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reschedule failed");
    }
  };

  const cancelInterview = async (candidate, reason) => {
    if (!canEditCandidates) {
      toast.error("Your access is read-only for candidate updates.");
      return;
    }

    try {
      await api.put(`/candidates/${candidate._id}/cancel-interview`, { reason });
      fetchInterviews();
      fetchCandidates();
      toast.success("Interview cancelled.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel interview");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        {/* ================= HEADER ================= */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <CalendarDays size={20} className="text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Interview Manager</h1>
            </div>
            <p className="text-slate-400 ml-13">Schedule and manage candidate interviews</p>
          </div>

          {canEditCandidates ? (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold rounded-lg transition shadow-lg shadow-emerald-500/30"
            >
              <Plus size={18} /> Schedule Interview
            </button>
          ) : null}
        </div>

        {!canEditCandidates && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            Interview access is read-only for your role. Schedules can be reviewed but not changed.
          </div>
        )}

        {/* ================= CONTENT ================= */}
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <CalendarDays size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium text-lg">No scheduled interviews yet</p>
            <p className="text-slate-600 text-sm mt-1">Click "Schedule Interview" to book your first interview</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview._id}
                interview={interview}
                nowTick={nowTick}
                onReschedule={rescheduleByOneDay}
                canEditCandidates={canEditCandidates}
                onCancel={() =>
                  setCancelModal({
                    open: true,
                    candidate: interview,
                    reason: "Interview cancelled by recruiter"
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= SCHEDULE MODAL ================= */}
      {canEditCandidates && showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-bold text-white mb-6">Schedule Interview</h3>

            {scheduleableCandidates.length === 0 && (
              <div className="mb-6 bg-amber-950/30 border border-amber-500/30 text-amber-300 rounded-lg p-4 flex gap-3">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">No candidates available for scheduling.</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Candidate Select */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Select Candidate</label>
                <select
                  value={form.candidateId}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition appearance-none cursor-pointer"
                  onChange={(event) => setForm({ ...form, candidateId: event.target.value })}
                >
                  <option value="">Select Candidate</option>
                  {scheduleableCandidates.map((candidate) => (
                    <option key={candidate._id} value={candidate._id}>
                      {candidate.name} - {candidate.appliedJob?.title || "Job"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                    onChange={(event) => setForm({ ...form, time: event.target.value })}
                  />
                </div>
              </div>

              {/* Interview Mode */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Interview Mode</label>
                <select
                  value={form.mode}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition appearance-none cursor-pointer"
                  onChange={(event) => setForm({ ...form, mode: event.target.value })}
                >
                  {interviewModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Google Meet Link */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Google Meet Link</label>
                <input
                  type="text"
                  value={form.googleMeetLink}
                  placeholder="https://meet.google.com/..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  onChange={(event) => setForm({ ...form, googleMeetLink: event.target.value })}
                />
              </div>

              {/* Zoom Link */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Zoom Link</label>
                <input
                  type="text"
                  value={form.zoomLink}
                  placeholder="https://zoom.us/..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  onChange={(event) => setForm({ ...form, zoomLink: event.target.value })}
                />
              </div>

              {/* Interviewer Name */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Interviewer / Manager</label>
                <input
                  type="text"
                  value={form.manager}
                  placeholder="Your name or title"
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  onChange={(event) => setForm({ ...form, manager: event.target.value })}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Interview Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  placeholder="Topics to discuss, agenda, or notes..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition resize-none"
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </div>

              {/* Reminder Checkbox */}
              <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-slate-100 transition">
                <input
                  type="checkbox"
                  checked={form.reminder}
                  onChange={(event) => setForm({ ...form, reminder: event.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 cursor-pointer accent-emerald-500"
                />
                <span>Send reminder emails (24h & 1h before)</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-700/50 text-slate-300 hover:bg-slate-700/30 hover:border-slate-600/50 rounded-lg font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createInterview}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANCEL MODAL ================= */}
      {canEditCandidates && cancelModal.open && cancelModal.candidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Cancel Interview</h3>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              Provide a reason for cancelling <span className="font-semibold text-emerald-400">{cancelModal.candidate.name}</span>'s interview.
            </p>

            <textarea
              rows={3}
              value={cancelModal.reason}
              onChange={(event) =>
                setCancelModal((prev) => ({ ...prev, reason: event.target.value }))
              }
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition resize-none mb-6"
              placeholder="Cancellation reason..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelModal({ open: false, candidate: null, reason: "Interview cancelled by recruiter" })}
                className="px-4 py-2.5 border border-slate-700/50 text-slate-300 hover:bg-slate-700/30 hover:border-slate-600/50 rounded-lg font-medium text-sm transition"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const reason = cancelModal.reason?.trim() || "Interview cancelled by recruiter";
                  await cancelInterview(cancelModal.candidate, reason);
                  setCancelModal({ open: false, candidate: null, reason: "Interview cancelled by recruiter" });
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium text-sm transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= HELPER COMPONENTS =================

function InterviewCard({ interview, nowTick, onReschedule, onCancel, canEditCandidates }) {
  const modeInfo = modeColor(interview.interviewMode);
  const ModeIcon = modeInfo.icon;

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transition group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h4 className="font-bold text-slate-100 text-lg group-hover:text-emerald-400 transition">
          {interview.name || "Candidate"}
        </h4>
        <div className={`w-8 h-8 rounded-lg ${modeInfo.bg} flex items-center justify-center flex-shrink-0`}>
          <ModeIcon size={16} className="text-white" />
        </div>
      </div>

      {/* Job Title */}
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
        <User size={14} />
        <span className="truncate">{interview.appliedJob?.title || "Applied"}</span>
      </div>

      {/* Date & Time */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
          <Clock size={14} className="text-emerald-400" />
          <span>{dayjs(interview.interviewDate).format("DD MMM YYYY | HH:mm")}</span>
        </div>
        <div className="text-xs font-mono font-bold text-emerald-400">
          Time left: {formatTimeLeft(interview.interviewDate, nowTick)}
        </div>
      </div>

      {/* Meeting Links */}
      {(interview.googleMeetLink || interview.zoomLink) && (
        <div className="space-y-2 mb-4">
          {interview.googleMeetLink && (
            <a
              href={interview.googleMeetLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-950/30 border border-blue-500/30 hover:border-blue-500/60 rounded-lg text-blue-400 hover:text-blue-300 text-xs font-medium transition truncate"
            >
              <Video size={14} />
              Google Meet
            </a>
          )}
          {interview.zoomLink && (
            <a
              href={interview.zoomLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-purple-950/30 border border-purple-500/30 hover:border-purple-500/60 rounded-lg text-purple-400 hover:text-purple-300 text-xs font-medium transition truncate"
            >
              <Video size={14} />
              Zoom
            </a>
          )}
        </div>
      )}

      {/* Reminders */}
      {(interview.reminder24hSentAt || interview.reminder1hSentAt) && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2 text-xs text-emerald-300">
            <Bell size={13} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Reminders</p>
              {interview.reminder24hSentAt && <p className="text-emerald-400/80">24h reminder sent</p>}
              {interview.reminder1hSentAt && <p className="text-emerald-400/80">1h reminder sent</p>}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {interview.interviewNotes && (
        <div className="text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 mb-4 text-slate-400 line-clamp-2">
          <p className="font-semibold text-slate-300 mb-1">Notes</p>
          {interview.interviewNotes}
        </div>
      )}

      {/* Action Buttons */}
      {canEditCandidates ? (
        <div className="flex gap-2">
          <button
            onClick={() => onReschedule(interview)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-950/30 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-medium transition"
          >
            <RefreshCcw size={14} />
            +1 Day
          </button>

          <button
            onClick={() => onCancel()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-950/30 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition"
          >
            <Trash2 size={14} />
            Cancel
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Interview actions are disabled for your role.</p>
      )}
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

