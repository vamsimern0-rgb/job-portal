import mongoose from "mongoose";

const studentOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true
    },
    otp: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

// Auto delete expired OTP
studentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("StudentOtp", studentOtpSchema);
