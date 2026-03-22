import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import socket from "../../socket";
import PageFooter from "../../components/common/PageFooter";
import { useToast } from "../../components/ui/ToastProvider";
import { Briefcase, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

function HrLogin() {
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      localStorage.removeItem("hrToken");
      localStorage.removeItem("hrRole");
      localStorage.removeItem("role");
      localStorage.removeItem("hrUserId");
      localStorage.removeItem("hrEmail");

      const res = await api.post("/hr/login", {
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem("hrToken", res.data.token);
      localStorage.setItem("hrRole", res.data.role || "");
      localStorage.setItem("role", res.data.role || "");
      localStorage.setItem("hrUserId", res.data._id || "");
      localStorage.setItem("hrEmail", res.data.email || "");
      socket.disconnect();
      socket.connect();
      toast.success("Welcome back! Redirecting to dashboard...");

      setTimeout(() => {
        navigate("/hr/dashboard");
      }, 1000);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">JobPortal</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-2">HR Management Platform</p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Sign In</h2>
              <p className="text-sm sm:text-base text-slate-400 mt-2">Access your HR dashboard and manage your team</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">Email Address</label>
                <div className={`relative group transition-all duration-300 ${focused === 'email' ? 'ring-2 ring-green-500/50' : ''}`}>
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    placeholder="your@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm sm:text-base"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">Password</label>
                <div className={`relative group transition-all duration-300 ${focused === 'password' ? 'ring-2 ring-green-500/50' : ''}`}>
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-green-500 cursor-pointer" />
                  Remember me
                </label>
                <Link to="/hr/forgot-password" className="text-green-400 hover:text-green-300 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 sm:py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mt-6 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 text-slate-400 bg-slate-800/50">New to JobPortal?</span>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm sm:text-base text-slate-400">
              Don't have an account?{" "}
              <Link to="/hr/register" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                Sign up here
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-6 flex items-start gap-3 bg-slate-700/30 border border-slate-700/50 rounded-lg p-4">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-400">
              Your data is encrypted and secure. We never share your information with third parties.
            </p>
          </div>
        </div>
      </div>

      <PageFooter variant="hr" />
    </div>
  );
}

export default HrLogin;
