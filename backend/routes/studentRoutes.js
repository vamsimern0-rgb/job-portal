import express from "express";
import multer from "multer";
import mongoose from "mongoose";

import {
  registerStudent,
  loginStudent,
  logoutStudent
} from "../controllers/studentAuthController.js";
import {
  sendStudentResetOtp,
  verifyStudentResetOtp,
  resetStudentPassword
} from "../controllers/studentPasswordController.js";

import {
  getDashboardData
} from "../controllers/studentDashboardController.js";

import {
  getStudentAnalytics
} from "../controllers/studentAnalyticsController.js";

import {
  updateProfile,
  uploadResume,
  uploadProfileImage
} from "../controllers/studentProfileController.js";

import { protectStudent } from "../middleware/authMiddleware.js";

import Candidate from "../models/Candidate.js";
import Student from "../models/Student.js";
import Job from "../models/Job.js";
import Hr from "../models/Hr.js";
import JobSkillVector from "../models/JobSkillVector.js";
import StudentSkillVector from "../models/StudentSkillVector.js";
import Notification from "../models/Notification.js";
import cosineSimilarity from "../ai/cosineSimilarity.js";
import { uploadImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

const emitCompanyUpdate = (req, companyId, payload = {}) => {
  const socketServer = req.app.get("io");
  if (!socketServer || !companyId) return;

  const room = companyId.toString();
  socketServer.to(room).emit("pipelineUpdated", payload);
  socketServer.to(room).emit("dashboardUpdate", payload);
};

/* ================= AUTH ================= */

router.post("/register", registerStudent);
router.post("/login", loginStudent);
router.post("/logout", protectStudent, logoutStudent);
router.post("/forgot-password", sendStudentResetOtp);
router.post("/verify-reset-otp", verifyStudentResetOtp);
router.post("/reset-password", resetStudentPassword);


/* ================= DASHBOARD ================= */

router.get("/dashboard", protectStudent, getDashboardData);


/* ================= ANALYTICS ================= */

router.get("/analytics", protectStudent, getStudentAnalytics);


/* ================= APPLICATIONS ================= */

router.get("/applications", protectStudent, async (req, res) => {
  try {
    const {
      status = "",
      q = "",
      sort = "latest",
      page = 1,
      limit = 10
    } = req.query;

    const numericPage = Math.max(Number(page) || 1, 1);
    const numericLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (numericPage - 1) * numericLimit;
    const allowedStatuses = ["Applied", "Shortlisted", "Interview", "Hired", "Rejected"];
    const allowedSorts = ["latest", "oldest", "match", "status"];

    const filter = {
      studentId: req.user._id
    };

    if (status && status !== "All") {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = status;
    }

    if (q?.trim()) {
      const regex = new RegExp(q.trim(), "i");
      const matchedJobs = await Job.find({ title: regex }).select("_id");
      const matchedJobIds = matchedJobs.map((job) => job._id);
      if (matchedJobIds.length === 0) {
        return res.json({
          items: [],
          page: numericPage,
          limit: numericLimit,
          total: 0,
          totalPages: 0
        });
      }
      filter.appliedJob = { $in: matchedJobIds };
    }

    const sortKey = allowedSorts.includes(sort) ? sort : "latest";
    const sortQuery =
      sortKey === "oldest"
        ? { createdAt: 1 }
        : sortKey === "match"
        ? { matchScore: -1, createdAt: -1 }
        : sortKey === "status"
        ? { status: 1, createdAt: -1 }
        : { createdAt: -1 };

    const applications = await Candidate.find({
      ...filter
    })
      .populate({
        path: "appliedJob",
        select: "title department location salaryRange status remoteType employmentType priority"
      })
      .sort(sortQuery)
      .skip(skip)
      .limit(numericLimit);

    const total = await Candidate.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / numericLimit), 1);

    res.json({
      items: applications,
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages
    });

  } catch (err) {

    console.error("Student Applications Error:", err);

    res.status(500).json({
      message: "Failed to fetch applications"
    });

  }
});

router.get("/applications/:id", protectStudent, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const application = await Candidate.findOne({
      _id: req.params.id,
      studentId: req.user._id
    }).populate({
      path: "appliedJob",
      select:
        "title department description requiredSkills preferredSkills location remoteType employmentType priority"
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    console.error("Student application detail error:", err);
    res.status(500).json({ message: "Failed to load application details" });
  }
});

