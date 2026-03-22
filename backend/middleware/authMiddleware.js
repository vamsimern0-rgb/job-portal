import jwt from "jsonwebtoken";
import Hr from "../models/Hr.js";
import Student from "../models/Student.js";

/* ================= TOKEN EXTRACTOR ================= */

const extractToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

/* ================= HR PROTECT ================= */

export const protectHr = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Ensure token role is HR
    if (decoded.role && decoded.role !== "HR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const hr = await Hr.findById(decoded.id).select("-password");

    if (!hr) {
      return res.status(401).json({ message: "HR not found" });
    }

    req.user = hr;
    req.userId = hr._id;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= STUDENT PROTECT ================= */

export const protectStudent = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Ensure token role is Student
    if (decoded.role && decoded.role !== "Student") {
      return res.status(403).json({ message: "Access denied" });
    }

    const student = await Student.findById(decoded.id).select("-password");

    if (!student) {
      return res.status(401).json({ message: "Student not found" });
    }

    req.user = student;     // unified access
    req.student = student;  // optional compatibility

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* backward compatibility */
export const protect = protectHr;
