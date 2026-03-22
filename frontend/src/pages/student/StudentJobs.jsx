import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { Search, MapPin, Briefcase, X, AlertCircle, CheckCircle, Filter, Zap } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [remoteTypeFilter, setRemoteTypeFilter] = useState("All");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [minMatchScore, setMinMatchScore] = useState("");

  const [applyJob, setApplyJob] = useState(null);
  const [screeningAnswers, setScreeningAnswers] = useState([]);
  const [submittingApp, setSubmittingApp] = useState(false);

  const [jobDetail, setJobDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (remoteTypeFilter !== "All") params.set("remoteType", remoteTypeFilter);
    if (employmentTypeFilter !== "All") params.set("employmentType", employmentTypeFilter);
    if (minMatchScore !== "") params.set("minMatchScore", minMatchScore);
    params.set("sort", sortBy);
    return params.toString();
  }, [search, remoteTypeFilter, employmentTypeFilter, minMatchScore, sortBy]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/student/jobs?${queryString}`);
      setJobs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Jobs fetch error:", err);
      setError("Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  const visibleJobs = useMemo(() => {
    if (experienceFilter === "") return jobs;
    return jobs.filter(
      (job) => Number(job.experienceRequired || 0) <= Number(experienceFilter)
    );
  }, [jobs, experienceFilter]);

  const applyToJob = async (jobId, answers = []) => {
    try {
      setSubmittingApp(true);
      await api.post("/student/apply", {
        jobId,
        screeningAnswers: answers
      });
      toast.success("Application submitted successfully!");
      setApplyJob(null);
      setScreeningAnswers([]);
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit application");
    } finally {
      setSubmittingApp(false);
    }
  };

  const startApplication = (job) => {
    if (job.screeningQuestions?.length > 0) {
      setApplyJob(job);
      setScreeningAnswers(
        job.screeningQuestions.map((question) => ({
          question,
          answer: ""
        }))
      );
      return;
    }
    applyToJob(job._id);
  };

  const saveJob = async (jobId) => {
    try {
      await api.post(`/student/saved-jobs/${jobId}`);
      setJobs((prev) =>
        prev.map((job) =>
          job._id === jobId ? { ...job, isSaved: true } : job
        )
      );
      toast.success("Job saved!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save job");
    }
  };

  const unsaveJob = async (jobId) => {
    try {
      await api.delete(`/student/saved-jobs/${jobId}`);
      setJobs((prev) =>
        prev.map((job) =>
          job._id === jobId ? { ...job, isSaved: false } : job
        )
      );
      toast.success("Job removed from saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove saved job");
    }
  };

  const openJobDetail = async (jobId) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/student/jobs/${jobId}`);
      setJobDetail(response.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load job details");
    } finally {
      setDetailLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return "from-emerald-500 to-teal-600 text-emerald-700";
    if (score >= 60) return "from-blue-500 to-indigo-600 text-blue-700";
    return "from-amber-500 to-orange-600 text-amber-700";
  };

  const getMatchLabel = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Decent Match";
  };

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12">
          <div className="text-center py-20 px-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 font-semibold text-lg">{error}</p>
            <button
              onClick={() => fetchJobs()}
              className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-blue-600" />
              Explore Opportunities
            </h1>
            <p className="text-slate-600">
              {visibleJobs.length} {visibleJobs.length === 1 ? "job" : "jobs"} matching your profile
            </p>
          </div>

          {/* Filters Section */}
          <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl shadow-lg p-5 md:p-6 sticky top-0 z-40">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Filters</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Experience */}
              <FilterSelect
                value={experienceFilter}
                onChange={setExperienceFilter}
                options={[
                  { value: "", label: "All Experience" },
                  { value: "0", label: "Fresher" },
                  { value: "1", label: "1 Year" },
                  { value: "2", label: "2 Years" },
                  { value: "3", label: "3+ Years" }
                ]}
              />

              {/* Remote Type */}
              <FilterSelect
                value={remoteTypeFilter}
                onChange={setRemoteTypeFilter}
                options={[
                  { value: "All", label: "All Modes" },
                  { value: "Remote", label: "Remote" },
                  { value: "Hybrid", label: "Hybrid" },
                  { value: "Onsite", label: "Onsite" }
                ]}
              />

              {/* Employment Type */}
              <FilterSelect
                value={employmentTypeFilter}
                onChange={setEmploymentTypeFilter}
                options={[
                  { value: "All", label: "All Types" },
                  { value: "Full-time", label: "Full-time" },
                  { value: "Part-time", label: "Part-time" },
                  { value: "Contract", label: "Contract" },
                  { value: "Internship", label: "Internship" }
                ]}
              />

              {/* Match Score */}
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Min match %"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-sm transition-all"
              />

              {/* Sort */}
              <FilterSelect
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: "match", label: "Best Match" },
                  { value: "latest", label: "Latest" }
                ]}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto" />
                <p className="text-slate-600 font-medium">Loading opportunities...</p>
              </div>
            </div>
          )}

          {/* Jobs Grid */}
          {!loading && visibleJobs.length === 0 && (
            <div className="text-center py-16 px-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-dashed border-slate-300">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-lg">No opportunities found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms</p>
            </div>
          )}

          {!loading && visibleJobs.length > 0 && (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {visibleJobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onApply={() => startApplication(job)}
                  onView={() => openJobDetail(job._id)}
                  onSave={() => saveJob(job._id)}
                  onUnsave={() => unsaveJob(job._id)}
                  getMatchColor={getMatchColor}
                  getMatchLabel={getMatchLabel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {applyJob && (
        <Modal onClose={() => { setApplyJob(null); setScreeningAnswers([]); }}>
          <div className="w-full max-w-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{applyJob.title}</h2>
                <p className="text-slate-600 mt-1">Screening Questions</p>
              </div>
              <button
                onClick={() => { setApplyJob(null); setScreeningAnswers([]); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-5 max-h-96 overflow-y-auto mb-6 pr-2">
              {screeningAnswers.map((item, index) => (
                <div key={`${applyJob._id}-q-${index}`} className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Question {index + 1}
                  </label>
                  <p className="text-slate-600 text-sm mb-3">{item.question}</p>
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(e) =>
                      setScreeningAnswers((prev) =>
                        prev.map((answer, answerIndex) =>
                          answerIndex === index
                            ? { ...answer, answer: e.target.value }
                            : answer
                        )
                      )
                    }
                    placeholder="Type your answer here..."
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-3 text-sm transition-all resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                onClick={() => { setApplyJob(null); setScreeningAnswers([]); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => applyToJob(applyJob._id, screeningAnswers)}
                disabled={submittingApp}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submittingApp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-200 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Job Detail Modal */}
      {jobDetail && (
        <Modal onClose={() => setJobDetail(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{jobDetail.title}</h2>
                <p className="text-slate-600 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {jobDetail.location || "Remote"}
                </p>
              </div>
              <button
                onClick={() => setJobDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-600">Loading details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Meta Info */}
                <div className="grid md:grid-cols-3 gap-3">
                  <DetailCard label="Employment Type" value={jobDetail.employmentType || "Full-time"} />
                  <DetailCard label="Work Mode" value={jobDetail.remoteType || "Onsite"} />
                  <DetailCard label="Experience" value={`${jobDetail.experienceRequired || 0} years`} />
                </div>

                {/* Description */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">About This Role</h3>
                  <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                    {jobDetail.description}
                  </p>
                </section>

                {/* Required Skills */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {(jobDetail.requiredSkills || []).map((skill) => (
                      <span
                        key={`required-${skill}`}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Preferred Skills */}
                {jobDetail.preferredSkills?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Preferred Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {jobDetail.preferredSkills.map((skill) => (
                        <span
                          key={`preferred-${skill}`}
                          className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// Job Card Component
function JobCard({ job, onApply, onView, onSave, onUnsave, getMatchColor, getMatchLabel }) {
  const score = job.matchScore || 0;
  
  return (
    <div className="group bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300/50 transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {job.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {job.location || "Remote"}
          </p>
        </div>
        <button
          onClick={job.isSaved ? onUnsave : onSave}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <svg className={`w-5 h-5 ${job.isSaved ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* Match Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">Match Score</span>
          <span className="text-sm font-bold text-slate-900">{score}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getMatchColor(score).split(" ")[0]}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">{getMatchLabel(score)}</p>
      </div>

      {/* Job Meta */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
          {job.employmentType || "Full-time"}
        </span>
        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg">
          {job.remoteType || "Onsite"}
        </span>
        {job.priority && (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg flex items-center gap-1">
            <Zap className="w-3 h-3" /> {job.priority}
          </span>
        )}
      </div>

      {/* Skills Preview */}
      {job.matchedRequiredSkills?.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2">Matched Skills</p>
          <div className="flex gap-1 flex-wrap">
            {job.matchedRequiredSkills.slice(0, 3).map((skill) => (
              <span key={skill} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                {skill}
              </span>
            ))}
            {job.matchedRequiredSkills.length > 3 && (
              <span className="px-2 py-1 text-xs text-slate-600">+{job.matchedRequiredSkills.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Description Preview */}
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{job.description}</p>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onApply}
          className="flex-1 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm hover:shadow-md"
        >
          Apply Now
        </button>
        <button
          onClick={onView}
          className="flex-1 px-3 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all"
        >
          Details
        </button>
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
      className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-sm transition-all appearance-none cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// Modal Component
function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Detail Card
function DetailCard({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-2">{value}</p>
    </div>
  );
}
