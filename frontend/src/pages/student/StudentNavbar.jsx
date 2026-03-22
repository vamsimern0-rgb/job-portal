import { NavLink, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X, Zap } from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentNavbar() {
  const toast = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [studentId, setStudentId] = useState("");
  const dropdownRef = useRef(null);

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/student/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, read: true } : item
        )
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

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${
      isActive ? "text-blue-600 font-semibold" : "text-slate-700 hover:text-blue-600"
    }`;

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <header className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 border-b border-slate-200/50 sticky top-0 z-40 shadow-sm">
      <div className="max-w-screen-xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div
          onClick={() => navigate("/student")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:scale-105 transition">
            AI Careers
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/student" end className={linkClass}>
            Home
          </NavLink>

          {token && (
            <>
              <NavLink to="/student/jobs" className={linkClass}>
                Jobs
              </NavLink>

              <NavLink to="/student/saved-jobs" className={linkClass}>
                Saved
              </NavLink>

              <NavLink to="/student/applications" className={linkClass}>
                Applications
              </NavLink>

              <NavLink to="/student/interviews" className={linkClass}>
                Interviews
              </NavLink>

              <NavLink to="/student/analytics" className={linkClass}>
                Analytics
              </NavLink>

              <NavLink to="/student/profile" className={linkClass}>
                Profile
              </NavLink>
            </>
          )}

          {token && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpenNotifications((prev) => !prev)}
                className="relative p-2.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200/30 rounded-lg transition"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-gradient-to-r from-red-600 to-red-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {openNotifications && (
                <div className="absolute right-0 mt-3 w-96 max-w-sm bg-white border border-slate-200/50 rounded-2xl shadow-xl overflow-hidden z-50">
                  {notifications.length > 0 && (
                    <div className="flex items-center justify-end px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50">
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                  {notifications.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500 text-center">
                      No notifications
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <button
                          key={notification._id}
                          onClick={() => openNotificationPopup(notification)}
                          className={`w-full text-left px-4 py-3 text-sm border-b border-slate-100 transition ${
                            notification.read ? "bg-white hover:bg-slate-50 text-slate-700" : "bg-blue-50/50 hover:bg-blue-100/50 text-blue-900 border-blue-200/30"
                          }`}
                        >
                          {notification.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!token ? (
            <NavLink to="/student/login" className={linkClass}>
              Login
            </NavLink>
          ) : (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-700 transition"
            >
              Logout
            </button>
          )}
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-sm font-medium"
        >
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-white border-slate-200/50 px-4 py-4 space-y-3">
          <NavLink to="/student" end className="block text-sm">
            Home
          </NavLink>

          {token && (
            <>
              <NavLink to="/student/jobs" className="block text-sm">
                Jobs
              </NavLink>

              <NavLink to="/student/saved-jobs" className="block text-sm">
                Saved Jobs
              </NavLink>

              <NavLink to="/student/applications" className="block text-sm">
                Applications
              </NavLink>

              <NavLink to="/student/interviews" className="block text-sm">
                Interviews
              </NavLink>

              <NavLink to="/student/analytics" className="block text-sm">
                Analytics
              </NavLink>

              <NavLink to="/student/profile" className="block text-sm">
                Profile
              </NavLink>

              <button
                onClick={() => {
                  setOpenNotifications((prev) => !prev);
                  fetchNotifications();
                }}
                className="block text-sm"
              >
                Notifications ({unreadCount})
              </button>

              {openNotifications && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {notifications.length > 0 && (
                    <div className="flex items-center justify-end px-3 py-2 border-b bg-slate-50 border-slate-100">
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                  {notifications.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center">No notifications</div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map((notification) => (
                        <button
                          key={notification._id}
                          onClick={() => openNotificationPopup(notification)}
                          className={`w-full text-left px-3 py-3 text-xs border-b transition ${
                            notification.read ? "bg-white hover:bg-slate-50 text-slate-700" : "bg-blue-50/50 hover:bg-blue-100/50 text-blue-900 border-blue-200/30"
                          }`}
                        >
                          {notification.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!token ? (
            <NavLink to="/student/login" className="block text-sm">
              Login
            </NavLink>
          ) : (
            <button
              onClick={handleLogout}
              className="block text-sm text-red-500"
            >
              Logout
            </button>
          )}
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Notification</h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm space-y-4">
              <p>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200">
                  {deriveNotificationStatus(selectedNotification)}
                </span>
              </p>
              <div>
                <p className="text-slate-700 leading-relaxed">{selectedNotification.text}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedNotification.createdAt
                    ? new Date(selectedNotification.createdAt).toLocaleString()
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedNotification(null)}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition font-medium"
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
                className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition"
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
