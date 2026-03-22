import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import PageFooter from "../../components/common/PageFooter";
import { useToast } from "../../components/ui/ToastProvider";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Briefcase, Shield } from "lucide-react";

export default function StudentRegister() {
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.length < 3) {
      newErrors.fullName = "Name must be at least 3 characters";
    }
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === "password") {
      calculatePasswordStrength(value);
    }

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

      await api.post("/student/register", formData);
      toast.success("Account created successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/student/login");
      }, 1500);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 2) return "bg-yellow-500";
    if (passwordStrength <= 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 2) return "Fair";
    if (passwordStrength <= 3) return "Good";
    return "Strong";
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
            <p className="text-sm sm:text-base text-slate-600 mt-2">Create your account and start exploring</p>
          </div>

          {/* Register Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Create Account</h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">Join thousands of students finding great opportunities</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                <div className={`relative group transition-all duration-300 ${focused === 'fullName' ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    onFocus={() => setFocused('fullName')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg pl-12 pr-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm sm:text-base"
                  />
                </div>
                {errors.fullName && (
                  <div className="flex items-center gap-2 mt-2 text-red-500 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.fullName}
                  </div>
                )}
              </div>

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
                    placeholder="Create a strong password"
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i < passwordStrength ? getPasswordStrengthColor() : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600">
                      Password strength: <span className="font-semibold">{getPasswordStrengthText()}</span>
                    </p>
                  </div>
                )}

                {errors.password && (
                  <div className="flex items-center gap-2 mt-2 text-red-500 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Terms & Privacy */}
              <label className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" required className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-500 cursor-pointer" />
                <span>
                  I agree to the{" "}
                  <span className="text-blue-600 hover:underline font-medium">Terms of Service</span> and{" "}
                  <span className="text-blue-600 hover:underline font-medium">Privacy Policy</span>
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 sm:py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mt-6 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
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
                <span className="px-2 bg-white text-slate-600">Already have an account?</span>
              </div>
            </div>

            {/* Login Link */}
            <p className="text-center text-sm sm:text-base text-slate-600">
              <Link to="/student/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>

          {/* Security & Trust */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 bg-white/60 backdrop-blur border border-slate-200/50 rounded-lg p-3">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Secure</p>
                <p className="text-xs text-slate-600">SSL encrypted</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white/60 backdrop-blur border border-slate-200/50 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Verified</p>
                <p className="text-xs text-slate-600">Email verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageFooter variant="student" />
    </div>
  );
}
