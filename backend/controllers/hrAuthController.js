import Hr from "../models/Hr.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import generateToken from "../utils/generateToken.js";

const ensureActivityLog = (doc) => {
  if (!doc) return false;
  if (!Array.isArray(doc.activityLog)) {
    doc.activityLog = [];
  }
  return true;
};

const ALLOWED_ROLES = ["Founder", "HR Manager", "Recruiter", "Hiring Manager", "Viewer"];

/* =====================================================
   REGISTER HR (FOUNDER + SUB USER)
===================================================== */
export const registerHr = async (req, res) => {
  try {
    let {
      email,
      password,
      verificationToken,
      role,
      companyId,
      ...rest
    } = req.body;

    if (!verificationToken) {
      return res.status(403).json({ message: "OTP not verified" });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    email = email.trim().toLowerCase();

    const exists = await Hr.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let assignedRole = "Founder";
    let finalCompanyId = null;

    /* ========== FOUNDER REGISTRATION ========== */
    if (!companyId) {
      assignedRole = ALLOWED_ROLES.includes(role) ? role : "Founder";
      finalCompanyId = null;
    }

    /* ========== SUB USER REGISTRATION ========== */
    if (companyId) {
      const founder = await Hr.findById(companyId);

      if (!founder) {
        return res.status(404).json({ message: "Company founder not found" });
      }

      if (founder.role !== "Founder") {
        return res.status(400).json({ message: "Invalid company structure" });
      }

      const requestedRole = ALLOWED_ROLES.includes(role) ? role : "Recruiter";

      if (requestedRole === "Founder") {
        return res.status(400).json({ message: "Sub user cannot be Founder" });
      }

      assignedRole = requestedRole;
      finalCompanyId = founder._id;
    }

    const hr = await Hr.create({
      ...rest,
      email,
      password: hashedPassword,
      role: assignedRole,
      companyId: finalCompanyId,
      emailVerified: true,
      activityLog: [{ action: `${assignedRole} Account Created` }]
    });

    return res.status(201).json({
      _id: hr._id,
      email: hr.email,
      role: hr.role,
      companyId: hr.companyId,
      token: generateToken(hr._id, "HR")
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   LOGIN
===================================================== */
export const loginHr = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    email = email.trim().toLowerCase();

    const hr = await Hr.findOne({ email });
    if (!hr) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, hr.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      _id: hr._id,
      email: hr.email,
      role: hr.role,
      companyId: hr.companyId,
      token: generateToken(hr._id, "HR")
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   CREATE SUB USER (Founder Only)
===================================================== */
export const createSubUser = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!["HR Manager", "Recruiter", "Hiring Manager", "Viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role type" });
    }

    const exists = await Hr.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const subUser = await Hr.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      companyId: req.user._id,
      companyName: req.user.companyName,
      emailVerified: true,
      activityLog: [{ action: `${role} Account Created by Founder` }]
    });

    res.status(201).json({
      message: "Sub user created successfully",
      user: {
        _id: subUser._id,
        email: subUser.email,
        role: subUser.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   GET COMPANY TEAM
===================================================== */
export const getCompanyTeam = async (req, res) => {
  try {
    const companyOwner = req.user.companyId || req.user._id;

    const team = await Hr.find({
      $or: [
        { _id: companyOwner },
        { companyId: companyOwner }
      ]
    }).select("-password");

    res.json(team);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   APPROVE ACCESS REQUEST (Future Enterprise)
===================================================== */
export const approveAccessRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Hr.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    ensureActivityLog(user);
    user.activityLog.push({
      action: "Access Approved by Founder"
    });

    await user.save();

    res.json({ message: "Access approved successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   GET PROFILE
===================================================== */
export const getHrProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const hr = await Hr.findById(userId).select("-password");

    if (!hr) {
      return res.status(404).json({ message: "HR not found" });
    }

    return res.json(hr);

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   UPDATE PROFILE
===================================================== */
export const updateHrProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const updates = { ...req.body };

    delete updates.email;
    delete updates.password;
    delete updates._id;
    delete updates.role;
    delete updates.companyId;

    const hr = await Hr.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    ).select("-password");

    if (!hr) {
      return res.status(404).json({ message: "HR not found" });
    }

    ensureActivityLog(hr);
    hr.activityLog.push({ action: "Profile Updated" });
    await hr.save();

    return res.json({
      message: "Profile updated successfully",
      hr
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   UPLOAD PROFILE IMAGE
===================================================== */
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const userId = req.userId || req.user?._id;
    const hr = await Hr.findById(userId);
    if (!hr) {
      return res.status(404).json({ message: "HR not found" });
    }

    hr.profileImage = req.file.path;
    ensureActivityLog(hr);
    hr.activityLog.push({ action: "Profile Image Updated" });

    await hr.save();

    res.json({
      message: "Profile image updated",
      profileImage: hr.profileImage
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   UPLOAD COMPANY LOGO
===================================================== */
export const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Logo required" });
    }

    const userId = req.userId || req.user?._id;
    const hr = await Hr.findById(userId);
    if (!hr) {
      return res.status(404).json({ message: "HR not found" });
    }

    hr.companyLogo = req.file.path;
    ensureActivityLog(hr);
    hr.activityLog.push({ action: "Company Logo Updated" });

    await hr.save();

    res.json({
      message: "Company logo updated",
      companyLogo: hr.companyLogo
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   CHANGE PASSWORD
===================================================== */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const userId = req.userId || req.user?._id;
    const hr = await Hr.findById(userId);
    if (!hr) {
      return res.status(404).json({ message: "HR not found" });
    }

    const match = await bcrypt.compare(currentPassword, hr.password);
    if (!match) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    hr.password = await bcrypt.hash(newPassword, 10);
    ensureActivityLog(hr);
    hr.activityLog.push({ action: "Password Changed" });

    await hr.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
