import { useState } from "react";
import { Mail, Lock, ShieldCheck, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import PageFooter from "../../components/common/PageFooter";
import { useToast } from "../../components/ui/ToastProvider";

export default function ForgotPassword() {
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [step, setStep] = useState(1);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const sendOtp = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      await api.post("/hr/forgot-password", { email });
      toast.success("OTP sent to your email");
      setStep(2);
      setOtpTimer(300); // 5 minutes
      
      // Countdown timer
      const interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/hr/verify-reset-otp", {
        email,
        otp
      });

      setResetToken(res.data.resetToken);
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
      await api.post("/hr/reset-password", {
        resetToken,
        newPassword
      });

      toast.success("Password reset successful");
      setTimeout(() => {
        window.location.href = "/hr/login";
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-8 sm:p-10 shadow-2xl">
            {/* Logo Area */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Reset Password
              </h1>
              <p className="text-slate-400 text-sm mt-2">Secure your account with a new password</p>
            </div>

            {/* Step 1: Email */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition" />
                    <input
                      type="email"
                      placeholder="your.email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendOtp()}
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-12 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
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

                <p className="text-xs text-slate-500 text-center mt-4">
                  We'll send a one-time password to your registered email address
                </p>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-300">
                  ✓ OTP sent to <span className="font-medium">{email}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyPress={(e) => e.key === "Enter" && verifyOtp()}
                    maxLength="6"
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 tracking-widest text-center text-lg font-medium focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                  />
                </div>

                {otpTimer > 0 && (
                  <div className="text-xs text-slate-500 text-center">
                    OTP expires in{" "}
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}

                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
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
                    setEmail("");
                    setOtp("");
                    setOtpTimer(0);
                  }}
                  className="w-full text-slate-400 hover:text-slate-300 text-sm font-medium py-2 transition"
                >
                  ← Back to Email
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-300">
                  ✓ OTP verified • Ready to set new password
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition" />
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && resetPassword()}
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-12 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    • Minimum 6 characters required
                  </p>
                </div>

                <button
                  onClick={resetPassword}
                  disabled={loading || !newPassword.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
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
                  }}
                  className="w-full text-slate-400 hover:text-slate-300 text-sm font-medium py-2 transition"
                >
                  ← Start Over
                </button>
              </div>
            )}

            {/* Security Note */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                💡 For security, never share your OTP or password with anyone. We'll never ask for them by email.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PageFooter variant="hr" />
    </div>
  );
}
