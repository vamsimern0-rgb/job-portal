import mongoose from "mongoose";

const hrOtpSchema = new mongoose.Schema(
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
hrOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("HrOtp", hrOtpSchema);
