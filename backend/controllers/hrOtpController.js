import HrOtp from "../models/HrOtp.js";
import mailService from "../utils/mailService.js";
import jwt from "jsonwebtoken";

/* ================= SEND OTP ================= */

export const sendHrOtp = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    email = email.trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await HrOtp.deleteMany({ email });

    await HrOtp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // 🔥 NON-BLOCKING MAIL (INSTANT RESPONSE)
    mailService.sendHrOtpMail(email, otp)
      .then(() => console.log("Mail sent"))
      .catch(err => console.log("Mail error:", err));

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.log("OTP ERROR:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* ================= VERIFY OTP ================= */

export const verifyHrOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

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

    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.json({
      verified: true,
      verificationToken
    });

  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};