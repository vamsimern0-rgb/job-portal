import { Link } from "react-router-dom";

const footerConfig = {
  student: {
    wrapper: "bg-white border-t border-slate-200",
    brand: "AI Careers - Student",
    text: "Build profile strength, track outcomes, and accelerate your placement journey.",
    links: [
      { to: "/student/jobs", label: "Jobs" },
      { to: "/student/applications", label: "Applications" },
      { to: "/student/profile", label: "Profile" }
    ],
    accent: "text-blue-700"
  },
  hr: {
    wrapper: "bg-white border-t border-emerald-200",
    brand: "AI Careers - HR",
    text: "Streamline role creation, candidate pipelines, and hiring decisions in one workspace.",
    links: [
      { to: "/hr/jobs", label: "Jobs" },
      { to: "/hr/candidates", label: "Candidates" },
      { to: "/hr/dashboard", label: "Dashboard" }
    ],
    accent: "text-emerald-700"
  },
  landing: {
    wrapper: "bg-white/90 border border-slate-200 rounded-2xl",
    brand: "AI Careers",
    text: "Connecting students and HR teams through verified opportunities and faster hiring workflows.",
    links: [
      { to: "/student", label: "Student Portal" },
      { to: "/hr", label: "HR Portal" },
      { to: "/student/register", label: "Get Started" }
    ],
    accent: "text-indigo-700"
  }
};

export default function PageFooter({ variant = "student", className = "" }) {
  const year = new Date().getFullYear();
  const config = footerConfig[variant] || footerConfig.student;

  return (
    <footer className={`${config.wrapper} ${className}`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className={`font-semibold ${config.accent}`}>{config.brand}</p>
            <p className="text-sm text-slate-600 mt-1">{config.text}</p>
          </div>

          <div className="flex items-center flex-wrap gap-4 text-sm">
            {config.links.map((link) => (
              <Link key={link.to} to={link.to} className="text-slate-700 hover:text-slate-900 font-medium">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Copyright {year} AI Careers. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
