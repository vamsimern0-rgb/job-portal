import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Pencil
} from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../components/ui/ToastProvider";

export default function JobList() {
  const toast = useToast();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [remoteFilter, setRemoteFilter] = useState("All");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const [updatingJobId, setUpdatingJobId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      params.set("sort", sortBy);
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (remoteFilter !== "All") params.set("remoteType", remoteFilter);
      if (employmentFilter !== "All") params.set("employmentType", employmentFilter);

      const res = await api.get(`/jobs?${params.toString()}`);
      const data = res.data;

      if (Array.isArray(data)) {
        setJobs(data);
        setPagination({ total: data.length, totalPages: 1, limit: 10 });
      } else {
        setJobs(Array.isArray(data?.items) ? data.items : []);
        setPagination({
          total: Number(data?.total) || 0,
          totalPages: Number(data?.totalPages) || 1,
          limit: Number(data?.limit) || 10
        });
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [employmentFilter, page, remoteFilter, search, sortBy, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchJobs]);

  const setFilterAndResetPage = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  const deleteJob = async (id) => {
    try {
      setUpdatingJobId(id);
      await api.delete(`/jobs/${id}`);
      toast.success("Job deleted successfully");
      setConfirmDeleteId("");
      fetchJobs();
    } catch {
      toast.error("Delete failed");
    } finally {
      setUpdatingJobId("");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setUpdatingJobId(id);
      await api.put(`/jobs/${id}/status`, { status });
      toast.success("Job status updated");
      fetchJobs();
    } catch {
      toast.error("Status update failed");
    } finally {
      setUpdatingJobId("");
    }
  };

  const rebroadcastJob = async (id) => {
    try {
      setUpdatingJobId(id);
      await api.post(`/jobs/${id}/rebroadcast`);
      toast.success("Job rebroadcast started");
      fetchJobs();
    } catch {
      toast.error("Rebroadcast failed");
    } finally {
      setUpdatingJobId("");
    }
  };

  const kpis = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((job) => job.status === "Open").length;
    const closed = jobs.filter((job) => job.status === "Closed").length;
    const paused = jobs.filter((job) => job.status === "Paused").length;
    return { total, open, closed, paused };
  }, [jobs]);

  const getStatusColor = (status) => {
    const colors = {
      Open: "bg-emerald-900/30 text-emerald-400 border-emerald-700/50",
      Closed: "bg-red-900/30 text-red-400 border-red-700/50",
      Paused: "bg-amber-900/30 text-amber-400 border-amber-700/50",
      Draft: "bg-slate-700/50 text-slate-300 border-slate-600/50"
    };
    return colors[status] || "bg-slate-700/50 text-slate-300 border-slate-600/50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8">
          
          {/* Header with Create Button */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 mb-2">
                <Briefcase className="w-8 h-8 text-emerald-400" />
                Job Management
              </h1>
              <p className="text-slate-400 text-sm">Manage and monitor all your job postings</p>
            </div>

            <button
              onClick={() => navigate("/hr/create-job")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Plus className="w-5 h-5" /> Create New Job
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard 
              title="Total Jobs" 
              value={kpis.total} 
              icon={<Briefcase className="w-5 h-5" />}
              gradient="from-blue-500 to-indigo-600"
            />
            <KpiCard 
              title="Open" 
              value={kpis.open} 
              icon={<CheckCircle className="w-5 h-5" />}
              gradient="from-emerald-500 to-teal-600"
            />
            <KpiCard 
              title="Closed" 
              value={kpis.closed}
              icon={<AlertCircle className="w-5 h-5" />}
              gradient="from-red-500 to-pink-600"
            />
            <KpiCard 
              title="Paused" 
              value={kpis.paused}
              icon={<Clock className="w-5 h-5" />}
              gradient="from-amber-500 to-orange-600"
            />
          </div>

          {/* Filters Section */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-lg p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white">Search & Filter</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                <input
                  value={search}
                  onChange={(event) => setFilterAndResetPage(setSearch)(event.target.value)}
                  placeholder="Search by title, location..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all"
                />
              </div>

              {/* Status Filter */}
              <FilterSelect
                value={statusFilter}
                onChange={setFilterAndResetPage(setStatusFilter)}
                options={[
                  { value: "All", label: "All Status" },
                  { value: "Open", label: "Open" },
                  { value: "Closed", label: "Closed" },
                  { value: "Paused", label: "Paused" },
                  { value: "Draft", label: "Draft" }
                ]}
              />

              {/* Remote Filter */}
              <FilterSelect
                value={remoteFilter}
                onChange={setFilterAndResetPage(setRemoteFilter)}
                options={[
                  { value: "All", label: "All Modes" },
                  { value: "Remote", label: "Remote" },
                  { value: "Hybrid", label: "Hybrid" },
                  { value: "Onsite", label: "Onsite" }
                ]}
              />

              {/* Employment Filter */}
              <FilterSelect
                value={employmentFilter}
                onChange={setFilterAndResetPage(setEmploymentFilter)}
                options={[
                  { value: "All", label: "All Types" },
                  { value: "Full-time", label: "Full-time" },
                  { value: "Part-time", label: "Part-time" },
                  { value: "Contract", label: "Contract" },
                  { value: "Internship", label: "Internship" }
                ]}
              />

              {/* Sort */}
              <FilterSelect
                value={sortBy}
                onChange={setFilterAndResetPage(setSortBy)}
                options={[
                  { value: "latest", label: "Latest" },
                  { value: "oldest", label: "Oldest" },
                  { value: "applicants", label: "Most Applicants" }
                ]}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-900/30 border-t-emerald-500 animate-spin mx-auto" />
                <p className="text-slate-400 font-medium">Loading jobs...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-16 px-4 bg-red-900/20 border border-red-700/50 rounded-xl">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-300 font-semibold text-lg">{error}</p>
              <button
                onClick={() => fetchJobs()}
                className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && jobs.length === 0 && (
            <div className="text-center py-16 px-4 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl">
              <Briefcase className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-lg">No jobs found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or create a new job</p>
            </div>
          )}

          {/* Jobs Table */}
          {!loading && !error && jobs.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Applicants</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Broadcast</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Updated</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {jobs.map((job) => (
                      <tr 
                        key={job._id}
                        className="hover:bg-slate-700/30 transition-colors group"
                      >
                        {/* Job Title */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{job.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{job.location || "Remote"}</p>
                          </div>
                        </td>

                        {/* Status Dropdown */}
                        <td className="px-6 py-4">
                          <select
                            value={job.status}
                            onChange={(event) => updateStatus(job._id, event.target.value)}
                            disabled={updatingJobId === job._id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-60 ${getStatusColor(job.status)}`}
                          >
                            <option value="Open" className="bg-slate-900 text-white">Open</option>
                            <option value="Closed" className="bg-slate-900 text-white">Closed</option>
                            <option value="Paused" className="bg-slate-900 text-white">Paused</option>
                            <option value="Draft" className="bg-slate-900 text-white">Draft</option>
                          </select>
                        </td>

                        {/* Employment Type & Remote */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-xs text-white font-medium">{job.employmentType || "Full-time"}</p>
                            <p className="text-xs text-slate-400">{job.remoteType || "Onsite"}</p>
                          </div>
                        </td>

                        {/* Applicants Count */}
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 text-blue-300 px-3 py-1.5 rounded-lg text-sm font-semibold">
                            <Users className="w-4 h-4" />
                            {job.applicantsCount || 0}
                          </div>
                        </td>

                        {/* Broadcast Stats */}
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-300">Matched: <span className="font-semibold text-emerald-400">{job.broadcastStats?.matchedStudents || 0}</span></p>
                            <p className="text-slate-400">Email: {job.broadcastStats?.emailSent || 0}</p>
                          </div>
                        </td>

                        {/* Updated Date */}
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-400">
                            {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : "N/A"}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/hr/create-job?edit=${job._id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold rounded-lg transition-all"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => navigate(`/hr/ats/${job._id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-900/40 border border-blue-700/50 text-blue-300 hover:bg-blue-900/60 text-xs font-semibold rounded-lg transition-all"
                            >
                              <Eye className="w-3 h-3" /> ATS
                            </button>
                            <button
                              onClick={() => rebroadcastJob(job._id)}
                              disabled={updatingJobId === job._id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:bg-purple-900/60 text-xs font-semibold rounded-lg transition-all disabled:opacity-60"
                            >
                              <RefreshCw className="w-3 h-3" /> Rebroadcast
                            </button>
                            <button
                              onClick={() => {
                                if (confirmDeleteId === job._id) {
                                  deleteJob(job._id);
                                } else {
                                  setConfirmDeleteId(job._id);
                                  toast.info("Click delete again to confirm");
                                }
                              }}
                              disabled={updatingJobId === job._id}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-60 ${
                                confirmDeleteId === job._id
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-red-900/40 border border-red-700/50 text-red-300 hover:bg-red-900/60"
                              }`}
                            >
                              <Trash2 className="w-3 h-3" /> {confirmDeleteId === job._id ? "Confirm?" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-sm text-slate-400">
                Showing page <span className="font-semibold text-white">{page}</span> of <span className="font-semibold text-white">{pagination.totalPages}</span> ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-600/50 bg-slate-700/30 hover:bg-slate-700/60 text-slate-300 hover:text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-600/50 bg-slate-700/30 hover:bg-slate-700/60 text-slate-300 hover:text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KpiCard({ title, value, icon, gradient }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur hover:bg-slate-800/70 transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white mt-3">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} text-white opacity-80 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Filter Select Component
function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-700/50 border border-slate-600/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white rounded-lg px-4 py-2.5 text-sm transition-all appearance-none cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">{opt.label}</option>
      ))}
    </select>
  );
}
