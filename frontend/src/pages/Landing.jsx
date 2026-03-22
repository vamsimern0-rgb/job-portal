

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import teamMeeting from "../assets/team-meeting.png";
import PageFooter from "../components/common/PageFooter";
 
/* ── SVG ASSETS (unchanged) ── */
const gradHat =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect x='50' y='130' width='200' height='20' fill='%23333'/%3E%3Cpolygon points='80,130 150,50 220,130' fill='%23444'/%3E%3Crect x='145' y='50' width='10' height='30' fill='%23FFD700'/%3E%3Ccircle cx='150' cy='90' r='12' fill='%23FFD700'/%3E%3C/svg%3E";
 
const hrBriefcase =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect x='50' y='100' width='200' height='120' rx='6' fill='%232c7be5' stroke='%23145ea8' stroke-width='3'/%3E%3Crect x='90' y='70' width='120' height='35' rx='3' fill='%231e4d8b' stroke='%23145ea8' stroke-width='2'/%3E%3Crect x='60' y='140' width='180' height='15' fill='%23fff' opacity='0.2'/%3E%3C/svg%3E";
 
/* ── ICONS ── */
const IconArrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconZap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconTrend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconBriefcase = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
 
/* ── ANIMATED COUNTER ── */
function MetricCounter({ end, suffix, label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
 
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const step = 16;
          const duration = 1600;
          const increment = end / (duration / step);
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(current));
          }, step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);
 
  return (
    <div ref={ref} className="text-center">
      <div className="font-syne text-4xl font-black text-white tracking-tight leading-none">
        {count}{suffix}
      </div>
      <div className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-medium">
        {label}
      </div>
    </div>
  );
}
 
/* ── FEATURE CARD ── */
function FeatureCard({ icon, iconBg, iconColor, title, body }) {
  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-2xl p-7 hover:border-slate-600 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-default">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <h3 className="text-white font-bold text-base mb-2 tracking-tight">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed font-light">{body}</p>
    </div>
  );
}
 