router.delete("/applications/:id", protectStudent, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const application = await Candidate.findOne({
      _id: req.params.id,
      studentId: req.user._id
    }).populate("appliedJob", "title createdBy");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (["Hired", "Rejected"].includes(application.status)) {
      return res.status(400).json({ message: "This application can no longer be withdrawn" });
    }

    application.status = "Rejected";
    application.interviewDate = null;
    application.interviewMode = "";
    application.interviewNotes = "";
    application.googleMeetLink = "";
    application.zoomLink = "";
    if (!Array.isArray(application.activityLog)) {
      application.activityLog = [];
    }
    application.activityLog.push({
      action: "Application withdrawn by student",
      note: "Candidate withdrew from the hiring process"
    });
    await application.save();

    const studentNotification = await Notification.create({
      companyId: application.appliedJob?.createdBy || null,
      recipientStudent: req.user._id,
      recipientType: "Student",
      text: `You withdrew your application for "${application.appliedJob?.title || "the selected job"}".`,
      channel: "System",
      metadata: {
        candidateId: application._id,
        jobId: application.appliedJob?._id,
        status: application.status
      }
    });

    const hrRecipients = await Hr.find({
      $or: [
        { _id: application.appliedJob?.createdBy },
        { companyId: application.appliedJob?.createdBy }
      ]
    }).select("_id");

    let hrNotifications = [];
    if (hrRecipients.length > 0) {
      hrNotifications = await Notification.insertMany(
        hrRecipients.map((hrUser) => ({
          companyId: application.appliedJob?.createdBy || null,
          recipient: hrUser._id,
          recipientType: "HR",
          text: `${req.user.fullName || "A student"} withdrew application for ${application.appliedJob?.title || "a job"}.`,
          roleTarget: "All",
          channel: "System",
          metadata: {
            candidateId: application._id,
            jobId: application.appliedJob?._id,
            status: application.status
          }
        }))
      );
    }

    const socketServer = req.app.get("io");
    if (socketServer) {
      hrNotifications.forEach((notification) => {
        socketServer.to(notification.recipient.toString()).emit("newNotification", notification);
      });
      socketServer.to(req.user._id.toString()).emit("studentNotification", studentNotification);
      socketServer.to(req.user._id.toString()).emit("applicationUpdate", application);
    }

    emitCompanyUpdate(req, application.appliedJob?.createdBy, {
      type: "application_withdrawn",
      candidateId: application._id,
      jobId: application.appliedJob?._id,
      status: application.status
    });

    return res.json({
      message: "Application withdrawn successfully",
      application
    });
  } catch (err) {
    console.error("Withdraw application error:", err);
    return res.status(500).json({ message: "Failed to withdraw application" });
  }
});

router.put("/applications/:id/offer-response", protectStudent, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const decision = String(req.body?.decision || "").trim().toLowerCase();
    if (!["accept", "decline"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be accept or decline" });
    }

    const application = await Candidate.findOne({
      _id: req.params.id,
      studentId: req.user._id
    }).populate("appliedJob", "title createdBy");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if ((application.offer?.status || "NotSent") !== "Sent") {
      return res.status(400).json({ message: "No pending offer available for this application" });
    }

    if (!Array.isArray(application.activityLog)) {
      application.activityLog = [];
    }

    application.offer.status = decision === "accept" ? "Accepted" : "Declined";
    application.offer.respondedAt = new Date();
    application.offer.responseNote = String(req.body?.note || "").trim();

    if (decision === "decline") {
      application.status = "Rejected";
    }

    application.activityLog.push({
      action: decision === "accept" ? "Offer Accepted by student" : "Offer Declined by student",
      note: application.offer.responseNote || ""
    });

    await application.save();

    const studentNotification = await Notification.create({
      companyId: application.appliedJob?.createdBy || null,
      recipientStudent: req.user._id,
      recipientType: "Student",
      text: decision === "accept"
        ? `You accepted the offer for "${application.appliedJob?.title || "the selected job"}".`
        : `You declined the offer for "${application.appliedJob?.title || "the selected job"}".`,
      channel: "System",
      metadata: {
        candidateId: application._id,
        jobId: application.appliedJob?._id,
        status: application.status,
        offerStatus: application.offer.status
      }
    });

    const hrRecipients = await Hr.find({
      $or: [
        { _id: application.appliedJob?.createdBy },
        { companyId: application.appliedJob?.createdBy }
      ]
    }).select("_id");

    const hrNotifications =
      hrRecipients.length > 0
        ? await Notification.insertMany(
            hrRecipients.map((hrUser) => ({
              companyId: application.appliedJob?.createdBy || null,
              recipient: hrUser._id,
              recipientType: "HR",
              text: `${req.user.fullName || "A student"} ${decision === "accept" ? "accepted" : "declined"} the offer for ${application.appliedJob?.title || "a job"}.`,
              roleTarget: "All",
              channel: "System",
              metadata: {
                candidateId: application._id,
                jobId: application.appliedJob?._id,
                status: application.status,
                offerStatus: application.offer.status
              }
            }))
          )
        : [];

    const socketServer = req.app.get("io");
    if (socketServer) {
      hrNotifications.forEach((notification) => {
        socketServer.to(notification.recipient.toString()).emit("newNotification", notification);
      });
      socketServer.to(req.user._id.toString()).emit("studentNotification", studentNotification);
      socketServer.to(req.user._id.toString()).emit("applicationUpdate", application);
    }

    emitCompanyUpdate(req, application.appliedJob?.createdBy, {
      type: decision === "accept" ? "offer_accepted" : "offer_declined",
      candidateId: application._id,
      jobId: application.appliedJob?._id,
      offerStatus: application.offer.status,
      status: application.status
    });

    return res.json({
      message: decision === "accept" ? "Offer accepted successfully" : "Offer declined successfully",
      application
    });
  } catch (err) {
    console.error("Offer response error:", err);
    return res.status(500).json({ message: "Failed to submit offer response" });
  }
});

