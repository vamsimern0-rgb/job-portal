import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import StudentOtp from "../models/StudentOtp.js";
import mailService from "../utils/mailService.js";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

export const sendStudentResetOtp = async (req, res) => {
  try {
    let { email } = req.body || {};
    email = normalizeEmail(email || "");

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const student = await Student.findOne({ email }).select("_id");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await StudentOtp.deleteMany({ email });
    await StudentOtp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await mailService.sendMail({
      to: email,
      subject: "Your Student Password Reset OTP",
      html: `
        <div style="font-family:Arial;padding:20px;">
          <h2>Password Reset OTP</h2>
          <p>Your OTP is:</p>
          <h1 style="color:#2563eb;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `
    });

    return res.json({ message: "Reset OTP sent" });
  } catch (err) {
    console.error("Student reset OTP send error:", err);
    return res.status(500).json({ message: "Failed to send reset OTP" });
  }
};

export const verifyStudentResetOtp = async (req, res) => {
  try {
    let { email, otp } = req.body || {};
    email = normalizeEmail(email || "");
    otp = String(otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const record = await StudentOtp.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await StudentOtp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    await StudentOtp.deleteMany({ email });

    const resetToken = jwt.sign(
      { email, role: "Student" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.json({ resetToken });
  } catch (err) {
    console.error("Student reset OTP verify error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};

export const resetStudentPassword = async (req, res) => {
  try {
    const { token, resetToken, newPassword } = req.body || {};
    const activeToken = String(token || resetToken || "").trim();
    const nextPassword = String(newPassword || "");

    if (!activeToken || !nextPassword) {
      return res.status(400).json({ message: "Token and new password required" });
    }

    if (nextPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const decoded = jwt.verify(activeToken, process.env.JWT_SECRET);
    if (decoded?.role && decoded.role !== "Student") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const student = await Student.findOne({ email: normalizeEmail(decoded?.email || "") });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.password = await bcrypt.hash(nextPassword, 10);
    await student.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Student reset password error:", err);
    return res.status(500).json({ message: "Password reset failed" });
  }
};