/* ── LANDING ── */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef(null);
 
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 50);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);
 
  return (
    <>
      <div className="font-dm min-h-screen bg-slate-950 text-slate-100">
 
        {/* BG GRID */}
        <div className="fixed inset-0 bg-grid-lines pointer-events-none z-0" aria-hidden="true" />
        {/* ORBS */}
        <div className="fixed -top-48 -right-24 w-[560px] h-[560px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none z-0" aria-hidden="true" />
        <div className="fixed -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-600/5 blur-[80px] pointer-events-none z-0" aria-hidden="true" />
 
        {/* ── NAVBAR ── */}
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 transition-all duration-300 ${scrolled ? "bg-slate-950/80 backdrop-blur-xl border-b border-slate-800" : "bg-transparent"}`}>
          <a href="#" className="font-syne font-black text-lg text-white tracking-tight flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 inline-block" />
            TalentBridge
          </a>
          <div className="flex items-center gap-3">
            <Link to="/student" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all duration-200">
              Student
            </Link>
            <Link to="/hr" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 hover:-translate-y-px">
              HR Login
            </Link>
          </div>
        </nav>
 
        {/* ── SCROLLABLE AREA ── */}
        <div ref={contentRef} className="relative z-10 h-screen overflow-y-auto scrollbar-hide pt-16 pb-20 md:pb-0">
 
          {/* ══ HERO ══ */}
          <section className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-24 md:pt-28 md:pb-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
 
              {/* TEXT */}
              <div>
                <div className="animate-fade-up inline-flex items-center gap-2.5 bg-blue-950/60 border border-blue-800/60 text-blue-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-dot inline-block" />
                  Enterprise Hiring Platform
                </div>
 
                <h1 className="animate-fade-up-1 font-syne font-black text-5xl md:text-6xl xl:text-7xl leading-none tracking-tighter text-white mb-6">
                  Build Your<br />
                  Career.{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    Hire Smarter.
                  </span>
                </h1>
 
                <p className="animate-fade-up-2 text-slate-400 text-lg leading-relaxed font-light max-w-xl mb-10">
                  One enterprise platform connecting ambitious students with high-growth companies — verified opportunities, intelligent matching, and real-time pipeline visibility.
                </p>
 
                <div className="animate-fade-up-3 flex flex-wrap gap-3 mb-10">
                  <Link to="/student" className="inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30">
                    Get Started Free <IconArrow />
                  </Link>
                  <Link to="/hr" className="inline-flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-slate-600 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5">
                    For HR Teams
                  </Link>
                </div>
 
                <div className="animate-fade-up-4 flex flex-wrap items-center gap-5">
                  {["SOC 2 Compliant", "GDPR Ready", "99.9% Uptime"].map((t) => (
                    <div key={t} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="text-emerald-400"><IconCheck /></span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
 
              {/* IMAGE */}
              <div className="animate-fade-up-2 relative">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                  <img src={teamMeeting} alt="Teams collaborating" className="w-full object-cover aspect-video" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-transparent" />
                </div>
                {/* Badge bottom-left */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot inline-block" />
                  <span className="text-xs font-medium text-white">847 roles matched today</span>
                </div>
                {/* Stat top-right */}
                <div className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur-md border border-blue-800/50 rounded-xl px-4 py-3">
                  <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest mb-0.5">Avg. Time to Hire</div>
                  <div className="font-syne font-black text-xl text-white tracking-tight">8.4 days</div>
                </div>
              </div>
            </div>
          </section>
 
          {/* ══ METRICS ══ */}
          <div className="border-y border-slate-800 bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-slate-800">
                {[
                  { end: 10,   suffix: "x",  label: "Faster Shortlisting" },
                  { end: 98,   suffix: "%",  label: "Verified Roles" },
                  { end: 50,   suffix: "k+", label: "Active Candidates" },
                  { end: 1200, suffix: "+",  label: "Partner Companies" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <MetricCounter {...m} />
                  </div>
                ))}
              </div>
            </div>
          </div>
 
          {/* ══ FEATURES ══ */}
          <section className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
            <div className="mb-14">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Platform Capabilities</p>
              <h2 className="font-syne font-black text-4xl md:text-5xl text-white tracking-tight leading-tight mb-4">
                Everything your team needs
              </h2>
              <p className="text-slate-400 text-base leading-relaxed font-light max-w-lg">
                Purpose-built tools that eliminate hiring friction and accelerate career growth for every stakeholder.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <FeatureCard icon={<IconShield />}    iconBg="bg-blue-950/70"    iconColor="text-blue-400"    title="Verified Opportunities" body="Every role is vetted through multi-step company verification — zero fake listings, guaranteed." />
              <FeatureCard icon={<IconTrend />}     iconBg="bg-emerald-950/70" iconColor="text-emerald-400" title="Intelligent Matching"     body="Skill-based algorithms surface the right candidates to the right roles, reducing time-to-offer." />
              <FeatureCard icon={<IconUsers />}     iconBg="bg-amber-950/70"   iconColor="text-amber-400"   title="Pipeline Visibility"     body="Real-time kanban boards give HR complete stage-wise visibility across every candidate." />
              <FeatureCard icon={<IconBriefcase />} iconBg="bg-blue-950/70"    iconColor="text-blue-400"    title="ATS Integration"         body="Seamlessly sync with your existing ATS. No rip-and-replace — just better data flowing through." />
              <FeatureCard icon={<IconZap />}       iconBg="bg-emerald-950/70" iconColor="text-emerald-400" title="Interview Scheduling"     body="Automated calendar coordination with timezone support removes back-and-forth entirely." />
              <FeatureCard icon={<IconTrend />}     iconBg="bg-amber-950/70"   iconColor="text-amber-400"   title="Analytics Dashboard"     body="Conversion metrics, funnel analytics and profile performance — in one unified view." />
            </div>
          </section>
 
          {/* ══ ROLE CARDS ══ */}
          <div className="border-y border-slate-800 bg-slate-900/40">
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
              <div className="mb-14">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Who It's For</p>
                <h2 className="font-syne font-black text-4xl md:text-5xl text-white tracking-tight leading-tight">
                  Built for both sides of hiring
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
 
                {/* STUDENT */}
                <Link to="/student" className="group relative block rounded-2xl border border-slate-800 bg-gradient-to-br from-blue-950/40 to-slate-950 p-8 md:p-10 overflow-hidden hover:border-blue-700/60 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(59,130,246,0.15)] transition-all duration-300">
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
                  <div className="inline-flex items-center gap-2 bg-blue-950/80 border border-blue-800/60 text-blue-400 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-7">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                    For Students
                  </div>
                  <h3 className="font-syne font-black text-3xl text-white tracking-tight mb-3">Launch Your Career</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light mb-8">
                    Apply to verified roles, track every stage, and get matched with companies that fit your skills and ambitions.
                  </p>
                  <ul className="space-y-3 mb-9">
                    {["Personalized job feed with smart filters","End-to-end application status tracking","Interview reminders and schedule visibility","Profile analytics to improve performance"].map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-400 font-light">
                        <span className="text-blue-400 mt-px flex-shrink-0"><IconCheck /></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-2 bg-blue-600 group-hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200">
                    Browse Roles <IconArrow />
                  </div>
                </Link>
 
                {/* HR */}
                <Link to="/hr" className="group relative block rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-950/40 to-slate-950 p-8 md:p-10 overflow-hidden hover:border-emerald-700/60 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(34,197,94,0.12)] transition-all duration-300">
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                  <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-7">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    For HR Teams
                  </div>
                  <h3 className="font-syne font-black text-3xl text-white tracking-tight mb-3">Hire with Precision</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light mb-8">
                    Publish roles, manage pipeline stages, and close top candidates faster with smart filtering and team collaboration.
                  </p>
                  <ul className="space-y-3 mb-9">
                    {["Publish and manage open roles from one dashboard","Kanban pipeline board for stage-wise movement","ATS screening results for intelligent filtering","Calendar coordination with your entire team"].map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-400 font-light">
                        <span className="text-emerald-400 mt-px flex-shrink-0"><IconCheck /></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-2 bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200">
                    Start Hiring <IconArrow />
                  </div>
                </Link>
              </div>
            </div>
          </div>
 
          {/* ══ HOW IT WORKS ══ */}
          <section className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
            <div className="mb-14">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Getting Started</p>
              <h2 className="font-syne font-black text-4xl md:text-5xl text-white tracking-tight leading-tight">
                Up and running in minutes
              </h2>
            </div>
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
              {[
                { n: "01", accent: "text-blue-400",    bg: "bg-blue-950/50",    title: "Create Your Profile", body: "Set role preferences, upload credentials, and let our system build your verified talent identity." },
                { n: "02", accent: "text-emerald-400", bg: "bg-emerald-950/50", title: "Get Matched",          body: "Skill-based algorithms surface verified opportunities aligned to your skills and growth trajectory." },
                { n: "03", accent: "text-amber-400",   bg: "bg-amber-950/50",   title: "Apply & Track",       body: "Apply in seconds, monitor every stage, and collaborate with HR teams inside a unified workspace." },
              ].map((s) => (
                <div key={s.n} className="bg-slate-900/40 hover:bg-slate-900/70 transition-colors duration-200 p-8 md:p-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${s.bg}`}>
                    <span className={`font-syne font-black text-lg ${s.accent}`}>{s.n}</span>
                  </div>
                  <h3 className="font-syne font-bold text-white text-lg mb-3 tracking-tight">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light">{s.body}</p>
                </div>
              ))}
            </div>
          </section>
 
          {/* ══ CTA BANNER ══ */}
          <div className="max-w-7xl mx-auto px-6 md:px-10 pb-24 md:pb-32">
            <div className="relative bg-gradient-to-br from-blue-950/50 via-slate-900 to-emerald-950/40 border border-slate-700 rounded-2xl px-8 md:px-16 py-14 md:py-20 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 left-1/3 w-60 h-60 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
                <div>
                  <h2 className="font-syne font-black text-3xl md:text-4xl xl:text-5xl text-white tracking-tight leading-tight mb-3">
                    Ready to transform<br className="hidden md:block" /> your hiring?
                  </h2>
                  <p className="text-slate-400 text-base font-light max-w-md">
                    Join 1,200+ companies and 50,000+ students already using TalentBridge.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <Link to="/student" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30">
                    Start as Student
                  </Link>
                  <Link to="/hr" className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5">
                    HR Access
                  </Link>
                </div>
              </div>
            </div>
          </div>
 
          {/* ══ TRUST BAR ══ */}
          <div className="border-t border-slate-800 py-5 px-6 md:px-10 flex flex-wrap items-center justify-center gap-8">
            {["SOC 2 Type II Certified","GDPR Compliant","256-bit Encryption","99.9% SLA Uptime"].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="text-emerald-500"><IconCheck /></span>
                {t}
              </div>
            ))}
          </div>
 
          {/* ══ FOOTER ══ */}
          <div className="border-t border-slate-800 px-6 md:px-10">
            <PageFooter variant="landing" />
          </div>
        </div>
 
        {/* ── MOBILE BOTTOM NAV ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-800 bg-slate-950/90 backdrop-blur-xl">
          <Link to="/student" className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 border-r border-slate-800 text-blue-400 text-xs font-semibold tracking-wide">
            <img src={gradHat} className="w-7 h-7" alt="" />
            Student
          </Link>
          <Link to="/hr" className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 text-emerald-400 text-xs font-semibold tracking-wide">
            <img src={hrBriefcase} className="w-7 h-7" alt="" />
            HR Login
          </Link>
        </div>
      </div>
    </>
  );
}
