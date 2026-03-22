import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import StudentSkillVector from "../models/StudentSkillVector.js";
import skillTokenizer from "../ai/skillTokenizer.js";

const generateToken = (student) => {
  return jwt.sign(
    { id: student._id, role: student.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/* ================= REGISTER ================= */

export const registerStudent = async (req, res) => {
  try {
    const { fullName, password, skills } = req.body;
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email and password are required"
      });
    }

    const existing = await Student.findOne({ email });
    if (existing) {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      fullName,
      email,
      password: hashedPassword,
      skills: skills || []
    });

    const tokens = skillTokenizer.tokenizeSkills(student.skills || []);

    await StudentSkillVector.create({
      studentId: student._id,
      tokens,
      vector: {},
      updatedAt: new Date()
    });

    const token = generateToken(student);

    res.status(201).json({
      message: "Registration successful",
      token,
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};

/* ================= LOGIN ================= */

export const loginStudent = async (req, res) => {
  try {
    const password = req.body?.password;
    const email = String(req.body?.email || "").trim().toLowerCase();

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    student.lastLogin = new Date();
    await student.save();

    const token = generateToken(student);

    res.json({
      token,
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= LOGOUT ================= */

export const logoutStudent = async (req, res) => {
  try {
    return res.json({ message: "Logout successful" });
  } catch (err) {
    return res.status(500).json({ message: "Logout failed" });
  }
};
