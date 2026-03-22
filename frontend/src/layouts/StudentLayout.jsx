import { Outlet } from "react-router-dom";
import StudentNavbar from "../pages/student/StudentNavbar";
import PageFooter from "../components/common/PageFooter";

export default function StudentLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <StudentNavbar />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-screen-xl mx-auto">
          <Outlet />
        </div>
      </main>

      <PageFooter variant="student" />

    </div>
  );
}
