import { useState } from "react";
import Sidebar from "../components/hr/Sidebar";
import Navbar from "../components/hr/Navbar";
import PageFooter from "../components/common/PageFooter";

export default function HrLayout({ children }) {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-green-50">
      <Sidebar
        collapsed={collapsed}
        toggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar setMobileOpen={setMobileOpen} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-20 pb-10">
          {children}
          <PageFooter variant="hr" className="mt-8 rounded-2xl" />
        </main>
      </div>
    </div>
  );
}