router.get("/interviews", protectStudent, async (req, res) => {
  try {
    const {
      type = "upcoming",
      mode = "",
      q = "",
      sort = "date",
      page = 1,
      limit = 10
    } = req.query;

    const allowedTypes = ["upcoming", "past", "all"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid interview type" });
    }

    const allowedModes = ["Online", "Onsite", "Phone"];
    if (mode && mode !== "All" && !allowedModes.includes(mode)) {
      return res.status(400).json({ message: "Invalid interview mode" });
    }

    const allowedSorts = ["date", "latest", "oldest"];
    const sortKey = allowedSorts.includes(sort) ? sort : "date";

    const numericPage = Math.max(Number(page) || 1, 1);
    const numericLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (numericPage - 1) * numericLimit;

    const now = new Date();
    const filter = {
      studentId: req.user._id,
      interviewDate: { $ne: null }
    };

    if (type === "upcoming") {
      filter.interviewDate.$gte = now;
    } else if (type === "past") {
      filter.interviewDate.$lt = now;
    }

    if (mode && mode !== "All") {
      filter.interviewMode = mode;
    }

    if (q?.trim()) {
      const regex = new RegExp(q.trim(), "i");
      const matchedJobs = await Job.find({ title: regex }).select("_id");
      const matchedJobIds = matchedJobs.map((job) => job._id);
      if (matchedJobIds.length === 0) {
        return res.json({
          items: [],
          page: numericPage,
          limit: numericLimit,
          total: 0,
          totalPages: 0
        });
      }
      filter.appliedJob = { $in: matchedJobIds };
    }

    const sortQuery =
      sortKey === "latest"
        ? { createdAt: -1 }
        : sortKey === "oldest"
        ? { createdAt: 1 }
        : { interviewDate: type === "past" ? -1 : 1 };

    const interviews = await Candidate.find(filter)
      .populate("appliedJob", "title location remoteType employmentType")
      .sort(sortQuery)
      .skip(skip)
      .limit(numericLimit);

    const nowTs = Date.now();
    const interviewsWithAccessControl = interviews.map((item) => {
      const interview = item.toObject();
      const interviewTime = interview.interviewDate ? new Date(interview.interviewDate).getTime() : null;
      const isWithinOneHour =
        interviewTime !== null
          ? interviewTime - nowTs <= 60 * 60 * 1000
          : false;

      if (interview.zoomLink && !isWithinOneHour) {
        return {
          ...interview,
          zoomLink: "",
          zoomLinkLocked: true,
          zoomLinkMessage: "Zoom link will be shared before 1 hour of interview."
        };
      }

      return {
        ...interview,
        zoomLinkLocked: false,
        zoomLinkMessage: ""
      };
    });

    const total = await Candidate.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / numericLimit), 1);

    res.json({
      items: interviewsWithAccessControl,
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages
    });
  } catch (err) {
    console.error("Student interviews fetch error:", err);
    res.status(500).json({ message: "Failed to fetch interviews" });
  }
});

/* ================= SAVED JOBS ================= */

