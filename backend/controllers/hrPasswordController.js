import Hr from "../models/Hr.js";
import HrOtp from "../models/HrOtp.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mailService from "../utils/mailService.js";

/*
=========================================================
HR PASSWORD RESET CONTROLLER
=========================================================
*/

export const sendResetOtp = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    email = email.trim().toLowerCase();

    const hr = await Hr.findOne({ email });

    if (!hr) {
      return res.status(404).json({ message: "HR not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await HrOtp.deleteMany({ email });

    await HrOtp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // ✅ FIXED
    await mailService.sendHrOtpMail(email, otp);

    res.json({ message: "Reset OTP sent" });

  } catch (err) {
    console.log("Send Reset OTP Error:", err);
    res.status(500).json({ message: "Failed to send reset OTP" });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    email = email.trim().toLowerCase();
    otp = otp.trim();

    const record = await HrOtp.findOne({ email, otp });

    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await HrOtp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    await HrOtp.deleteMany({ email });

    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.json({ resetToken });

  } catch (err) {
    console.log("Verify Reset OTP Error:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Hr.findOneAndUpdate(
      { email: decoded.email },
      { password: hashedPassword }
    );

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.log("Reset Password Error:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
};