import { createElement, useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import socket from "../../socket";
import {
  Briefcase,
  Users,
  Calendar,
  UserCheck,
  Brain,
  TrendingUp,
  Clock,
  Send,
  AlertCircle,
  CheckCircle
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";

export default function HrDashboard() {
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamWithFallback = useCallback(async () => {
    const endpoints = ["/hr/team", "/team"];

    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        if (Array.isArray(response.data)) {
          return response.data;
        }
      } catch {
        // Try next endpoint fallback.
      }
    }

    return [];
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, analyticsRes, jobsRes] = await Promise.all([
        api.get("/hr/profile"),
        api.get("/hr/analytics"),
        api.get("/jobs")
      ]);

      const profilePayload =
        profileRes?.data && typeof profileRes.data === "object" && profileRes.data.hr
          ? profileRes.data.hr
          : profileRes?.data || {};
      const analyticsPayload =
        analyticsRes?.data && typeof analyticsRes.data === "object" && analyticsRes.data.analytics
          ? analyticsRes.data.analytics
          : analyticsRes?.data || {};

      setUserRole(profilePayload?.role || "");
      setStats(analyticsPayload);

      const jobsList = Array.isArray(jobsRes.data)
        ? jobsRes.data
        : Array.isArray(jobsRes.data?.items)
        ? jobsRes.data.items
        : [];
      setRecentJobs(jobsList.slice(0, 5));

      const teamMembers = await fetchTeamWithFallback();
      setTeam(teamMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchTeamWithFallback]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      fetchData();
    }, 0);

    socket.on("dashboardUpdate", fetchData);

    return () => {
      clearTimeout(loadTimer);
      socket.off("dashboardUpdate", fetchData);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-400">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const totalHrValue = Number(stats.totalHr ?? stats.totalTeamMembers);
  const totalTeamMembers =
    Number.isFinite(totalHrValue) && totalHrValue >= 0 ? totalHrValue : team.length;
  const totalRecruiters =
    Number(stats.totalRecruiters) ||
    team.filter((member) => member.role === "Recruiter").length;
  const totalHrManagers =
    Number(stats.totalHrManagers) ||
    team.filter((member) => member.role === "HR Manager").length;
  const showTeamStats =
    userRole === "Founder" ||
    userRole === "HR Manager" ||
    totalTeamMembers > 0;

  const conversionRate =
    stats.totalCandidates > 0
      ? (((stats.hires || stats.hired || 0) / stats.totalCandidates) * 100).toFixed(1)
      : 0;

  const chartData = [
    { name: "Jobs", value: stats.totalJobs },
    { name: "Candidates", value: stats.totalCandidates },
    { name: "Interviews", value: stats.interviews },
    { name: "Hires", value: stats.hires || stats.hired || 0 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-8 md:space-y-10">
          
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl shadow-2xl p-6 md:p-10 border border-green-500/30 overflow-hidden relative">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            </div>
            
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-xs font-semibold text-white mb-4">
                  <TrendingUp className="w-4 h-4" />
                  Live Performance Dashboard
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  Recruitment Intelligence
                </h1>
                <p className="text-green-100 mt-4 text-lg max-w-lg">
                  Real-time insights into your hiring pipeline, candidate flow, and team efficiency
                </p>
                <div className="inline-flex items-center gap-2 mt-6 bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-white font-semibold">
                  <UserCheck className="w-5 h-5" />
                  {userRole}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <HeroStat label="Active Jobs" value={stats.activeJobs} />
                <HeroStat label="Conversion Rate" value={`${conversionRate}%`} />
                <HeroStat label="Total Pipeline" value={stats.totalCandidates} />
                <HeroStat label="Hires (YTD)" value={stats.hires || stats.hired || 0} />
              </div>
            </div>
          </section>

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <EnhancedKpiCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs} color="blue" />
            <EnhancedKpiCard icon={Users} label="Candidates" value={stats.totalCandidates} color="purple" />
            <EnhancedKpiCard icon={Calendar} label="Interviews" value={stats.interviews} color="indigo" />
            <EnhancedKpiCard icon={UserCheck} label="Hires" value={stats.hires || stats.hired || 0} color="emerald" />
          </section>

          {/* Talent Outreach */}
          <section className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Send className="w-6 h-6 text-green-500" />
                Talent Outreach
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <OutreachStat
                label="Matched Students"
                value={stats.outreach?.matchedStudents || 0}
                icon={Users}
              />
              <OutreachStat
                label="Email Alerts Sent"
                value={stats.outreach?.emailSent || 0}
                icon={Send}
              />
              <OutreachStat
                label="In-App Alerts Sent"
                value={stats.outreach?.inAppSent || 0}
                icon={AlertCircle}
              />
            </div>
          </section>

          {/* Reminders Monitor */}
          <section className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500" />
                Reminders Monitor
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <ReminderStat
                label="Pending Reminders"
                value={stats.reminders?.pendingCount || 0}
                color="amber"
              />
              <ReminderStat
                label="Sent Last 24h"
                value={stats.reminders?.sentLast24h || 0}
                color="blue"
              />
              <ReminderStat
                label="Total Sent"
                value={stats.reminders?.totalSent || 0}
                color="emerald"
              />
            </div>

            {stats.reminders?.nextDue?.length > 0 ? (
              <div className="space-y-3">
                {stats.reminders.nextDue.map((item) => (
                  <div
                    key={`${item.candidateId}-${item.type}-${item.dueAt}`}
                    className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4 hover:border-green-500/50 hover:shadow-lg transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-white group-hover:text-green-400 transition-colors">
                          {item.candidateName} - {item.jobTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg">
                            {item.type}
                          </span>
                          <span className="text-xs text-slate-400">
                            Due: {new Date(item.dueAt).toLocaleDateString()} at {new Date(item.dueAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-slate-700/20 border border-dashed border-slate-600 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-slate-400 font-medium">No upcoming reminders</p>
                <p className="text-slate-500 text-sm mt-1">All reminders are up to date</p>
              </div>
            )}
          </section>

          {/* Performance Analytics */}
          <section className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8">
            <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Performance Analytics
            </h3>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Bar Chart */}
              <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                <p className="text-sm font-semibold text-slate-300 mb-4">Hiring Pipeline</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Line Chart */}
              <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                <p className="text-sm font-semibold text-slate-300 mb-4">Trend Analysis</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* AI Insight */}
          <section className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  AI Hiring Insight
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {conversionRate > 20
                    ? "✨ Strong hiring efficiency detected. Maintain your screening quality and continue optimizing your interview pipeline for best results."
                    : "📊 Conversion rate below optimal. Consider refining your ATS scoring criteria or implementing more rigorous interview screening to improve candidate-to-hire ratio."}
                </p>
                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                  <MetricBadge label="Conversion" value={`${conversionRate}%`} color="blue" />
                  <MetricBadge label="Pipeline Health" value={stats.totalCandidates > 50 ? 'Excellent' : 'Good'} color="emerald" />
                  <MetricBadge label="Hiring Velocity" value={Math.round(((stats.hires || stats.hired || 0) / 12) * 100) / 100 + ' hires/mo'} color="purple" />
                </div>
              </div>
            </div>
          </section>

          {/* Recent Jobs */}
          <section className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-green-500" />
              Recent Job Postings
            </h3>

            {recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.map((job, idx) => (
                  <div
                    key={job._id}
                    className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-5 hover:shadow-lg hover:border-green-500/30 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-green-400">{idx + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                              {job.title}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                              📍 {job.location} • 👥 {job.applicantsCount || 0} applicants
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                            job.status === "Open"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-600/50 text-slate-400 border border-slate-500/30"
                          }`}
                        >
                          {job.status === "Open" ? "🟢 Open" : "⚫ Closed"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-slate-700/20 border border-dashed border-slate-600 rounded-xl">
                <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 font-medium">No recent job postings</p>
              </div>
            )}
          </section>

          {/* Founder Admin Control */}
          {showTeamStats && (
            <section className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-500" />
                Team Insights
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AdminStat label="Total HR" value={totalTeamMembers} color="blue" />
                <AdminStat
                  label="Recruiters"
                  value={totalRecruiters}
                  color="purple"
                />
                <AdminStat
                  label="HR Managers"
                  value={totalHrManagers}
                  color="emerald"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Hero Section Stat
function HeroStat({ label, value }) {
  return (
    <div className="bg-white/15 backdrop-blur border border-white/20 rounded-xl p-4 text-white hover:bg-white/20 transition-all">
      <p className="text-xs font-medium text-green-100">{label}</p>
      <p className="text-2xl md:text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

// Enhanced KPI Card
function EnhancedKpiCard({ icon, label, value, color }) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    indigo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6 backdrop-blur-xl hover:shadow-lg hover:scale-105 transition-all group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-300">{label}</p>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-3">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-current/30 flex items-center justify-center group-hover:scale-110 transition-transform ${colors[color].split(" ")[2]}`}>
          {createElement(icon, { className: "w-6 h-6" })}
        </div>
      </div>
    </div>
  );
}

// Outreach Stat
function OutreachStat({ label, value, icon }) {
  return (
    <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 hover:shadow-lg hover:border-green-500/30 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
          {createElement(icon, { className: "w-6 h-6 text-green-400" })}
        </div>
        <div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Reminder Stat
function ReminderStat({ label, value, color }) {
  const colors = {
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className={`${colors[color]} border rounded-xl p-6 text-center backdrop-blur-sm hover:shadow-lg transition-all`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-3">{value}</p>
    </div>
  );
}

// Metric Badge
function MetricBadge({ label, value, color }) {
  const colors = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <div className={`${colors[color]} border rounded-lg px-3 py-2 text-sm font-semibold text-center`}>
      <p className="opacity-75">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

// Admin Stat
function AdminStat({ label, value, color }) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30",
    purple: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6 text-center backdrop-blur-xl hover:shadow-lg transition-all`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-3">{value}</p>
    </div>
  );
}
