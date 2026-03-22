import { createElement, useCallback, useEffect, useState } from "react";
import { TrendingUp, Briefcase, BarChart3, ArrowUpRight, Target, Zap, Calendar } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentAnalytics() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState({
    averageMatchScore: 0,
    totalApplications: 0,
    statusBreakdown: {},
    conversion: {
      shortlistRate: 0,
      interviewRate: 0,
      offerRate: 0
    },
    monthlyApplications: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/student/analytics");

      setAnalytics({
        averageMatchScore: Number(data?.averageMatchScore) || 0,
        totalApplications: Number(data?.totalApplications) || 0,
        statusBreakdown: data?.statusBreakdown || {},
        conversion: {
          shortlistRate: Number(data?.conversion?.shortlistRate) || 0,
          interviewRate: Number(data?.conversion?.interviewRate) || 0,
          offerRate: Number(data?.conversion?.offerRate) || 0
        },
        monthlyApplications: Array.isArray(data?.monthlyApplications) ? data.monthlyApplications : []
      });

      setError(null);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Failed to load analytics data");
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center px-4">
        <div className="text-center py-16 px-4 bg-red-50 border border-red-200 rounded-xl max-w-md">
          <h3 className="text-lg font-bold text-red-700 mb-2">Error Loading Analytics</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const performanceLevel = 
    analytics.averageMatchScore >= 80
      ? { label: "Excellent", color: "from-emerald-600 to-teal-700", text: "Exceptional match quality" }
      : analytics.averageMatchScore >= 60
      ? { label: "Good", color: "from-blue-600 to-indigo-700", text: "Strong match performance" }
      : { label: "Developing", color: "from-amber-600 to-orange-700", text: "Improve match quality" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Application Analytics
          </h1>
          <p className="text-slate-600">
            Track your performance and AI match insights across all applications
          </p>
        </div>

        {/* Main Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            icon={BarChart3}
            title="Average Match Score"
            value={`${analytics.averageMatchScore}%`}
            subtitle="Across all applications"
            color="from-indigo-500 to-blue-600"
            trend="↑"
          />
          <StatCard
            icon={Briefcase}
            title="Total Applications"
            value={analytics.totalApplications}
            subtitle="Applied so far"
            color="from-blue-500 to-cyan-600"
            trend="→"
          />
          <StatCard
            icon={TrendingUp}
            title="Performance Level"
            value={performanceLevel.label}
            subtitle={performanceLevel.text}
            color={performanceLevel.color}
            trend="⭐"
          />
        </div>

        {/* Match Score Progress */}
        <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl p-6 md:p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Target className="w-6 h-6 text-blue-600" />
                Match Score Progress
              </h2>
              <p className="text-sm text-slate-600 mt-1">Your AI match strength across all applications</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{analytics.averageMatchScore}%</p>
              <p className="text-xs text-slate-500">Overall Average</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full h-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full overflow-hidden border border-slate-300/50">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
                style={{ width: `${analytics.averageMatchScore}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Quality Indicator */}
          <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-blue-200/50">
            <p className="text-sm font-semibold text-slate-900">
              {analytics.averageMatchScore >= 80
                ? "🎯 Excellent! Your profile matches highly with job requirements. Keep applying!"
                : analytics.averageMatchScore >= 60
                ? "📈 Good! Continue optimizing your skills and experience for better matches."
                : "💡 Focus on enhancing your skills and profile to improve match quality."}
            </p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-6">
            <ArrowUpRight className="w-6 h-6 text-emerald-600" />
            Conversion Funnel
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 md:gap-6">
            <RateCard 
              icon={Zap}
              label="Shortlisted" 
              value={analytics.conversion.shortlistRate} 
              color="from-amber-500 to-orange-600"
            />
            <RateCard 
              icon={Calendar}
              label="Interview" 
              value={analytics.conversion.interviewRate} 
              color="from-blue-500 to-indigo-600"
            />
            <RateCard 
              icon={Target}
              label="Offer" 
              value={analytics.conversion.offerRate} 
              color="from-emerald-500 to-teal-600"
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200/50 rounded-xl">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">💡 Pro Tip:</span> A shortlist rate above 30% indicates strong profile alignment. 
              Work on interview preparation if you're shortlisted but not getting offers.
            </p>
          </div>
        </div>

        {/* Pipeline Breakdown */}
        <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Application Pipeline</h2>

          {Object.keys(analytics.statusBreakdown).length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No application data yet</p>
              <p className="text-sm text-slate-400 mt-1">Start applying to jobs to see breakdown here</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              {Object.entries(analytics.statusBreakdown).map(([status, count]) => {
                const statusColors = {
                  Applied: "from-slate-400 to-slate-500",
                  Shortlisted: "from-amber-500 to-orange-600",
                  Interview: "from-blue-500 to-indigo-600",
                  Hired: "from-emerald-500 to-teal-600",
                  Rejected: "from-red-500 to-pink-600"
                };

                return (
                  <div
                    key={status}
                    className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200/50 rounded-xl p-4 text-center hover:shadow-md transition-all"
                  >
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">{status}</p>
                    <p className={`text-3xl font-bold bg-gradient-to-r ${statusColors[status] || "from-slate-400 to-slate-500"} bg-clip-text text-transparent`}>
                      {count}
                    </p>
                    <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-1 bg-gradient-to-r ${statusColors[status] || "from-slate-400 to-slate-500"}`}
                        style={{ width: `${Math.min((count / Math.max(...Object.values(analytics.statusBreakdown), 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600" />
            Monthly Activity (Last 6 Months)
          </h2>

          {analytics.monthlyApplications.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No monthly trend data available</p>
              <p className="text-sm text-slate-400 mt-1">Applications will appear here as you apply</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.monthlyApplications.map((item) => (
                <div key={item.month} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{item.month}</span>
                    <span className="text-sm font-bold text-indigo-600">{item.count || 0} apps</span>
                  </div>
                  <div className="h-3 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 overflow-hidden border border-slate-300/50">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all"
                      style={{ width: `${Math.min((Number(item.count) || 0) / 10 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-indigo-200/50 rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            💡 AI Insights
          </h3>
          <div className="space-y-3 text-sm text-slate-700">
            <p>✓ Focus on roles with match scores above 70% for better success rates</p>
            <p>✓ Update your skills regularly to improve overall match quality</p>
            <p>✓ Tailor your resume for each application to increase shortlist rate</p>
            <p>✓ Practice interview preparation if shortlist-to-offer ratio is low</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color, trend }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} rounded-2xl p-6 text-white group hover:shadow-lg transition-all border border-opacity-20 border-white`}>
      <div className="absolute top-0 right-0 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">
        {trend}
      </div>
      
      <div className="relative space-y-3">
        {createElement(icon, { className: "w-6 h-6 text-white/80" })}
        <div>
          <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          <p className="text-xs text-white/70 mt-2">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function RateCard({ icon, label, value, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white group hover:shadow-lg transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold uppercase tracking-wider text-white/90">{label}</p>
        {createElement(icon, { className: "w-5 h-5 text-white/80" })}
      </div>
      <p className="text-4xl font-bold text-white">{value}%</p>
      <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-2 bg-white rounded-full"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
