import { useEffect, useState } from "react";
import { Mail, Lock, ShieldCheck, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import PageFooter from "../../components/common/PageFooter";
import { useToast } from "../../components/ui/ToastProvider";

export default function StudentForgotPassword() {
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [step, setStep] = useState(1);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (otpTimer <= 0) return undefined;

    const interval = setInterval(() => {
      setOtpTimer((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [otpTimer]);

  const sendOtp = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      await api.post("/student/forgot-password", { email });
      setStep(2);
      setOtp("");
      setOtpTimer(300);
      toast.success("OTP sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/student/verify-reset-otp", {
        email,
        otp
      });
      setResetToken(res.data?.resetToken || "");
      setStep(3);
      toast.success("OTP verified successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await api.post("/student/reset-password", {
        resetToken,
        newPassword
      });

      toast.success("Password reset successful");
      setTimeout(() => {
        window.location.href = "/student/login";
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200/70 rounded-2xl p-8 sm:p-10 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Reset Password</h1>
              <p className="text-slate-600 text-sm mt-2">Recover your student account securely</p>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  OTP sent to <span className="font-medium">{email}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                    maxLength="6"
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 tracking-widest text-center text-lg font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                  />
                </div>

                {otpTimer > 0 && (
                  <div className="text-xs text-slate-500 text-center">
                    OTP expires in{" "}
                    <span className="font-mono font-bold text-blue-600">
                      {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}

                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify OTP
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setOtpTimer(0);
                  }}
                  className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition"
                >
                  Back to Email
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  OTP verified. Set your new password.
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition" />
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && resetPassword()}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Minimum 6 characters required.</p>
                </div>

                <button
                  onClick={resetPassword}
                  disabled={loading || !newPassword.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setStep(1);
                    setEmail("");
                    setOtp("");
                    setNewPassword("");
                    setResetToken("");
                    setOtpTimer(0);
                  }}
                  className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PageFooter variant="student" />
    </div>
  );
}
