import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Briefcase, MapPin, Heart } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentSavedJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSavedJobs = async () => {
    try {
      const { data } = await api.get("/student/saved-jobs");
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Saved jobs fetch error:", err);
      setError("Failed to load saved jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const unsaveJob = async (jobId) => {
    try {
      await api.delete(`/student/saved-jobs/${jobId}`);
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove saved job.");
    }
  };

  const applyToJob = async (jobId) => {
    try {
      await api.post("/student/apply", { jobId });
      toast.success("Application submitted successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Application failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-900/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-600 text-sm">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4 py-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-3">!</div>
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Heart size={24} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Saved Jobs Yet</h3>
          <p className="text-slate-600 text-sm mt-2">Start saving jobs to keep track of positions you're interested in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Saved Jobs</h1>
          </div>
          <p className="text-slate-600 text-sm ml-13">Track {jobs.length} position{jobs.length !== 1 ? 's' : ''} you want to apply to later.</p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white border border-slate-200/50 rounded-2xl p-6 hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 flex flex-col"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">
                  {job.title}
                </h3>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Briefcase size={14} className="text-blue-600 flex-shrink-0" />
                    <span>{job.employmentType || "Full Time"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-blue-600 flex-shrink-0" />
                    <span>{job.location || "Remote"}</span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-700 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="mt-6 flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => applyToJob(job._id)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
                >
                  Apply
                </button>
                <button
                  onClick={() => unsaveJob(job._id)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
