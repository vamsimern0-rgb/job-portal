import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useToast } from "../../components/ui/ToastProvider";
import { Clock, Search, Filter, History, User, Briefcase } from "lucide-react";

dayjs.extend(relativeTime);

const actionIcons = {
  "Applied": "✓",
  "Shortlisted": "⭐",
  "Interview": "🎤",
  "Hired": "✨",
  "Rejected": "❌",
  "Updated": "📝",
  "Scheduled": "📅"
};

const actionColors = {
  "Applied": { bg: "bg-blue-950/30", border: "border-blue-500/30", text: "text-blue-300", dot: "bg-blue-500" },
  "Shortlisted": { bg: "bg-amber-950/30", border: "border-amber-500/30", text: "text-amber-300", dot: "bg-amber-500" },
  "Interview": { bg: "bg-purple-950/30", border: "border-purple-500/30", text: "text-purple-300", dot: "bg-purple-500" },
  "Hired": { bg: "bg-emerald-950/30", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-500" },
  "Rejected": { bg: "bg-red-950/30", border: "border-red-500/30", text: "text-red-300", dot: "bg-red-500" },
  "Updated": { bg: "bg-slate-950/30", border: "border-slate-500/30", text: "text-slate-300", dot: "bg-slate-500" },
  "Scheduled": { bg: "bg-cyan-950/30", border: "border-cyan-500/30", text: "text-cyan-300", dot: "bg-cyan-500" }
};

const getActionColor = (action) => {
  const foundKey = Object.keys(actionColors).find(key => action.toLowerCase().includes(key.toLowerCase()));
  return actionColors[foundKey] || actionColors["Updated"];
};

const resolveLogTimestamp = (candidate, log) => {
  const raw = log?.timestamp || candidate?.updatedAt || candidate?.createdAt || null;
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.toISOString() : null;
};

const buildLogsFromCandidates = (list = []) => {
  const logs = [];

  (Array.isArray(list) ? list : []).forEach((candidate) => {
    if (!Array.isArray(candidate?.activityLog) || candidate.activityLog.length === 0) return;

    candidate.activityLog.forEach((log) => {
      if (!log?.action) return;

      const timestamp = resolveLogTimestamp(candidate, log);
      if (!timestamp) return;

      logs.push({
        candidateName: candidate?.name || "Candidate",
        action: String(log.action),
        timestamp,
        jobTitle: candidate?.appliedJob?.title || ""
      });
    });
  });

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return logs;
};

export default function ActivityTimeline() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  const extractLogs = useCallback((data) => {
    setFilteredLogs(buildLogsFromCandidates(data));
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get("/candidates");
      const candidateData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : [];
      setCandidates(candidateData);
      extractLogs(candidateData);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load activity timeline.");
    } finally {
      setLoading(false);
    }
  }, [extractLogs, toast]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const applyFilters = () => {
    let logs = buildLogsFromCandidates(candidates);

    if (actionFilter) {
      logs = logs.filter(log =>
        String(log?.action || "").toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    if (fromDate) {
      logs = logs.filter(log =>
        dayjs(log.timestamp).isValid() &&
        !dayjs(log.timestamp).isBefore(dayjs(fromDate), "day")
      );
    }

    if (toDate) {
      logs = logs.filter(log =>
        dayjs(log.timestamp).isValid() &&
        !dayjs(log.timestamp).isAfter(dayjs(toDate), "day")
      );
    }

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setFilteredLogs(logs);
    toast.info(`Filters applied. ${logs.length} activities visible.`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading activity timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8">

        {/* ================= HEADER ================= */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <History size={20} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Activity Timeline</h1>
          </div>
          <p className="text-slate-400 ml-13">Track all recruitment activities in real-time</p>
        </div>

        {/* ================= FILTER SECTION ================= */}
        <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Action Filter */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">Filter by Action</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition" />
                <input
                  type="text"
                  placeholder="e.g., Interview, Hired..."
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition group-hover:border-slate-600/50"
                />
              </div>
            </div>

            {/* From Date */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition group-hover:border-slate-600/50"
              />
            </div>

            {/* To Date */}
            <div className="group">
              <label className="text-xs font-medium text-slate-400 mb-2 block">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition group-hover:border-slate-600/50"
              />
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Filter size={16} />
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* ================= TIMELINE ================= */}
        <div className="relative">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <History size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-400 font-medium text-lg">No activities found</p>
              <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => {
                const colorConfig = getActionColor(log.action);
                
                return (
                  <div key={index} className={`relative pl-8 pb-8 ${index !== filteredLogs.length - 1 ? "border-l border-slate-700/50" : ""}`}>
                    {/* Timeline Dot */}
                    <div className={`absolute -left-4 top-1 w-6 h-6 rounded-full border-2 ${colorConfig.dot} border-slate-800 bg-slate-900`}></div>

                    {/* Activity Card */}
                    <div className={`group bg-slate-800/40 border ${colorConfig.border} backdrop-blur-sm rounded-xl p-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3">
                        <div className="flex-1">
                          {/* Candidate Name */}
                          <div className="flex items-center gap-2 mb-2">
                            <User size={14} className="text-slate-500" />
                            <h4 className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition">
                              {log.candidateName}
                            </h4>
                          </div>

                          {/* Action Badge */}
                          <div className={`inline-flex items-center gap-2 ${colorConfig.bg} border ${colorConfig.border} px-3 py-1.5 rounded-lg`}>
                            <span className="text-lg">{actionIcons[log.action] || "📌"}</span>
                            <span className={`text-xs font-semibold ${colorConfig.text}`}>
                              {log.action}
                            </span>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-right">
                          <Clock size={13} />
                          <span className="font-mono">{dayjs(log.timestamp).format("DD MMM YYYY • HH:mm")}</span>
                        </div>
                      </div>

                      {/* Job Info */}
                      {log.jobTitle && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs mt-3 pt-3 border-t border-slate-700/50">
                          <Briefcase size={13} className="text-emerald-500/60" />
                          <span>{log.jobTitle}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= Activity Stats ================= */}
        {filteredLogs.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">Total Activities</p>
                <p className="text-2xl font-bold text-white">{filteredLogs.length}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">Unique Candidates</p>
                <p className="text-2xl font-bold text-emerald-400">{new Set(filteredLogs.map(l => l.candidateName)).size}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">Date Range</p>
                <p className="text-sm font-semibold text-slate-300">
                  {filteredLogs.length > 0 
                    ? `${filteredLogs.length > 0 ? dayjs(filteredLogs[filteredLogs.length - 1].timestamp).format("DD MMM") : "N/A"} - ${dayjs(filteredLogs[0].timestamp).format("DD MMM")}`
                    : "N/A"}
                </p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">Most Recent</p>
                <p className="text-sm font-semibold text-slate-300">
                  {filteredLogs.length > 0 ? dayjs(filteredLogs[0].timestamp).fromNow() : "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
