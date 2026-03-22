import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import socket from "../../socket";
import PageFooter from "../../components/common/PageFooter";
import { useToast } from "../../components/ui/ToastProvider";
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Briefcase } from "lucide-react";

export default function StudentLogin() {
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

      const { data } = await api.post("/student/login", formData);

      localStorage.setItem("studentToken", data.token);
      socket.disconnect();
      socket.connect();
      toast.success("Welcome back! Redirecting to your dashboard...");

      setTimeout(() => {
        navigate("/student");
      }, 1000);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-32 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">JobPortal</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-2">Find Your Dream Job</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Welcome Back</h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">Sign in to access your job applications and opportunities</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className={`relative group transition-all duration-300 ${focused === 'email' ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg pl-12 pr-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm sm:text-base"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-2 mt-2 text-red-500 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className={`relative group transition-all duration-300 ${focused === 'password' ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg pl-12 pr-12 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-2 mt-2 text-red-500 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer hover:text-slate-800 transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-500 cursor-pointer" />
                  Remember me
                </label>
                <Link
                  to="/student/forgot-password"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 sm:py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mt-6 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-white text-slate-600">New to JobPortal?</span>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm sm:text-base text-slate-600">
              Don't have an account?{" "}
              <Link to="/student/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                Create one now
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex items-start gap-3 bg-white/60 backdrop-blur border border-slate-200/50 rounded-lg p-4">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-600">
              Trusted by 10,000+ students. Your information is secure and encrypted.
            </p>
          </div>
        </div>
      </div>

      <PageFooter variant="student" />
    </div>
  );
}
