import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/hr/Sidebar";
import Navbar from "../components/hr/Navbar";
import PageFooter from "../components/common/PageFooter";

export default function HrLayout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef(null);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    const handleScrollClose = () => {
      setMobileOpen(false);
    };

    handleResize();

    const currentMain = mainRef.current;
    window.addEventListener("resize", handleResize);
    currentMain?.addEventListener("scroll", handleScrollClose, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      currentMain?.removeEventListener("scroll", handleScrollClose);
    };
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-green-50 md:h-screen md:overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        toggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar setMobileOpen={setMobileOpen} scrollContainerRef={mainRef} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-4 sm:px-6 md:pt-6"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
            <PageFooter variant="hr" className="mt-8 rounded-2xl" />
          </div>
        </main>
      </div>
    </div>
  );
}
