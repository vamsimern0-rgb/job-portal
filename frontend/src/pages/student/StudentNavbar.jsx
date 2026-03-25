import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Menu, X, Zap } from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentNavbar() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [studentId, setStudentId] = useState("");
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  const token = localStorage.getItem("studentToken");

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const { data } = await api.get("/student/notifications");
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setNotifications(items);
    } catch (err) {
      console.error("Student notifications fetch failed:", err);
    }
  }, [token]);

  const fetchStudentProfile = useCallback(async () => {
    if (!token) return;

    try {
      const { data } = await api.get("/student/profile");
      setStudentId(data?._id || "");
    } catch (err) {
      console.error("Student profile fetch failed:", err);
    }
  }, [token]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      fetchNotifications();
      fetchStudentProfile();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [fetchNotifications, fetchStudentProfile]);

  useEffect(() => {
    if (!studentId) return;

    socket.emit("joinUser", studentId);

    const handleStudentNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("studentNotification", handleStudentNotification);

    return () => {
      socket.off("studentNotification", handleStudentNotification);
    };
  }, [studentId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideDesktop = desktopDropdownRef.current?.contains(event.target);
      const clickedInsideMobile = mobileDropdownRef.current?.contains(event.target);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setOpenNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    const handleScroll = () => {
      setMobileOpen(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/student/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, read: true } : item))
      );
    } catch (err) {
      console.error("Mark notification read failed:", err);
      toast.error("Failed to update notification.");
    }
  };

  const deriveNotificationRoute = (notification = {}) => {
    const text = String(notification?.text || "").toLowerCase();
    const metadata = notification?.metadata || {};

    if (metadata?.interviewDate || text.includes("interview")) {
      return "/student/interviews";
    }

    if (metadata?.candidateId || text.includes("application")) {
      return "/student/applications";
    }

    if (metadata?.jobId || text.includes("job")) {
      return "/student/jobs";
    }

    return "/student";
  };

  const deriveNotificationStatus = (notification = {}) => {
    const metadata = notification?.metadata || {};
    if (metadata?.status) return metadata.status;

    const text = String(notification?.text || "").toLowerCase();
    if (text.includes("cancel")) return "Cancelled";
    if (text.includes("rescheduled")) return "Rescheduled";
    if (text.includes("scheduled")) return "Scheduled";
    if (text.includes("rejected")) return "Rejected";
    if (text.includes("hired")) return "Hired";
    if (text.includes("shortlisted")) return "Shortlisted";
    return "Update";
  };

  const openNotificationPopup = async (notification) => {
    await markAsRead(notification._id);
    setSelectedNotification(notification);
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/student/notifications/read-all");
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error("Mark all notifications read failed:", err);
      toast.error("Failed to mark all notifications as read.");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/student/logout");
    } catch (err) {
      console.error("Student logout endpoint failed:", err);
    } finally {
      localStorage.removeItem("studentToken");
      toast.info("Logged out successfully.");
      navigate("/student");
      window.location.reload();
    }
  };

  const desktopLinkClass = ({ isActive }) =>
    `rounded-full px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-blue-100 text-blue-700 shadow-sm"
        : "text-slate-700 hover:bg-slate-100 hover:text-blue-600"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `block rounded-xl px-3 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-100 text-blue-700"
        : "text-slate-700 hover:bg-slate-50 hover:text-blue-600"
    }`;

  const unreadCount = notifications.filter((item) => !item.read).length;

  const notificationPanel = (
    <>
      {notifications.length > 0 && (
        <div className="flex items-center justify-end border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50 px-4 py-3">
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
          >
            Mark all as read
          </button>
        </div>
      )}
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          No notifications
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <button
              key={notification._id}
              onClick={() => openNotificationPopup(notification)}
              className={`w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition ${
                notification.read
                  ? "bg-white text-slate-700 hover:bg-slate-50"
                  : "border-blue-200/30 bg-blue-50/50 text-blue-900 hover:bg-blue-100/50"
              }`}
            >
              {notification.text}
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 shadow-sm">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div
          onClick={() => navigate("/student")}
          className="flex cursor-pointer items-center gap-2 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Zap size={18} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold text-transparent transition group-hover:scale-105">
            AI Careers
          </span>
        </div>

        <nav className="hidden items-center gap-3 md:flex">
          <NavLink to="/student" end className={desktopLinkClass}>
            Home
          </NavLink>

          {token && (
            <>
              <NavLink to="/student/jobs" className={desktopLinkClass}>
                Jobs
              </NavLink>
              <NavLink to="/student/saved-jobs" className={desktopLinkClass}>
                Saved
              </NavLink>
              <NavLink to="/student/applications" className={desktopLinkClass}>
                Applications
              </NavLink>
              <NavLink to="/student/interviews" className={desktopLinkClass}>
                Interviews
              </NavLink>
              <NavLink to="/student/analytics" className={desktopLinkClass}>
                Analytics
              </NavLink>
              <NavLink to="/student/profile" className={desktopLinkClass}>
                Profile
              </NavLink>
            </>
          )}

          {token && (
            <div className="relative" ref={desktopDropdownRef}>
              <button
                onClick={() => setOpenNotifications((prev) => !prev)}
                className="relative rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-200/30 hover:text-blue-600"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {openNotifications && (
                <div className="absolute right-0 z-50 mt-3 w-96 max-w-sm overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-xl">
                  {notificationPanel}
                </div>
              )}
            </div>
          )}

          {!token ? (
            <NavLink to="/student/login" className={desktopLinkClass}>
              Login
            </NavLink>
          ) : (
            <button
              onClick={handleLogout}
              className="rounded-full px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
            >
              Logout
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden" ref={mobileDropdownRef}>
          {token && (
            <div className="relative">
              <button
                onClick={() => {
                  setOpenNotifications((prev) => !prev);
                  fetchNotifications();
                }}
                className="relative rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-200/30 hover:text-blue-600"
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {openNotifications && (
                <div className="absolute left-0 top-full z-50 mt-3 w-[90vw] max-w-sm overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-xl">
                  {notificationPanel}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2.5 text-slate-700 transition hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200/50 bg-white px-4 py-4 md:hidden">
          <div className="space-y-2">
            <NavLink to="/student" end className={mobileLinkClass}>
              Home
            </NavLink>

            {token && (
              <>
                <NavLink to="/student/jobs" className={mobileLinkClass}>
                  Jobs
                </NavLink>
                <NavLink to="/student/saved-jobs" className={mobileLinkClass}>
                  Saved Jobs
                </NavLink>
                <NavLink to="/student/applications" className={mobileLinkClass}>
                  Applications
                </NavLink>
                <NavLink to="/student/interviews" className={mobileLinkClass}>
                  Interviews
                </NavLink>
                <NavLink to="/student/analytics" className={mobileLinkClass}>
                  Analytics
                </NavLink>
                <NavLink to="/student/profile" className={mobileLinkClass}>
                  Profile
                </NavLink>
              </>
            )}

            {!token ? (
              <NavLink to="/student/login" className={mobileLinkClass}>
                Login
              </NavLink>
            ) : (
              <button
                onClick={handleLogout}
                className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Notification</h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 transition hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <p>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </span>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {deriveNotificationStatus(selectedNotification)}
                </span>
              </p>

              <div>
                <p className="leading-relaxed text-slate-700">{selectedNotification.text}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {selectedNotification.createdAt
                    ? new Date(selectedNotification.createdAt).toLocaleString()
                    : ""}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedNotification(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  const targetRoute = deriveNotificationRoute(selectedNotification);
                  setSelectedNotification(null);
                  setOpenNotifications(false);
                  navigate(targetRoute);
                }}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:from-blue-700 hover:to-indigo-700"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