router.get("/saved-jobs", protectStudent, async (req, res) => {
  try {
    const {
      q = "",
      status = "",
      remoteType = "",
      employmentType = "",
      sort = "latest",
      page,
      limit
    } = req.query;

    const student = await Student.findById(req.user._id).select("savedJobs");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const savedIds = student.savedJobs || [];
    if (savedIds.length === 0) {
      return res.json([]);
    }

    const filter = {
      _id: { $in: savedIds }
    };

    if (status && status !== "All") {
      filter.status = status;
    }
    if (remoteType && remoteType !== "All") {
      filter.remoteType = remoteType;
    }
    if (employmentType && employmentType !== "All") {
      filter.employmentType = employmentType;
    }

    if (q?.trim()) {
      const search = q.trim();
      const regex = new RegExp(search, "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { requiredSkills: regex },
        { preferredSkills: regex }
      ];
    }

    const sortQuery = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const shouldPaginate = page !== undefined || limit !== undefined;
    const numericLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const numericPage = Math.max(Number(page) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    let query = Job.find(filter).sort(sortQuery);
    if (shouldPaginate) {
      query = query.skip(skip).limit(numericLimit);
    }

    const jobs = await query.lean();

    const appliedCandidates = await Candidate.find({
      studentId: req.user._id,
      appliedJob: { $in: jobs.map((job) => job._id) }
    }).select("appliedJob");

    const appliedJobSet = new Set(
      appliedCandidates.map((candidate) => candidate.appliedJob.toString())
    );

    const enrichedJobs = jobs.map((job) => ({
      ...job,
      hasApplied: appliedJobSet.has(job._id.toString())
    }));

    if (shouldPaginate) {
      const total = await Job.countDocuments(filter);
      return res.json({
        items: enrichedJobs,
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.max(Math.ceil(total / numericLimit), 1)
      });
    }

    res.json(enrichedJobs);
  } catch (err) {
    console.error("Saved jobs fetch error:", err);
    res.status(500).json({ message: "Failed to fetch saved jobs" });
  }
});

router.post("/saved-jobs/:jobId", protectStudent, async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job id" });
    }

    const student = await Student.findById(req.user._id).select("_id");
    const job = await Job.findById(jobId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const updateResult = await Student.updateOne(
      { _id: student._id },
      { $addToSet: { savedJobs: job._id } }
    );

    const alreadySaved = updateResult.modifiedCount === 0;
    res.json({
      message: alreadySaved ? "Job already saved" : "Job saved successfully",
      saved: true,
      alreadySaved
    });
  } catch (err) {
    console.error("Save job error:", err);
    res.status(500).json({ message: "Failed to save job" });
  }
});

router.delete("/saved-jobs/:jobId", protectStudent, async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job id" });
    }

    const student = await Student.findById(req.user._id).select("_id");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updateResult = await Student.updateOne(
      { _id: student._id },
      { $pull: { savedJobs: new mongoose.Types.ObjectId(jobId) } }
    );

    res.json({
      message: "Saved job removed",
      removed: updateResult.modifiedCount > 0
    });
  } catch (err) {
    console.error("Remove saved job error:", err);
    res.status(500).json({ message: "Failed to remove saved job" });
  }
});

/* ================= STUDENT NOTIFICATIONS ================= */

