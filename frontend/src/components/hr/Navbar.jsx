import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, X, Zap } from "lucide-react";
import api from "../../api/axios";
import socket from "../../socket";
import { getAssetBaseUrl } from "../../config/runtime";
import { toAssetUrl } from "../../utils/assets";

const ASSET_BASE_URL = getAssetBaseUrl();

export default function Navbar({ setMobileOpen, scrollContainerRef }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [animateBell, setAnimateBell] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(true);

  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const mobileMenuOpenedAtRef = useRef(0);

  useEffect(() => {
    const loadHeaderData = async () => {
      await Promise.all([fetchProfile(), fetchNotifications()]);
    };

    loadHeaderData();
  }, []);

  useEffect(() => {
    if (profile?._id) {
      socket.emit("joinUser", profile._id);
      socket.emit("joinCompany", profile.companyId || profile._id);

      socket.on("newNotification", (data) => {
        setNotifications((prev) => [data, ...prev]);
        setAnimateBell(true);
        setTimeout(() => setAnimateBell(false), 800);
      });
    }

    return () => socket.off("newNotification");
  }, [profile]);

  useEffect(() => {
    const handler = (e) => {
      const clickedInsideDesktop = desktopDropdownRef.current?.contains(e.target);
      const clickedInsideMobile = mobileDropdownRef.current?.contains(e.target);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setOpenNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setOpenNotifications(false);
    setIsMobileNavVisible(true);
  }, [location.pathname]);

  useEffect(() => {
    const scrollElement = scrollContainerRef?.current;
    if (!scrollElement) return;

    let lastScrollTop = scrollElement.scrollTop;
    let showTimer = null;

    const handleScroll = () => {
      const currentScrollTop = scrollElement.scrollTop;
      const scrollingDown = currentScrollTop > lastScrollTop;
      const isMobileViewport = window.innerWidth < 768;

      if (isMobileViewport) {
        setIsMobileNavVisible(!scrollingDown || currentScrollTop < 24);

        if (Date.now() - mobileMenuOpenedAtRef.current > 250) {
          setMobileOpen(false);
        }
      } else {
        setIsMobileNavVisible(true);
      }

      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => {
        setIsMobileNavVisible(true);
      }, 140);

      lastScrollTop = currentScrollTop;
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      window.clearTimeout(showTimer);
    };
  }, [scrollContainerRef, setMobileOpen]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/hr/profile");
      const nextProfile =
        res?.data && typeof res.data === "object" && res.data.hr
          ? res.data.hr
          : res?.data;

      if (!nextProfile || typeof nextProfile !== "object") {
        throw new Error("Invalid profile payload");
      }

      setProfile(nextProfile);
      localStorage.setItem("hrRole", nextProfile?.role || "");
      localStorage.setItem("role", nextProfile?.role || "");
      localStorage.setItem("hrUserId", nextProfile?._id || "");
      localStorage.setItem("hrEmail", nextProfile?.email || "");
    } catch (err) {
      console.error("Failed to fetch HR profile:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      const items = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];
      setNotifications(items);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const deriveNotificationRoute = (notification = {}) => {
    const text = String(notification?.text || "").toLowerCase();
    const metadata = notification?.metadata || {};

    if (text.includes("interview") || metadata?.reminderLabel) return "/hr/calendar";
    if (metadata?.candidateId || text.includes("candidate") || text.includes("applied")) return "/hr/candidates";
    if (metadata?.jobId || text.includes("job")) return "/hr/jobs";
    return "/hr/dashboard";
  };

  const deriveNotificationStatus = (notification = {}) => {
    const metadata = notification?.metadata || {};
    if (metadata?.status) return metadata.status;

    const text = String(notification?.text || "").toLowerCase();
    if (text.includes("cancel")) return "Cancelled";
    if (text.includes("rescheduled")) return "Rescheduled";
    if (text.includes("scheduled")) return "Scheduled";
    if (text.includes("reminder")) return "Reminder";
    if (text.includes("applied")) return "New Applicant";
    return "Update";
  };

  const openNotificationPopup = async (note) => {
    await markAsRead(note._id);
    setSelectedNotification(note);
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      await api.put("/hr/profile/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      await fetchProfile(); // refresh image

    } catch (err) {
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/hr/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenMobileMenu = () => {
    mobileMenuOpenedAtRef.current = Date.now();
    setMobileOpen(true);
  };

  const profileImage =
    profile?.profileImage
      ? toAssetUrl(ASSET_BASE_URL, profile.profileImage)
      : "https://ui-avatars.com/api/?name=HR&background=16a34a&color=fff";

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-700/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 shadow-lg shadow-slate-900/50 backdrop-blur-sm transition-transform duration-200 md:sticky md:px-8 ${
        isMobileNavVisible ? "translate-y-0" : "-translate-y-full md:translate-y-0"
      }`}
    >

      {/* LEFT */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 md:hidden" ref={mobileDropdownRef}>
          <button
            onClick={() => setOpenNotifications((prev) => !prev)}
            className={`relative rounded-lg p-2.5 text-slate-400 transition hover:bg-slate-800/40 hover:text-emerald-400 ${
              animateBell ? "animate-bounce" : ""
            }`}
            aria-label="Open notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 min-w-5 rounded-full bg-gradient-to-r from-red-600 to-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            className="shrink-0 rounded-lg p-2.5 text-slate-400 transition hover:bg-slate-800/40 hover:text-slate-200"
            onClick={handleOpenMobileMenu}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {openNotifications && (
            <div className="absolute left-0 top-full mt-3 w-[90vw] max-w-sm overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/95 shadow-xl">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No notifications
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((note) => (
                    <div
                      key={note._id}
                      onClick={() => openNotificationPopup(note)}
                      className={`cursor-pointer border-b border-slate-700/30 px-4 py-3 text-sm transition ${
                        note.read
                          ? "bg-slate-800/40 text-slate-400 hover:bg-slate-700/40"
                          : "border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50"
                      }`}
                    >
                      {note.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent truncate">
            HR Dashboard
          </h1>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4 shrink-0">

        {profile?.role && (
          <span className="hidden sm:inline px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30 rounded-full whitespace-nowrap">
            {profile.role}
          </span>
        )}

        <div className="relative hidden md:block" ref={desktopDropdownRef}>
          <button
            onClick={() => setOpenNotifications(!openNotifications)}
            className={`relative p-2.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40 transition ${
              animateBell ? "animate-bounce" : ""
            }`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-gradient-to-r from-red-600 to-red-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5">
                {unreadCount}
              </span>
            )}
          </button>

          {openNotifications && (
            <div className="absolute right-0 mt-3 w-[90vw] sm:w-96 max-w-sm bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl rounded-2xl z-50 overflow-hidden">
              {notifications.length === 0 ? (
                <div className="p-6 text-sm text-slate-400 text-center">
                  No notifications
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((note) => (
                    <div
                      key={note._id}
                      onClick={() => openNotificationPopup(note)}
                      className={`px-4 py-3 text-sm border-b border-slate-700/30 cursor-pointer transition ${
                        note.read ? "bg-slate-800/40 text-slate-400 hover:bg-slate-700/40" : "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50 border-emerald-500/30"
                      }`}
                    >
                      {note.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="hidden md:block text-sm text-slate-400 truncate max-w-[120px]">
          {profile?.email}
        </span>

        {/* CLICKABLE PROFILE IMAGE */}
        <div className="relative">
          <img
            src={profileImage}
            alt="Profile"
            onClick={handleImageClick}
            className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/50 shrink-0 cursor-pointer hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 transition"
          />
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-slate-900/70 rounded-full font-bold text-emerald-400">
              ...
            </span>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        <button
          onClick={logout}
          className="flex items-center gap-1 text-slate-400 hover:text-red-400 text-sm transition shrink-0 group"
        >
          <LogOut size={16} className="group-hover:scale-110 transition" />
          <span className="hidden md:inline">Logout</span>
        </button>

      </div>

      {selectedNotification && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Notification</h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm space-y-4">
              <p>
                <span className="font-semibold text-slate-400">Status:</span>
              </p>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30">
                {deriveNotificationStatus(selectedNotification)}
              </span>
              <p className="text-slate-300">{selectedNotification.text}</p>
              <p className="text-xs text-slate-500">
                {selectedNotification.createdAt
                  ? new Date(selectedNotification.createdAt).toLocaleString()
                  : ""}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2.5 text-sm rounded-lg border border-slate-700/50 text-slate-300 hover:bg-slate-700/30 hover:border-slate-600/50 transition font-medium"
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
                className="px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-medium transition"
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
