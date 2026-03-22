import { getTransporter } from "./sendOtpMail.js";

const sendMail = async ({ to, subject, html }) => {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Job Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendHrOtpMail = async (email, otp) => {
  await sendMail({
    to: email,
    subject: "Your HR Registration OTP",
    html: `
      <div style="font-family:Arial;padding:20px;">
        <h2>OTP Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="color:#16a34a;">${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
      </div>
    `,
  });
};

export default {
  sendMail,
  sendHrOtpMail,
};