router.get("/notifications", protectStudent, async (req, res) => {
  try {
    const {
      page,
      limit,
      unreadOnly = "false"
    } = req.query;

    const filter = {
      recipientStudent: req.user._id,
      recipientType: "Student"
    };

    if (unreadOnly === "true") {
      filter.read = false;
    }

    const shouldPaginate = page !== undefined || limit !== undefined;
    const numericLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const numericPage = Math.max(Number(page) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    let query = Notification.find(filter).sort({ createdAt: -1 });
    if (shouldPaginate) {
      query = query.skip(skip).limit(numericLimit);
    }

    const notifications = await query;

    if (shouldPaginate) {
      const [total, unreadCount] = await Promise.all([
        Notification.countDocuments(filter),
        Notification.countDocuments({
          recipientStudent: req.user._id,
          recipientType: "Student",
          read: false
        })
      ]);

      return res.json({
        items: notifications,
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.max(Math.ceil(total / numericLimit), 1),
        unreadCount
      });
    }

    res.json(notifications);
  } catch (err) {
    console.error("Student notifications fetch error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.put("/notifications/:id/read", protectStudent, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientStudent: req.user._id,
      recipientType: "Student"
    });

    if (!notification) {
      return res.status(404).json({ message: "Not found" });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (err) {
    console.error("Student notification update error:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

router.put("/notifications/read-all", protectStudent, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipientStudent: req.user._id,
        recipientType: "Student",
        read: false
      },
      { $set: { read: true } }
    );

    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount || 0
    });
  } catch (err) {
    console.error("Student read-all notifications error:", err);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});


/* ================= APPLY JOB ================= */

router.post("/apply", protectStudent, async (req, res) => {
  try {
    const { jobId, screeningAnswers = [] } = req.body;
    let createdCandidate = null;
    let createdStudentNotification = null;
    let createdHrNotifications = [];
    let studentForSocket = null;
    let jobForSocket = null;

    const runApplyFlow = async (session) => {
      const withSession = (query) => (session ? query.session(session) : query);

      const student = await withSession(Student.findById(req.user._id));

      if (!student) {
        const notFound = new Error("Student not found");
        notFound.statusCode = 404;
        throw notFound;
      }

      const job = await withSession(Job.findById(jobId));

      if (!job) {
        const notFound = new Error("Job not found");
        notFound.statusCode = 404;
        throw notFound;
      }

      if (job.status !== "Open") {
        const closed = new Error("Job is not open for applications");
        closed.statusCode = 400;
        throw closed;
      }

      const existing = await withSession(
        Candidate.findOne({
          studentId: student._id,
          appliedJob: job._id
        }).select("_id")
      );

      if (existing) {
        const duplicate = new Error("Already applied to this job");
        duplicate.statusCode = 400;
        throw duplicate;
      }

      const normalizedStudentSkills = (student.skills || []).map(
        (skill) => skill.toLowerCase().trim()
      );
      const normalizedRequiredSkills = (job.requiredSkills || []).map(
        (skill) => skill.toLowerCase().trim()
      );
      const normalizedPreferredSkills = (job.preferredSkills || []).map(
        (skill) => skill.toLowerCase().trim()
      );

      const requiredMatched = normalizedRequiredSkills.filter((skill) =>
        normalizedStudentSkills.includes(skill)
      );
      const preferredMatched = normalizedPreferredSkills.filter((skill) =>
        normalizedStudentSkills.includes(skill)
      );

      const requiredSkillCoverage =
        normalizedRequiredSkills.length > 0
          ? requiredMatched.length / normalizedRequiredSkills.length
          : 1;

      const preferredSkillCoverage =
        normalizedPreferredSkills.length > 0
          ? preferredMatched.length / normalizedPreferredSkills.length
          : 1;

      const experienceScore =
        Number(job.experienceRequired || 0) <= 0
          ? 1
          : Math.min(1, Number(student.experience || 0) / Number(job.experienceRequired));

      const resumeScoreNormalized =
        Math.min(1, Number(student.resumeScore || 0) / 100);

      const finalScore = (
        (requiredSkillCoverage * 0.55) +
        (preferredSkillCoverage * 0.15) +
        (experienceScore * 0.2) +
        (resumeScoreNormalized * 0.1)
      );

      const createdCandidates = await Candidate.create([{
        studentId: student._id,
        name: student.fullName,
        email: student.email,
        appliedJob: job._id,
        skills: student.skills,
        experience: student.experience,
        resumeUrl: student.resumeUrl,
        resumeText: student.resumeText,
        matchScore: Math.round(finalScore * 100),
        screeningAnswers,
        studentProfileSnapshot: {
          fullName: student.fullName,
          skills: student.skills || [],
          experience: student.experience || 0
        },
        scoreBreakdown: {
          requiredSkillCoverage: Number(requiredSkillCoverage.toFixed(2)),
          preferredSkillCoverage: Number(preferredSkillCoverage.toFixed(2)),
          experienceScore: Number(experienceScore.toFixed(2)),
          resumeScore: Number(resumeScoreNormalized.toFixed(2))
        },
        activityLog: [
          {
            action: "Applied via Student Portal",
            note: `Match score ${Math.round(finalScore * 100)}%`
          }
        ]
      }], session ? { session } : {});

      const candidate = createdCandidates[0];

      student.appliedJobs = [...(student.appliedJobs || []), candidate._id];
      student.totalApplications = Number(student.totalApplications || 0) + 1;
      await student.save(session ? { session } : {});

      job.applicantsCount += 1;
      await job.save(session ? { session } : {});

      const studentNotifications = await Notification.create([{
        companyId: job.createdBy,
        recipientStudent: student._id,
        recipientType: "Student",
        text: `Application submitted for "${job.title}"`,
        channel: "System",
        metadata: {
          jobId: job._id,
          candidateId: candidate._id
        }
      }], session ? { session } : {});

      const hrRecipients = await withSession(
        Hr.find({
          $or: [{ _id: job.createdBy }, { companyId: job.createdBy }]
        }).select("_id")
      );

      let hrNotifications = [];
      if (hrRecipients.length > 0) {
        hrNotifications = await Notification.insertMany(
          hrRecipients.map((hrUser) => ({
            companyId: job.createdBy,
            recipient: hrUser._id,
            recipientType: "HR",
            text: `${student.fullName} applied for ${job.title}`,
            roleTarget: "All",
            channel: "System",
            metadata: {
              jobId: job._id,
              candidateId: candidate._id
            }
          })),
          session ? { session } : {}
        );
      }

      createdCandidate = candidate;
      createdStudentNotification = studentNotifications[0];
      createdHrNotifications = hrNotifications;
      studentForSocket = student;
      jobForSocket = job;
    };

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runApplyFlow(session);
      });
    } finally {
      await session.endSession();
    }

    const socketServer = req.app.get("io");
    if (socketServer && studentForSocket && createdStudentNotification && createdCandidate) {
      createdHrNotifications.forEach((notification) => {
        socketServer.to(notification.recipient.toString()).emit("newNotification", notification);
      });

      socketServer
        .to(studentForSocket._id.toString())
        .emit("studentNotification", createdStudentNotification);
      socketServer
        .to(studentForSocket._id.toString())
        .emit("applicationUpdate", createdCandidate);
    }

    if (jobForSocket && createdCandidate) {
      emitCompanyUpdate(req, jobForSocket.createdBy, {
        type: "new_application",
        candidateId: createdCandidate._id,
        jobId: jobForSocket._id
      });
    }

    res.status(201).json(createdCandidate);

  } catch (err) {
    console.error("Apply Error:", err);
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err?.code === 11000 && err?.keyPattern?.studentId && err?.keyPattern?.appliedJob) {
      return res.status(400).json({ message: "Already applied to this job" });
    }
    res.status(500).json({
      message: "Application failed"
    });

  }
});


