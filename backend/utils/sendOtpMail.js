import nodemailer from "nodemailer";

let transporter = null;

export const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};



/*import nodemailer from "nodemailer";

    console.log("yyftgbjytfgv88888888888888888888888888",process.env.EMAIL_USER, process.env.EMAIL_PASS)

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
export const sendOtpMail = async (email, otp) => {
    console.log(email,otp)
    console.log("----------------",process.env.EMAIL_USER, process.env.EMAIL_PASS)
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "HR Email Verification OTP",
    html: `<h2>Your OTP: ${otp}</h2><p>Valid for 30 seconds</p>`
  });
};
*/