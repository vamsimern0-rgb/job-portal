import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import PageFooter from "../../components/common/PageFooter";
import { useToast } from "../../components/ui/ToastProvider";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, Building2, User, Phone, FileText, Briefcase } from "lucide-react";

// Password strength calculation
const calculatePasswordStrength = (password) => {
  let strength = 0;
  if (!password) return strength;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

export default function HrRegister() {
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
    city: "",
    country: "",
    fullName: "",
    role: "",
    email: "",
    phone: "",
    linkedin: "",
    password: "",
    gstNumber: "",
    companyPan: "",
    companyCin: "",
    registeredAddress: "",
    hiringType: "",
    openPositions: "",
    urgency: "",
    description: ""
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [timer, setTimer] = useState(300);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [_focused, setFocused] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Calculate password strength
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.companyName.trim()) newErrors.companyName = "Company name required";
    if (!formData.fullName.trim()) newErrors.fullName = "Full name required";
    if (!formData.email.trim()) newErrors.email = "Email required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password required";
    else if (formData.password.length < 6) newErrors.password = "Password must be 6+ characters";
    if (!formData.role) newErrors.role = "Select your role";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendOtp = async () => {
    if (!formData.email.trim()) {
      toast.error("Enter company email first");
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Enter valid email address");
      return;
    }

    try {
      setLoadingOtp(true);
      await api.post("/hr/send-otp", { email: formData.email });
      setOtpSent(true);
      setOtpVerified(false);
      setTimer(300);
      toast.success("OTP sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoadingOtp(false);
    }
  };

  useEffect(() => {
    if (!otpSent || otpVerified || timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSent, otpVerified, timer]);

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter OTP");
      return;
    }

    try {
      setLoadingVerify(true);
      const res = await api.post("/hr/verify-otp", {
        email: formData.email,
        otp
      });

      if (res.data.verified) {
        setOtpVerified(true);
        setVerificationToken(res.data.verificationToken);
        toast.success("Email verified successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!otpVerified) {
      toast.error("Verify OTP first");
      return;
    }

    try {
      setLoadingRegister(true);
      await api.post("/hr/register", {
        ...formData,
        verificationToken
      });

      toast.success("Registration successful! Redirecting...");
      setTimeout(() => {
        navigate("/hr/login");
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoadingRegister(false);
    }
  };

  const formatTimer = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = String(timer % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative flex flex-col min-h-screen">
        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
                <Building2 className="text-white w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Employer Registration
              </h1>
              <p className="text-slate-400 mt-3">
                Join thousands of companies finding top talent
              </p>
            </div>

            {/* Registration Card */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 md:p-8 space-y-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Information Section */}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-green-500" />
                    Company Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <EnhancedInput
                      label="Company Name"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      onFocus={() => setFocused("companyName")}
                      onBlur={() => setFocused(null)}
                      placeholder="Your company name"
                      icon={Building2}
                      error={errors.companyName}
                      required
                    />
                    <EnhancedSelect
                      label="Industry / Domain"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      onFocus={() => setFocused("industry")}
                      onBlur={() => setFocused(null)}
                      options={[
                        { value: "", label: "Select industry" },
                        { value: "Technology", label: "Technology" },
                        { value: "Finance", label: "Finance" },
                        { value: "Healthcare", label: "Healthcare" },
                        { value: "Retail", label: "Retail" },
                        { value: "Manufacturing", label: "Manufacturing" },
                        { value: "Other", label: "Other" }
                      ]}
                    />
                    <EnhancedSelect
                      label="Company Size"
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleChange}
                      onFocus={() => setFocused("companySize")}
                      onBlur={() => setFocused(null)}
                      options={[
                        { value: "", label: "Select size" },
                        { value: "1-10", label: "1-10 employees" },
                        { value: "11-50", label: "11-50 employees" },
                        { value: "51-200", label: "51-200 employees" },
                        { value: "201-500", label: "201-500 employees" },
                        { value: "500+", label: "500+ employees" }
                      ]}
                    />
                    <EnhancedInput
                      label="Website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleChange}
                      onFocus={() => setFocused("website")}
                      onBlur={() => setFocused(null)}
                      placeholder="https://company.com"
                    />
                    <EnhancedInput
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      onFocus={() => setFocused("city")}
                      onBlur={() => setFocused(null)}
                      placeholder="Headquarters location"
                    />
                    <EnhancedInput
                      label="Country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      onFocus={() => setFocused("country")}
                      onBlur={() => setFocused(null)}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <hr className="border-slate-700/30" />

                {/* HR Details Section */}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-green-500" />
                    Your Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <EnhancedInput
                      label="Full Name"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      onFocus={() => setFocused("fullName")}
                      onBlur={() => setFocused(null)}
                      placeholder="Your full name"
                      icon={User}
                      error={errors.fullName}
                      required
                    />
                    <EnhancedSelect
                      label="Your Role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      onFocus={() => setFocused("role")}
                      onBlur={() => setFocused(null)}
                      options={[
                        { value: "", label: "Select role" },
                        { value: "HR Manager", label: "HR Manager" },
                        { value: "Recruiter", label: "Recruiter" },
                        { value: "Founder", label: "Founder" },
                        { value: "Hiring Manager", label: "Hiring Manager" }
                      ]}
                      error={errors.role}
                      required
                    />
                    <EnhancedInput
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="your@company.com"
                      icon={Mail}
                      error={errors.email}
                      required
                      disabled={otpSent}
                    />
                    <EnhancedInput
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={() => setFocused("phone")}
                      onBlur={() => setFocused(null)}
                      placeholder="+1 (555) 123-4567"
                      icon={Phone}
                    />
                    <EnhancedInput
                      label="LinkedIn Profile"
                      name="linkedin"
                      type="url"
                      value={formData.linkedin}
                      onChange={handleChange}
                      onFocus={() => setFocused("linkedin")}
                      onBlur={() => setFocused(null)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500/50">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          onFocus={() => setFocused("password")}
                          onBlur={() => setFocused(null)}
                          placeholder="********"
                          className="w-full bg-slate-700/50 border border-slate-600 hover:border-slate-500 rounded-lg pl-12 pr-12 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                          required
                          disabled={otpVerified}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3.5 text-slate-500 hover:text-green-500 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {formData.password && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-2">
                            {['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'].map((color, i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                  i < passwordStrength ? color : 'bg-slate-600/30'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400">
                            {passwordStrength === 0 ? "Very weak" :
                             passwordStrength === 1 ? "Weak" :
                             passwordStrength === 2 ? "Fair" :
                             passwordStrength === 3 ? "Good" :
                             passwordStrength === 4 ? "Strong" : "Very strong"}
                          </p>
                        </div>
                      )}
                      {errors.password && (
                        <div className="flex items-center gap-2 mt-2 text-red-400 text-xs sm:text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {errors.password}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-700/30" />

                {/* Hiring Details */}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-green-500" />
                    Hiring Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <EnhancedSelect
                      label="Hiring Type"
                      name="hiringType"
                      value={formData.hiringType}
                      onChange={handleChange}
                      onFocus={() => setFocused("hiringType")}
                      onBlur={() => setFocused(null)}
                      options={[
                        { value: "", label: "Select type" },
                        { value: "Full-Time", label: "Full-Time" },
                        { value: "Part-Time", label: "Part-Time" },
                        { value: "Contract", label: "Contract" },
                        { value: "Internship", label: "Internship" }
                      ]}
                    />
                    <EnhancedInput
                      label="Open Positions"
                      name="openPositions"
                      type="number"
                      value={formData.openPositions}
                      onChange={handleChange}
                      onFocus={() => setFocused("openPositions")}
                      onBlur={() => setFocused(null)}
                      placeholder="Number of open positions"
                    />
                    <EnhancedSelect
                      label="Hiring Urgency"
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleChange}
                      onFocus={() => setFocused("urgency")}
                      onBlur={() => setFocused(null)}
                      options={[
                        { value: "", label: "Select urgency" },
                        { value: "Immediate", label: "Immediate" },
                        { value: "Within 1 Month", label: "Within 1 Month" },
                        { value: "Flexible", label: "Flexible" }
                      ]}
                    />
                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                        Company Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Tell us about your company..."
                        rows={3}
                        className="w-full bg-slate-700/50 border border-slate-600 hover:border-slate-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-700/30" />

                {/* Legal Details */}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-green-500" />
                    Legal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <EnhancedInput
                      label="GST Number"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      onFocus={() => setFocused("gstNumber")}
                      onBlur={() => setFocused(null)}
                      placeholder="Your GST number"
                    />
                    <EnhancedInput
                      label="Company PAN"
                      name="companyPan"
                      value={formData.companyPan}
                      onChange={handleChange}
                      onFocus={() => setFocused("companyPan")}
                      onBlur={() => setFocused(null)}
                      placeholder="PAN number"
                    />
                    <EnhancedInput
                      label="CIN (Optional)"
                      name="companyCin"
                      value={formData.companyCin}
                      onChange={handleChange}
                      onFocus={() => setFocused("companyCin")}
                      onBlur={() => setFocused(null)}
                      placeholder="Corporate Identification Number"
                    />
                    <EnhancedInput
                      label="Registered Address"
                      name="registeredAddress"
                      value={formData.registeredAddress}
                      onChange={handleChange}
                      onFocus={() => setFocused("registeredAddress")}
                      onBlur={() => setFocused(null)}
                      placeholder="Full registered address"
                    />
                  </div>
                </div>

                {/* Email Verification Section */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">Email Verification</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        {otpVerified ? "Email verified successfully" : "Verify your email to complete registration"}
                      </p>
                    </div>
                  </div>

                  {!otpVerified && (
                    <div className="space-y-3">
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={loadingOtp || !formData.email}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loadingOtp ? (
                            <>
                              <div className="w-4 h-4 border-2 border-green-200 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Send OTP
                            </>
                          )}
                        </button>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                              OTP Code
                            </label>
                            <input
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                              className="w-full bg-slate-700/50 border border-slate-600 hover:border-slate-500 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 text-center text-lg tracking-widest font-mono transition-all"
                              maxLength="6"
                            />
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">
                              Code expires in {formatTimer()}
                            </span>
                            {timer < 60 && (
                              <button
                                type="button"
                                onClick={sendOtp}
                                disabled={loadingOtp}
                                className="text-green-400 hover:text-green-300 font-semibold"
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={verifyOtp}
                            disabled={loadingVerify || !otp}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {loadingVerify ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-200 border-t-white rounded-full animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Verify OTP
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {otpVerified && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm font-semibold text-emerald-300">
                        Email verified successfully
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!otpVerified || loadingRegister}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base sm:text-lg"
                >
                  {loadingRegister ? (
                    <>
                      <div className="w-5 h-5 border-2 border-green-200 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Employer Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="text-center pt-6 border-t border-slate-700/30">
                <p className="text-slate-400 text-sm">
                  Already registered?{" "}
                  <Link to="/hr/login" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Lock className="w-4 h-4" />
              Your data is encrypted and secure
            </div>
          </div>
        </div>

        {/* Footer */}
        <PageFooter variant="hr" />
      </div>
    </div>
  );
}

function EnhancedInput({ label, error, icon: Icon, ...props }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500/50">
        {Icon && (
          <Icon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors pointer-events-none" />
        )}
        <input
          {...props}
          className={`w-full bg-slate-700/50 border rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed ${
            Icon ? 'pl-12' : 'pl-4'
          } ${error ? 'border-red-500' : 'border-slate-600 hover:border-slate-500'}`}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-400 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function EnhancedSelect({ label, error, options, ...props }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500/50">
        <select
          {...props}
          className={`w-full bg-slate-700/50 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed appearance-none cursor-pointer ${
            error ? 'border-red-500' : 'border-slate-600 hover:border-slate-500'
          }`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-400 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