/* ================= PROFILE ================= */

router.get("/profile", protectStudent, async (req, res) => {
  try {

    const student = await Student
      .findById(req.user._id)
      .select("-password");

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    res.json(student);

  } catch (err) {

    console.error("Profile fetch error:", err);

    res.status(500).json({
      message: "Failed to fetch profile"
    });

  }
});

router.put("/profile", protectStudent, updateProfile);
router.put(
  "/profile/upload-image",
  protectStudent,
  uploadImage.single("image"),
  uploadProfileImage
);


/* ================= RESUME UPLOAD ================= */

const upload = multer({
  storage: multer.memoryStorage()
});

const cleanInput = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

const listToBullets = (value = "") =>
  cleanInput(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");

const buildResumePrompt = ({
  fullName,
  targetRole,
  professionalSummary,
  skills,
  projects,
  education,
  experience
}) => `
You are an expert resume writer.
Create a strong ATS-friendly one-page resume in plain text with sections in this order:
NAME
TARGET ROLE
PROFESSIONAL SUMMARY
SKILLS
PROJECTS
EDUCATION
EXPERIENCE

Rules:
- Keep it concise, readable, and impactful.
- Use bullet points for skills, projects, experience.
- Improve grammar, clarity, and action-oriented wording.
- Expand terse inputs into professional statements without inventing false claims.
- Add measurable impact language where possible (optimized, improved, reduced time, etc.).
- Keep each bullet to one line.
- Professional Summary should be 3-4 lines.
- Do not invent fake companies or achievements.
- Use only given information.
- Return only the final resume text. Do not include notes or explanations.

Candidate data:
Name: ${cleanInput(fullName)}
Target Role: ${cleanInput(targetRole)}
Professional Summary: ${cleanInput(professionalSummary)}
Skills: ${cleanInput(skills)}
Projects: ${cleanInput(projects)}
Education: ${cleanInput(education)}
Experience: ${cleanInput(experience)}
`;

const normalizeResumeOutput = (value = "") =>
  String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

const extractModelText = (data) => {
  if (Array.isArray(data)) {
    return (
      data[0]?.generated_text ||
      data[0]?.summary_text ||
      data[0]?.translation_text ||
      ""
    );
  }

  return data?.generated_text || data?.summary_text || data?.translation_text || "";
};

const stripPromptEcho = (text = "") => {
  const markers = [
    "NAME",
    "TARGET ROLE",
    "PROFESSIONAL SUMMARY",
    "SKILLS",
    "PROJECTS",
    "EDUCATION",
    "EXPERIENCE"
  ];

  const upperText = text.toUpperCase();
  let startIndex = -1;

  for (const marker of markers) {
    const idx = upperText.indexOf(marker);
    if (idx >= 0 && (startIndex === -1 || idx < startIndex)) {
      startIndex = idx;
    }
  }

  if (startIndex > 0) {
    return text.slice(startIndex).trim();
  }

  return text.trim();
};

const buildFallbackResume = ({
  fullName,
  targetRole,
  professionalSummary,
  skills,
  projects,
  education,
  experience
}) => {
  const safeName = cleanInput(fullName) || "Student Name";
  const safeRole = cleanInput(targetRole) || "Target Role";
  const safeSummary =
    cleanInput(professionalSummary) ||
    "Motivated student focused on building practical projects and contributing to high-impact teams.";
  const safeSkills = listToBullets(skills) || "- Add key skills here";
  const safeProjects = listToBullets(projects) || "- Add project highlights here";
  const safeEducation = cleanInput(education) || "Add education details here";
  const safeExperience = listToBullets(experience) || "- Add internships or practical experience here";

  return `${safeName}
${safeRole}

PROFESSIONAL SUMMARY
${safeSummary}

SKILLS
${safeSkills}

PROJECTS
${safeProjects}

EDUCATION
${safeEducation}

EXPERIENCE
${safeExperience}
`;
};

const DEFAULT_RESUME_MODELS = [
  "google/flan-t5-large",
  "HuggingFaceH4/zephyr-7b-beta",
  "mistralai/Mistral-7B-Instruct-v0.2"
];

const getResumeModelChain = () => {
  const configured = (process.env.HF_MODEL || "").trim();
  const combined = configured
    ? [configured, ...DEFAULT_RESUME_MODELS]
    : [...DEFAULT_RESUME_MODELS];

  return [...new Set(combined)];
};

const requestResumeFromModel = async ({ model, prompt, hfToken }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {})
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 700,
            min_new_tokens: 280,
            temperature: 0.75,
            top_p: 0.92,
            repetition_penalty: 1.12,
            return_full_text: false
          }
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`HF request failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = extractModelText(data);
    const cleaned = normalizeResumeOutput(stripPromptEcho(generatedText || ""));
    const hasCoreSections =
      cleaned.includes("PROFESSIONAL SUMMARY") &&
      cleaned.includes("SKILLS") &&
      cleaned.includes("EXPERIENCE");

    if (!cleaned || cleaned.length < 220 || !hasCoreSections) {
      throw new Error("LLM output too short");
    }

    return cleaned;
  } finally {
    clearTimeout(timeout);
  }
};

const generateResumeWithFreeLLM = async (payload) => {
  const hfToken = process.env.HF_API_KEY || "";
  const prompt = buildResumePrompt(payload);
  const models = getResumeModelChain();
  const errors = [];

  for (const model of models) {
    try {
      const resume = await requestResumeFromModel({ model, prompt, hfToken });
      return {
        resume,
        model
      };
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
    }
  }

  throw new Error(errors.join(" | "));
};

router.post(
  "/upload-resume",
  protectStudent,
  upload.single("resume"),
  uploadResume
);

router.post("/resume-builder", protectStudent, async (req, res) => {
  try {
    const {
      fullName = "",
      targetRole = "",
      professionalSummary = "",
      skills = "",
      projects = "",
      education = "",
      experience = ""
    } = req.body || {};

    if (!cleanInput(fullName) || !cleanInput(targetRole)) {
      return res.status(400).json({
        message: "fullName and targetRole are required"
      });
    }

    const payload = {
      fullName,
      targetRole,
      professionalSummary,
      skills,
      projects,
      education,
      experience
    };

    try {
      const llmResult = await generateResumeWithFreeLLM(payload);
      return res.json({
        resume: llmResult.resume,
        source: "llm",
        model: llmResult.model
      });
    } catch (llmErr) {
      console.error("Free LLM resume generation failed:", llmErr.message);
      return res.json({
        resume: buildFallbackResume(payload),
        source: "template",
        model: null
      });
    }
  } catch (err) {
    console.error("Resume builder error:", err);
    res.status(500).json({
      message: "Failed to generate resume"
    });
  }
});


/* ================= AI MATCHED JOBS ================= */

router.get("/jobs", protectStudent, async (req, res) => {
  try {
    const {
      q,
      remoteType,
      employmentType,
      minMatchScore,
      sort = "match",
      limit
    } = req.query;

    const student = await Student.findById(req.user._id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentVector = await StudentSkillVector.findOne({
      studentId: student._id
    });

    const jobs = await Job.find({
      status: "Open"
    }).sort({ createdAt: -1 });

    const jobVectors = await JobSkillVector.find({
      jobId: { $in: jobs.map((job) => job._id) }
    });

    const enrichedJobs = jobs.map((job) => {
      const vectorData = jobVectors.find(
        (vector) => vector.jobId.toString() === job._id.toString()
      );

      let cosineScore = 0;
      let requiredSkillCoverage = 0;
      let experienceScore = 0;

      if (studentVector && vectorData) {
        cosineScore = cosineSimilarity(studentVector.vector, vectorData.vector);
      }

      const requiredSkills = job.requiredSkills || [];
      const studentSkills = student.skills || [];
      const normalizedStudentSkills = studentSkills.map((skill) =>
        skill.toLowerCase().trim()
      );

      const matchedRequired = requiredSkills.filter((skill) =>
        normalizedStudentSkills.includes(skill.toLowerCase().trim())
      );

      if (requiredSkills.length > 0) {
        requiredSkillCoverage = matchedRequired.length / requiredSkills.length;
      }

      if (student.experience >= job.experienceRequired) {
        experienceScore = 1;
      } else {
        experienceScore = student.experience / (job.experienceRequired || 1);
      }

      const finalScore =
        (0.6 * cosineScore) +
        (0.2 * experienceScore) +
        (0.1 * requiredSkillCoverage) +
        (0.1 * (student.resumeScore || 0) / 100);

      return {
        ...job.toObject(),
        matchScore: Math.round(finalScore * 100),
        isSaved: (student.savedJobs || []).some(
          (savedId) => savedId.toString() === job._id.toString()
        ),
        matchedRequiredSkills: matchedRequired,
        missingRequiredSkills: requiredSkills.filter(
          (skill) => !normalizedStudentSkills.includes(skill.toLowerCase().trim())
        )
      };
    });

    let rankedJobs = [...enrichedJobs];

    const preferredLocations =
      student.jobAlertSettings?.preferredLocations?.map((value) =>
        value.toLowerCase().trim()
      ) || [];
    const preferredEmploymentTypes =
      student.jobAlertSettings?.preferredEmploymentTypes || [];

    if (preferredLocations.length > 0) {
      rankedJobs = rankedJobs.filter((job) =>
        preferredLocations.some((location) =>
          (job.location || "").toLowerCase().includes(location)
        )
      );
    }

    if (preferredEmploymentTypes.length > 0) {
      rankedJobs = rankedJobs.filter((job) =>
        preferredEmploymentTypes.includes(job.employmentType)
      );
    }

    const threshold =
      minMatchScore !== undefined && minMatchScore !== ""
        ? Number(minMatchScore)
        : null;

    if (Number.isFinite(threshold) && threshold > 0) {
      rankedJobs = rankedJobs.filter((job) => (job.matchScore || 0) >= threshold);
    }

    if (q?.trim()) {
      const search = q.trim().toLowerCase();
      rankedJobs = rankedJobs.filter((job) =>
        [job.title, job.description, job.location, ...(job.requiredSkills || [])]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }

    if (remoteType && remoteType !== "All") {
      rankedJobs = rankedJobs.filter((job) => job.remoteType === remoteType);
    }

    if (employmentType && employmentType !== "All") {
      rankedJobs = rankedJobs.filter((job) => job.employmentType === employmentType);
    }

    if (sort === "latest") {
      rankedJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      rankedJobs.sort((a, b) => b.matchScore - a.matchScore);
    }

    const numericLimit = Math.min(Math.max(Number(limit) || 0, 0), 100);
    if (numericLimit > 0) {
      rankedJobs = rankedJobs.slice(0, numericLimit);
    }

    res.json(rankedJobs);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch jobs"
    });
  }
});

router.get("/jobs/:jobId", protectStudent, async (req, res) => {
  try {
    const { jobId } = req.params;
    const student = await Student.findById(req.user._id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    const job = await Job.findById(jobId);

    if (!job || job.status !== "Open") {
      return res.status(404).json({ message: "Job not found" });
    }

    const normalizedStudentSkills = (student.skills || []).map((skill) =>
      skill.toLowerCase().trim()
    );

    const requiredSkills = job.requiredSkills || [];
    const matchedRequiredSkills = requiredSkills.filter((skill) =>
      normalizedStudentSkills.includes(skill.toLowerCase().trim())
    );

    const missingRequiredSkills = requiredSkills.filter(
      (skill) => !normalizedStudentSkills.includes(skill.toLowerCase().trim())
    );

    const existingApplication = await Candidate.findOne({
      studentId: student._id,
      appliedJob: job._id
    }).select("_id status createdAt");

    res.json({
      ...job.toObject(),
      isSaved: (student.savedJobs || []).some(
        (savedId) => savedId.toString() === job._id.toString()
      ),
      matchedRequiredSkills,
      missingRequiredSkills,
      hasApplied: Boolean(existingApplication),
      application: existingApplication || null
    });
  } catch (err) {
    console.error("Student job detail fetch error:", err);
    res.status(500).json({ message: "Failed to fetch job details" });
  }
});

export default router;
