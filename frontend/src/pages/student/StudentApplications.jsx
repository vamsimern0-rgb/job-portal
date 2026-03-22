import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Briefcase, Search, X, ChevronLeft, ChevronRight, Filter, CheckCircle, Clock, AlertCircle, Zap } from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentApplications() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [error, setError] = useState(null);

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState("");
  const [respondingOfferId, setRespondingOfferId] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 10
  });

  const fetchApplications = useCallback(
    async (options = {}) => {
      const {
        q = search,
        status = statusFilter,
        sort = sortBy,
        targetPage = page
      } = options;

      try {
        if (!options.silent) setLoading(true);

        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", "10");
        params.set("sort", sort || "latest");
        if (status) params.set("status", status);
        if (q?.trim()) params.set("q", q.trim());

        const { data } = await api.get(`/student/applications?${params.toString()}`);

        if (Array.isArray(data)) {
          setApplications(data);
          setPagination({ total: data.length, totalPages: 1, limit: 10 });
        } else {
          setApplications(Array.isArray(data?.items) ? data.items : []);
          setPagination({
            total: Number(data?.total) || 0,
            totalPages: Number(data?.totalPages) || 1,
            limit: Number(data?.limit) || 10
          });
        }

        setError(null);
      } catch (err) {
        console.error("Applications fetch error:", err);
        setError("Failed to load applications");
        setApplications([]);
      } finally {
        if (!options.silent) setLoading(false);
      }
    },
    [search, statusFilter, sortBy, page]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications({ q: search, status: statusFilter, sort: sortBy, targetPage: page });
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchApplications, search, statusFilter, sortBy, page]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchApplications({ silent: true, q: search, status: statusFilter, sort: sortBy, targetPage: page });
    };

    socket.on("applicationUpdate", handleUpdate);
    socket.on("studentNotification", handleUpdate);

    return () => {
      socket.off("applicationUpdate", handleUpdate);
      socket.off("studentNotification", handleUpdate);
    };
  }, [fetchApplications, page, search, sortBy, statusFilter]);

  const openApplicationDetails = async (applicationId) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/student/applications/${applicationId}`);
      setSelectedApplication(response.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load application details");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateFilter = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  const withdrawApplication = async (applicationId) => {
    const confirm = window.confirm("Are you sure you want to withdraw this application?");
    if (!confirm) return;

    try {
      setWithdrawingId(applicationId);
      const response = await api.delete(`/student/applications/${applicationId}`);
      const updatedApplication = response?.data?.application || null;

      if (updatedApplication && selectedApplication?._id === applicationId) {
        setSelectedApplication(updatedApplication);
      }

      await fetchApplications({
        q: search,
        status: statusFilter,
        sort: sortBy,
        targetPage: page
      });
      toast.success(response?.data?.message || "Application withdrawn successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to withdraw application");
    } finally {
      setWithdrawingId("");
    }
  };

  const respondToOffer = async (applicationId, decision) => {
    const confirmMessage =
      decision === "accept"
        ? "Are you sure you want to accept this offer?"
        : "Are you sure you want to decline this offer?";

    if (!window.confirm(confirmMessage)) return;

    const note = window.prompt("Optional note", "") ?? "";

    try {
      setRespondingOfferId(applicationId);
      const response = await api.put(`/student/applications/${applicationId}/offer-response`, {
        decision,
        note
      });
      const updatedApplication = response?.data?.application || null;

      if (updatedApplication) {
        setApplications((prev) =>
          prev.map((item) => (item._id === updatedApplication._id ? updatedApplication : item))
        );

        if (selectedApplication?._id === updatedApplication._id) {
          setSelectedApplication(updatedApplication);
        }
      } else {
        await fetchApplications({
          q: search,
          status: statusFilter,
          sort: sortBy,
          targetPage: page
        });
      }

      toast.success(response?.data?.message || "Offer response submitted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit offer response");
    } finally {
      setRespondingOfferId("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center px-4">
        <div className="text-center py-16 px-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-semibold text-lg">{error}</p>
          <button
            onClick={() => fetchApplications()}
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-blue-600" />
              My Applications
            </h1>
            <p className="text-slate-600">
              Track your applications and interview progress
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl shadow-lg p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Search & Filter</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => updateFilter(setSearch)(event.target.value)}
                  placeholder="Search by job title..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                className="bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-sm transition-all appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(event) => updateFilter(setStatusFilter)(event.target.value)}
              >
                <option value="">All Status</option>
                <option value="Applied">Applied</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Sort Filter */}
              <select
                className="bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-sm transition-all appearance-none cursor-pointer"
                value={sortBy}
                onChange={(event) => updateFilter(setSortBy)(event.target.value)}
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="match">Best Match</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Applications List */}
          {applications.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-lg">No applications found</p>
              <p className="text-slate-500 text-sm mt-1">Start applying to jobs to track them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <ApplicationCard
                  key={application._id}
                  application={application}
                  onViewDetails={() => openApplicationDetails(application._id)}
                  onWithdraw={() => withdrawApplication(application._id)}
                  onAcceptOffer={() => respondToOffer(application._id, "accept")}
                  onDeclineOffer={() => respondToOffer(application._id, "decline")}
                  withdrawing={withdrawingId === application._id}
                  respondingOffer={respondingOfferId === application._id}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-600">
                Showing page <span className="font-semibold text-slate-900">{page}</span> of <span className="font-semibold text-slate-900">{pagination.totalPages}</span> ({pagination.total} total)
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                  <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
                  <p className="text-slate-600">Loading details...</p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedApplication.appliedJob?.title || "Job"}</h3>
                    <p className="text-sm text-slate-600 mt-2">Application Details</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canWithdraw(selectedApplication.status) && (
                      <button
                        onClick={() => withdrawApplication(selectedApplication._id)}
                        disabled={withdrawingId === selectedApplication._id}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
                      >
                        {withdrawingId === selectedApplication._id ? "Withdrawing..." : "Withdraw"}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedApplication(null)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Key Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <DetailCard
                    label="Status"
                    value={selectedApplication.status || "N/A"}
                    icon={getStatusIcon(selectedApplication.status)}
                  />
                  <DetailCard
                    label="Match Score"
                    value={`${selectedApplication.matchScore || 0}%`}
                  />
                  <DetailCard
                    label="Applied On"
                    value={selectedApplication.createdAt ? new Date(selectedApplication.createdAt).toLocaleDateString() : "N/A"}
                  />
                  <DetailCard
                    label="Interview"
                    value={
                      selectedApplication.interviewDate
                        ? new Date(selectedApplication.interviewDate).toLocaleString()
                        : "Not scheduled"
                    }
                  />
                </div>

                {/* Interview Alert */}
                {selectedApplication.status === "Interview" && selectedApplication.interviewDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Interview Scheduled</p>
                      <p className="text-sm text-slate-600 mt-1">{new Date(selectedApplication.interviewDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Offer Section */}
                {selectedApplication.offer && selectedApplication.offer.status !== "NotSent" && (
                  <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Offer Details</h4>
                    <p className="text-sm text-emerald-800">
                      Status: <span className="font-semibold">{selectedApplication.offer.status}</span>
                    </p>
                    {selectedApplication.offer.salaryOffered && (
                      <p className="text-sm text-emerald-800">Salary: {selectedApplication.offer.salaryOffered}</p>
                    )}
                    {selectedApplication.offer.joiningDate && (
                      <p className="text-sm text-emerald-800">
                        Joining Date: {new Date(selectedApplication.offer.joiningDate).toLocaleDateString()}
                      </p>
                    )}
                    {selectedApplication.offer.letterUrl && (
                      <a
                        href={selectedApplication.offer.letterUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm text-emerald-700 underline hover:text-emerald-800"
                      >
                        View Offer Letter
                      </a>
                    )}

                    {canRespondOffer(selectedApplication.offer?.status) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => respondToOffer(selectedApplication._id, "accept")}
                          disabled={respondingOfferId === selectedApplication._id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
                        >
                          {respondingOfferId === selectedApplication._id ? "Processing..." : "Accept Offer"}
                        </button>
                        <button
                          onClick={() => respondToOffer(selectedApplication._id, "decline")}
                          disabled={respondingOfferId === selectedApplication._id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
                        >
                          {respondingOfferId === selectedApplication._id ? "Processing..." : "Decline Offer"}
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {/* Job Description */}
                {selectedApplication.appliedJob?.description && (
                  <section>
                    <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Job Description</h4>
                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedApplication.appliedJob.description}
                    </div>
                  </section>
                )}

                {/* Screening Answers */}
                {selectedApplication.screeningAnswers?.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Screening Answers</h4>
                    <div className="space-y-3">
                      {selectedApplication.screeningAnswers.map((item, index) => (
                        <div key={`${selectedApplication._id}-screening-${index}`} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Question {index + 1}</p>
                          <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                          <p className="text-sm text-slate-700">{item.answer || "No answer provided"}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Activity Timeline */}
                {selectedApplication.activityLog?.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Activity Timeline</h4>
                    <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                      {selectedApplication.activityLog
                        .slice()
                        .reverse()
                        .map((log, index) => (
                          <div key={`${selectedApplication._id}-activity-${index}`} className="pb-4 last:pb-0">
                            <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Application Card Component
function ApplicationCard({
  application,
  onViewDetails,
  onWithdraw,
  onAcceptOffer,
  onDeclineOffer,
  withdrawing = false,
  respondingOffer = false
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300/50 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{application.appliedJob?.title || "Job"}</h3>
          <p className="text-sm text-slate-600 mt-1">
            Applied on {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "N/A"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={application.status} />
          <MatchScoreBadge score={application.matchScore || 0} />
          {application.offer?.status && application.offer.status !== "NotSent" && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
              Offer: {application.offer.status}
            </span>
          )}
          {canWithdraw(application.status) && (
            <button
              onClick={onWithdraw}
              disabled={withdrawing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-60"
            >
              {withdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
          )}
          {canRespondOffer(application.offer?.status) && (
            <>
              <button
                onClick={onAcceptOffer}
                disabled={respondingOffer}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-60"
              >
                {respondingOffer ? "..." : "Accept"}
              </button>
              <button
                onClick={onDeclineOffer}
                disabled={respondingOffer}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-60"
              >
                {respondingOffer ? "..." : "Decline"}
              </button>
            </>
          )}
          <button
            onClick={onViewDetails}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-all"
          >
            View
          </button>
        </div>
      </div>

      {/* Interview Alert */}
      {application.status === "Interview" && application.interviewDate && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <span className="text-slate-700">Interview: {new Date(application.interviewDate).toLocaleDateString()}</span>
        </div>
      )}

      {/* Activity Preview */}
      {application.activityLog?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2">Latest Activity</p>
          <p className="text-xs text-slate-600">{application.activityLog[application.activityLog.length - 1]?.action}</p>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }) {
  const colors = {
    Applied: "from-slate-400 to-slate-500 text-slate-100",
    Shortlisted: "from-amber-500 to-orange-600 text-amber-100",
    Interview: "from-blue-500 to-indigo-600 text-blue-100",
    Hired: "from-emerald-500 to-teal-600 text-emerald-100",
    Rejected: "from-red-500 to-pink-600 text-red-100"
  };

  const gradient = colors[status] || colors.Applied;

  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r ${gradient}`}>
      {status || "Unknown"}
    </span>
  );
}

function MatchScoreBadge({ score }) {
  let gradient = "from-slate-400 to-slate-500 text-slate-100";

  if (score >= 80) gradient = "from-emerald-500 to-teal-600 text-emerald-100";
  else if (score >= 60) gradient = "from-blue-500 to-indigo-600 text-blue-100";
  else if (score >= 40) gradient = "from-amber-500 to-orange-600 text-amber-100";

  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r ${gradient}`}>
      {score}% Match
    </div>
  );
}

function DetailCard({ label, value, icon }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2">{icon}{value}</p>
    </div>
  );
}

function getStatusIcon(status) {
  const iconClasses = "w-5 h-5";
  if (status === "Hired") return <CheckCircle className={`${iconClasses} text-emerald-600`} />;
  if (status === "Shortlisted") return <Zap className={`${iconClasses} text-amber-600`} />;
  if (status === "Interview") return <Clock className={`${iconClasses} text-blue-600`} />;
  if (status === "Rejected") return <AlertCircle className={`${iconClasses} text-red-600`} />;
  return null;
}

function canWithdraw(status) {
  return !["Hired", "Rejected"].includes(status || "");
}

function canRespondOffer(status) {
  return status === "Sent";
}
