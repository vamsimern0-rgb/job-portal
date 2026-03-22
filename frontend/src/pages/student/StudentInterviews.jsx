import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Search, ChevronLeft, ChevronRight, Video, Phone } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentInterviews() {
  const toast = useToast();
  const [type, setType] = useState("upcoming");
  const [modeFilter, setModeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [nowTick, setNowTick] = useState(Date.now());
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 10
  });

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("type", type);
      params.set("sort", sortBy);
      params.set("page", String(page));
      params.set("limit", "10");
      if (modeFilter) params.set("mode", modeFilter);
      if (search.trim()) params.set("q", search.trim());

      const response = await api.get(`/student/interviews?${params.toString()}`);
      const data = response.data;

      if (Array.isArray(data)) {
        setInterviews(data);
        setPagination({ total: data.length, totalPages: 1, limit: 10 });
      } else {
        setInterviews(Array.isArray(data?.items) ? data.items : []);
        setPagination({
          total: Number(data?.total) || 0,
          totalPages: Number(data?.totalPages) || 1,
          limit: Number(data?.limit) || 10
        });
      }

      setError("");
    } catch (err) {
      console.error("Interview fetch failed", err);
      setInterviews([]);
      setError("Failed to load interviews");
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [modeFilter, page, search, sortBy, toast, type]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInterviews();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchInterviews]);

  useEffect(() => {
    const secondTicker = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(secondTicker);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchInterviews();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchInterviews]);

  const updateFilter = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-900/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading interviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white backdrop-blur-sm border border-red-200/50 rounded-2xl p-8 max-w-md">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        {/* ================= HEADER ================= */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Interview Tracker
            </h1>
            <p className="text-slate-600 mt-1">Track and manage your upcoming and past interviews</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <TypeFilterButton
              active={type === "upcoming"}
              onClick={() => updateFilter(setType)("upcoming")}
              label="Upcoming"
            />
            <TypeFilterButton
              active={type === "past"}
              onClick={() => updateFilter(setType)("past")}
              label="Past"
            />
            <TypeFilterButton
              active={type === "all"}
              onClick={() => updateFilter(setType)("all")}
              label="All"
            />
          </div>
        </div>

        {/* ================= STICKY FILTER BAR ================= */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 sm:p-6 shadow-sm mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2 flex items-center gap-3 bg-slate-50/50 border border-slate-200/50 rounded-xl px-4 py-2.5 hover:border-blue-300/50 transition">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => updateFilter(setSearch)(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder-slate-500"
                placeholder="Search by job title..."
              />
            </div>

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={(e) => updateFilter(setModeFilter)(e.target.value)}
              className="border border-slate-200/50 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white hover:border-blue-300/50 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-300/50 outline-none transition appearance-none cursor-pointer"
            >
              <option value="">All Interview Modes</option>
              <option value="Online">Online</option>
              <option value="Onsite">Onsite</option>
              <option value="Phone">Phone</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => updateFilter(setSortBy)(e.target.value)}
              className="border border-slate-200/50 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white hover:border-blue-300/50 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-300/50 outline-none transition appearance-none cursor-pointer"
            >
              <option value="date">Interview Date</option>
              <option value="latest">Latest Created</option>
              <option value="oldest">Oldest Created</option>
            </select>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        {interviews.length === 0 ? (
          <EmptyState type={type} />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {interviews.map((interview) => (
                <InterviewCard
                  key={interview._id}
                  interview={interview}
                  nowTick={nowTick}
                />
              ))}
            </div>

            {/* ================= PAGINATION ================= */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 sm:p-6">
                <p className="text-sm text-slate-600">
                  Showing page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                  <span className="font-semibold text-slate-900">{pagination.totalPages}</span> ({pagination.total} total)
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200/50 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                    disabled={page >= pagination.totalPages}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200/50 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ================= HELPER COMPONENTS =================

function TypeFilterButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 sm:px-6 py-2.5 text-sm font-medium rounded-lg transition ${
        active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
          : "bg-white border border-slate-200/50 text-slate-700 hover:border-blue-300/50 hover:text-blue-600"
      }`}
    >
      {label}
    </button>
  );
}

function InterviewCard({ interview, nowTick }) {
  const interviewDate = new Date(interview.interviewDate);
  const timeLeft = formatTimeLeft(interview.interviewDate, nowTick);
  const isPhoneCall = interview.interviewMode === "Phone";

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 hover:shadow-lg hover:border-blue-300/50 transition group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-bold text-slate-900 line-clamp-2 text-lg group-hover:text-blue-600 transition">
          {interview.appliedJob?.title || "Interview"}
        </h3>
        <ModeModeBadge mode={interview.interviewMode} />
      </div>

      {/* Info Grid */}
      <div className="space-y-3 mb-5">
        {/* Date */}
        <div className="flex items-center gap-3 text-slate-600">
          <CalendarDays size={16} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm">{interviewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-3 text-slate-600">
          <Clock size={16} className="text-indigo-500 flex-shrink-0" />
          <span className="text-sm">{interviewDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Time Left */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-lg px-3 py-2">
          <span className="text-xs font-bold text-blue-700">Time Left:</span>
          <span className="text-sm font-mono font-bold text-blue-600">{timeLeft}</span>
        </div>

        {/* Location */}
        {!isPhoneCall && (
          <div className="flex items-center gap-3 text-slate-600">
            <MapPin size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-sm">{interview.appliedJob?.location || "Location TBD"}</span>
          </div>
        )}
      </div>

      {/* Meeting Links */}
      {(interview.googleMeetLink || interview.zoomLink) && (
        <div className="space-y-2 mb-4 pb-4 border-t border-slate-200/50 pt-4">
          {interview.googleMeetLink && (
            <a
              href={interview.googleMeetLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200/50 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition text-blue-700 text-sm font-medium"
            >
              <Video size={16} />
              Join Google Meet
            </a>
          )}
          {interview.zoomLink && (
            <a
              href={interview.zoomLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-200/50 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition text-indigo-700 text-sm font-medium"
            >
              <Video size={16} />
              Join Zoom Meeting
            </a>
          )}
        </div>
      )}

      {/* Zoom Locked Message */}
      {interview.zoomLinkLocked && (
        <div className="bg-amber-50 border border-amber-200/50 rounded-lg px-3 py-2.5 flex items-start gap-2">
          <span className="text-amber-600 text-lg mt-0.5">🔒</span>
          <p className="text-xs text-amber-700">
            {interview.zoomLinkMessage || "Zoom link will be shared 1 hour before the interview"}
          </p>
        </div>
      )}
    </div>
  );
}

function ModeModeBadge({ mode }) {
  const variants = {
    Online: {
      bg: "bg-gradient-to-r from-blue-100 to-blue-50",
      border: "border-blue-200/50",
      text: "text-blue-700"
    },
    Onsite: {
      bg: "bg-gradient-to-r from-red-100 to-red-50",
      border: "border-red-200/50",
      text: "text-red-700"
    },
    Phone: {
      bg: "bg-gradient-to-r from-green-100 to-green-50",
      border: "border-green-200/50",
      text: "text-green-700"
    }
  };

  const variant = variants[mode] || variants.Online;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${variant.bg} border ${variant.border} ${variant.text} whitespace-nowrap`}>
      {mode === "Phone" && <Phone size={13} />}
      {mode === "Online" && <Video size={13} />}
      {mode === "Onsite" && <MapPin size={13} />}
      {mode || "Online"}
    </span>
  );
}

function EmptyState({ type }) {
  const messages = {
    upcoming: "No upcoming interviews scheduled",
    past: "No past interviews found",
    all: "No interviews found"
  };

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-12 max-w-md">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{messages[type]}</h3>
        <p className="text-slate-600 text-sm">
          {type === "upcoming" && "Check back soon for interview updates"}
          {type === "past" && "Your past interviews will appear here"}
          {type === "all" && "No interview records yet"}
        </p>
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
