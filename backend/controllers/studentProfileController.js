import Student from "../models/Student.js";
import StudentSkillVector from "../models/StudentSkillVector.js";
import skillTokenizer from "../ai/skillTokenizer.js";
import * as tfidfEngine from "../ai/tfidfEngine.js";
import { toPublicUploadPath } from "../utils/uploadPaths.js";

const normalizeString = (value = "") => String(value ?? "").trim();

const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : typeof value === "string"
      ? value
          .split(",")
          .map((item) => normalizeString(item))
          .filter(Boolean)
      : [];

const normalizeYear = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeEducation = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry = {}) => ({
      institution: normalizeString(entry.institution),
      degree: normalizeString(entry.degree),
      field: normalizeString(entry.field),
      startYear: normalizeYear(entry.startYear),
      endYear: normalizeYear(entry.endYear)
    }))
    .filter(
      (entry) =>
        entry.institution ||
        entry.degree ||
        entry.field ||
        entry.startYear ||
        entry.endYear
    );

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "off", "no"].includes(normalized)) return false;
    if (["true", "1", "on", "yes"].includes(normalized)) return true;
  }
  return Boolean(value);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/* ================= UPDATE PROFILE ================= */

export const updateProfile = async (req, res) => {
  try {

    const student = await Student.findById(req.user._id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const fields = [
      "phone",
      "location",
      "headline",
      "currentRole",
      "linkedin",
      "github",
      "portfolio",
      "bio"
    ];

    fields.forEach((field) => {
      if (field in req.body) {
        student[field] = normalizeString(req.body[field]);
      }
    });

    if ("fullName" in req.body) {
      const fullName = normalizeString(req.body.fullName);
      if (!fullName) {
        return res.status(400).json({ message: "Full name is required" });
      }
      student.fullName = fullName;
    }

    if ("dateOfBirth" in req.body) {
      if (!req.body.dateOfBirth) {
        student.dateOfBirth = null;
      } else {
        const parsedDate = new Date(req.body.dateOfBirth);
        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({ message: "Invalid date of birth" });
        }
        student.dateOfBirth = parsedDate;
      }
    }

    if ("experience" in req.body) {
      const numericExperience = Number(req.body.experience);
      student.experience =
        Number.isFinite(numericExperience) && numericExperience >= 0
          ? numericExperience
          : 0;
    }

    if ("skills" in req.body) {
      student.skills = normalizeStringArray(req.body.skills);
    }

    if ("education" in req.body) {
      student.education = normalizeEducation(req.body.education);
    }

    const existingPreferences = student.communicationPreferences || {};
    const incomingPreferences = req.body?.communicationPreferences || {};

    student.communicationPreferences = {
      ...existingPreferences,
      emailJobAlerts: parseBoolean(
        incomingPreferences.emailJobAlerts,
        existingPreferences.emailJobAlerts ?? true
      ),
      inAppAlerts: parseBoolean(
        incomingPreferences.inAppAlerts,
        existingPreferences.inAppAlerts ?? true
      )
    };

    const existingAlertSettings = student.jobAlertSettings || {};
    const incomingAlertSettings = req.body?.jobAlertSettings || {};
    const parsedMinMatchScore = Number(
      incomingAlertSettings.minMatchScore ?? existingAlertSettings.minMatchScore ?? 60
    );

    student.jobAlertSettings = {
      minMatchScore: Number.isFinite(parsedMinMatchScore)
        ? clamp(parsedMinMatchScore, 1, 100)
        : 60,
      preferredLocations:
        "preferredLocations" in incomingAlertSettings
          ? normalizeStringArray(incomingAlertSettings.preferredLocations)
          : existingAlertSettings.preferredLocations || [],
      preferredEmploymentTypes:
        "preferredEmploymentTypes" in incomingAlertSettings
          ? normalizeStringArray(incomingAlertSettings.preferredEmploymentTypes)
          : existingAlertSettings.preferredEmploymentTypes || []
    };

    student.profileCompletion = calculateProfileCompletion(student);

    await student.save();

    res.json(student);

  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
};

/* ================= PROFILE IMAGE UPLOAD ================= */

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const student = await Student.findById(req.user._id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.profileImage = toPublicUploadPath(req.file);
    student.profileCompletion = calculateProfileCompletion(student);
    await student.save();

    return res.json({
      message: "Profile image updated",
      profileImage: student.profileImage
    });
  } catch (err) {
    console.error("Profile image upload error:", err);
    return res.status(500).json({ message: "Profile image upload failed" });
  }
};



/* ================= RESUME UPLOAD ================= */

export const uploadResume = async (req, res) => {

  try {

    const student = await Student.findById(req.user._id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No resume uploaded" });
    }

    /* ===== SAVE FILE INFO ===== */

    student.resumeUrl = "resume_uploaded";
    student.resumeText = "";

    /* ===== SIMPLE TOKEN GENERATION FROM SKILLS ===== */

    const tokens = skillTokenizer.tokenizeSkills(student.skills || []);

    const tfidf = tfidfEngine.buildTfIdfModel([tokens]);

    const vector = tfidfEngine.vectorizeDocument(tfidf, 0);

    await StudentSkillVector.findOneAndUpdate(
      { studentId: student._id },
      {
        tokens,
        vector,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    student.resumeScore = calculateResumeScore(tokens);

    student.profileCompletion = calculateProfileCompletion(student);

    await student.save();

    res.json({
      message: "Resume uploaded successfully",
      resumeScore: student.resumeScore
    });

  } catch (err) {

    console.error("Resume Upload Error:", err);

    res.status(500).json({
      message: "Resume upload failed"
    });

  }

};



/* ================= UTILITIES ================= */

const calculateProfileCompletion = (student) => {

  let score = 0;

  if (student.fullName) score += 10;
  if (student.headline) score += 10;
  if (student.skills?.length) score += 20;
  if (student.profileImage) score += 10;
  if (student.resumeUrl) score += 30;
  if (student.education?.length) score += 20;
  if (student.bio) score += 10;
  if (student.currentRole) score += 10;

  return score;

};


const calculateResumeScore = (tokens) => {

  if (!tokens || !tokens.length) return 0;

  return Math.min(tokens.length * 5, 100);

};
