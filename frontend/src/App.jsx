import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ================= PUBLIC ================= */
const Landing = lazy(() => import("./pages/Landing"));

/* ================= HR ================= */
const HrLogin = lazy(() => import("./pages/hr/HrLogin"));
const HrRegister = lazy(() => import("./pages/hr/HrRegister"));
const ForgotPassword = lazy(() => import("./pages/hr/ForgotPassword"));
const HrDashboard = lazy(() => import("./pages/hr/HrDashboard"));
const CreateJob = lazy(() => import("./pages/hr/CreateJob"));
const JobList = lazy(() => import("./pages/hr/JobList"));
const Candidates = lazy(() => import("./pages/hr/Candidates"));
const ATSResults = lazy(() => import("./pages/hr/ATSResults"));
const HrProfile = lazy(() => import("./pages/hr/HrProfile"));
const PipelineBoard = lazy(() => import("./pages/hr/PipelineBoard"));
const ActivityTimeline = lazy(() => import("./pages/hr/ActivityTimeline"));
const InterviewCalendar = lazy(() => import("./pages/hr/InterviewCalendar"));
const TeamManagement = lazy(() => import("./pages/hr/TeamManagement"));
const HrLayout = lazy(() => import("./layouts/HrLayout"));

/* ================= STUDENT ================= */
const StudentLogin = lazy(() => import("./pages/student/StudentLogin"));
const StudentRegister = lazy(() => import("./pages/student/StudentRegister"));
const StudentForgotPassword = lazy(() => import("./pages/student/StudentForgotPassword"));
const StudentHome = lazy(() => import("./pages/student/StudentHome"));
const StudentJobs = lazy(() => import("./pages/student/StudentJobs"));
const StudentSavedJobs = lazy(() => import("./pages/student/StudentSavedJobs"));
const StudentApplications = lazy(() => import("./pages/student/StudentApplications"));
const StudentInterviews = lazy(() => import("./pages/student/StudentInterviews"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentAnalytics = lazy(() => import("./pages/student/StudentAnalytics"));
const StudentLayout = lazy(() => import("./layouts/StudentLayout"));

/* ================= PROTECTION ================= */
import ProtectedRoute from "./routes/ProtectedRoute";
import StudentProtectedRoute from "./routes/StudentProtectedRoute";

const hasActiveToken = (token) => {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

function HrEntryRedirect() {
  const hrToken = localStorage.getItem("hrToken");
  return (
    <Navigate
      to={hasActiveToken(hrToken) ? "/hr/dashboard" : "/hr/login"}
      replace
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteShellLoader />}>
        <Routes>

          {/* ================= LANDING ================= */}
          <Route path="/" element={<Landing />} />
          <Route path="/hr" element={<HrEntryRedirect />} />

          {/* ================= HR AUTH ================= */}
          <Route path="/hr/login" element={<HrLogin />} />
          <Route path="/hr/register" element={<HrRegister />} />
          <Route path="/hr/forgot-password" element={<ForgotPassword />} />

          {/* ================= HR PROTECTED ================= */}
          <Route path="/hr/dashboard" element={<ProtectedRoute><HrLayout><HrDashboard /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/create-job" element={<ProtectedRoute><HrLayout><CreateJob /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/jobs" element={<ProtectedRoute><HrLayout><JobList /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/candidates" element={<ProtectedRoute><HrLayout><Candidates /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/ats" element={<ProtectedRoute><HrLayout><ATSResults /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/ats/:jobId" element={<ProtectedRoute><HrLayout><ATSResults /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/pipeline" element={<ProtectedRoute><HrLayout><PipelineBoard /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/timeline" element={<ProtectedRoute><HrLayout><ActivityTimeline /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/activity" element={<ProtectedRoute><HrLayout><ActivityTimeline /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/calendar" element={<ProtectedRoute><HrLayout><InterviewCalendar /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/interviews" element={<ProtectedRoute><HrLayout><InterviewCalendar /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/team" element={<ProtectedRoute><HrLayout><TeamManagement /></HrLayout></ProtectedRoute>} />
          <Route path="/hr/profile" element={<ProtectedRoute><HrLayout><HrProfile /></HrLayout></ProtectedRoute>} />

          {/* ================= STUDENT PUBLIC ================= */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/student/forgot-password" element={<StudentForgotPassword />} />

          {/* PUBLIC STUDENT HOME */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentHome />} />
          </Route>

          {/* ================= STUDENT PROTECTED ================= */}
          <Route
            path="/student"
            element={
              <StudentProtectedRoute>
                <StudentLayout />
              </StudentProtectedRoute>
            }
          >
            <Route path="jobs" element={<StudentJobs />} />
            <Route path="saved-jobs" element={<StudentSavedJobs />} />
            <Route path="applications" element={<StudentApplications />} />
            <Route path="interviews" element={<StudentInterviews />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="analytics" element={<StudentAnalytics />} />
          </Route>

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RouteShellLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
      <div className="text-sm font-medium">Loading page...</div>
    </div>
  );
}

export default App;
