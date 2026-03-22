import mongoose from "mongoose";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import Student from "../models/Student.js";
import Notification from "../models/Notification.js";
import logger from "../utils/logger.js";
import * as recommendationEngine from "../ai/recommendationEngine.js";
import emailQueue from "../queues/emailQueue.js";

const CANDIDATE_STATUSES = ["Applied", "Shortlisted", "Interview", "Hired", "Rejected"];
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeLink = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const generateFallbackZoomLink = () => {
  const random = Math.floor(100000000 + Math.random() * 900000000);
  const tail = String(Date.now()).slice(-2);
  const meetingId = `${random}${tail}`.slice(0, 11);
  return `https://zoom.us/j/${meetingId}`;
};

const createZoomMeetingIfConfigured = async ({
  topic,
  agenda,
  startTime
}) => {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    return "";
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenResponse = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`
        }
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Zoom token failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      throw new Error("Zoom access token missing");
    }

    const meetingResponse = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        topic: topic || "Interview Meeting",
        type: 2,
        start_time: new Date(startTime).toISOString(),
        duration: 60,
        timezone: "Asia/Kolkata",
        agenda: agenda || "Interview",
        settings: {
          join_before_host: true,
          waiting_room: false
        }
      })
    });

    if (!meetingResponse.ok) {
      throw new Error(`Zoom meeting create failed: ${meetingResponse.status}`);
    }

    const meetingData = await meetingResponse.json();
    return normalizeLink(meetingData?.join_url || "");
  } catch (err) {
    logger.warn(`Zoom auto link generation failed: ${err.message}`);
    return "";
  }
};

const getAccessibleJobs = async (user) => {
  const companyOwner = user.companyId || user._id;

  if (["Founder", "HR Manager", "Hiring Manager", "Viewer"].includes(user.role)) {
    return Job.find({ createdBy: companyOwner }).select("_id createdBy assignedRecruiters title");
  }

  if (user.role === "Recruiter") {
    return Job.find({ assignedRecruiters: user._id }).select("_id createdBy assignedRecruiters title");
  }

  return [];
};

export const hasCandidateReadAccess = (user, job) => {
  if (!job || !user) return false;

  const companyOwner = user.companyId || user._id;

  if (["Founder", "HR Manager", "Hiring Manager", "Viewer"].includes(user.role)) {
    return job.createdBy.toString() === companyOwner.toString();
  }

  if (user.role === "Recruiter") {
    return (job.assignedRecruiters || []).some(
      (id) => id.toString() === user._id.toString()
    );
  }

  return false;
};

export const hasCandidateWriteAccess = (user, job) => {
  if (!job || !user) return false;

  const companyOwner = user.companyId || user._id;

  if (["Founder", "HR Manager", "Hiring Manager"].includes(user.role)) {
    return job.createdBy.toString() === companyOwner.toString();
  }

  if (user.role === "Recruiter") {
    return (job.assignedRecruiters || []).some(
      (id) => id.toString() === user._id.toString()
    );
  }

  return false;
};

const checkPermission = (req, job, accessLevel = "read") => {
  if (accessLevel === "write") {
    return hasCandidateWriteAccess(req.user, job);
  }

  return hasCandidateReadAccess(req.user, job);
};

const emitPipelineEvents = (req, companyId, payload = {}) => {
  const socketServer = req.app.get("io");
  if (!socketServer || !companyId) return;

  const room = companyId.toString();
  socketServer.to(room).emit("pipelineUpdated", payload);
  socketServer.to(room).emit("dashboardUpdate", payload);
  socketServer.to(room).emit("candidateUpdated", payload);
};

const notifyStudent = async (
  req,
  candidate,
  text,
  subject,
  html,
  metadata = {}
) => {
  if (!candidate.studentId) return;

  const socketServer = req.app.get("io");

  const notification = await Notification.create({
    companyId: candidate.appliedJob.createdBy,
    recipientStudent: candidate.studentId,
    recipientType: "Student",
    text,
    channel: "InApp",
    metadata: {
      candidateId: candidate._id,
      jobId: candidate.appliedJob._id,
      ...metadata
    }
  });

  if (socketServer) {
    socketServer.to(candidate.studentId.toString()).emit("studentNotification", notification);
    socketServer.to(candidate.studentId.toString()).emit("applicationUpdate", candidate);
  }

  const student = await Student.findById(candidate.studentId).select(
    "email communicationPreferences"
  );

  if (student?.communicationPreferences?.emailJobAlerts !== false && student?.email) {
    emailQueue.add({
      to: student.email,
      subject,
      html
    });
  }
};

const ensureOfferObject = (candidate) => {
  if (!candidate.offer || typeof candidate.offer !== "object") {
    candidate.offer = {};
  }

  if (!candidate.offer.status) {
    candidate.offer.status = "NotSent";
  }
};

export const getCandidates = async (req, res) => {
  try {
    const {
      status,
      interviews,
      jobId,
      minScore,
      q,
      hasNotes,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const jobs = await getAccessibleJobs(req.user);
    const jobIds = jobs.map((job) => job._id);

    if (jobIds.length === 0) {
      return res.json([]);
    }

    const filter = { appliedJob: { $in: jobIds } };

    if (jobId) {
      const hasAccess = jobIds.some((id) => id.toString() === jobId.toString());
      if (!hasAccess) {
        return res.status(403).json({ message: "Not allowed" });
      }
      filter.appliedJob = jobId;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (interviews === "true") {
      filter.interviewDate = { $ne: null };
    }

    if (interviews === "upcoming") {
      filter.interviewDate = { $ne: null, $gte: new Date() };
    }

    if (minScore !== undefined && minScore !== "") {
      filter.matchScore = { $gte: Math.max(Number(minScore) || 0, 0) };
    }

    if (hasNotes === "true") {
      filter["recruiterNotes.0"] = { $exists: true };
    }

    if (q?.trim()) {
      const regex = new RegExp(escapeRegex(q.trim()), "i");
      const matchedJobs = await Job.find({
        _id: { $in: jobIds },
        title: regex
      }).select("_id");

      filter.$or = [
        { name: regex },
        { email: regex },
        { status: regex },
        { skills: regex },
        ...(matchedJobs.length > 0
          ? [{ appliedJob: { $in: matchedJobs.map((job) => job._id) } }]
          : [])
      ];
    }

    const safeSort = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      matchScore: "matchScore",
      interviewDate: "interviewDate",
      name: "name"
    };

    const sortField = safeSort[sortBy] || "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const sortConfig = { [sortField]: sortDirection };
    if (sortField !== "createdAt") {
      sortConfig.createdAt = -1;
    }

    let query = Candidate.find(filter)
      .populate("appliedJob", "title location status priority remoteType experienceRequired")
      .populate(
        "studentId",
        "fullName email phone location skills experience linkedin github portfolio resumeUrl"
      )
      .sort(sortConfig);

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 0, 0), 100);

    if (limitNumber > 0) {
      query = query.skip((pageNumber - 1) * limitNumber).limit(limitNumber);
    }

    const candidates = await query;
    return res.json(candidates);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to fetch candidates" });
  }
};

export const getCandidateById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id)
      .populate(
        "appliedJob",
        "title department location status requiredSkills preferredSkills createdBy assignedRecruiters"
      )
      .populate(
        "studentId",
        "fullName email phone location skills experience education bio linkedin github portfolio resumeUrl resumeScore profileCompletion"
      );

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob);
    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to fetch candidate profile" });
  }
};

export const getUpcomingInterviews = async (req, res) => {
  try {
    const { includePast, from, to, jobId } = req.query;
    const jobs = await getAccessibleJobs(req.user);
    const jobIds = jobs.map((job) => job._id);

    if (jobIds.length === 0) {
      return res.json([]);
    }

    if (jobId) {
      const hasAccess = jobIds.some((id) => id.toString() === jobId.toString());
      if (!hasAccess) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    const interviewFilter = {
      appliedJob: jobId || { $in: jobIds },
      interviewDate: { $ne: null }
    };

    if (includePast !== "true") {
      interviewFilter.interviewDate.$gte = new Date();
    }

    if (from) {
      interviewFilter.interviewDate.$gte = new Date(from);
    }

    if (to) {
      interviewFilter.interviewDate.$lte = new Date(to);
    }

    const interviews = await Candidate.find(interviewFilter)
      .populate("appliedJob", "title location")
      .populate("studentId", "fullName email phone skills")
      .sort({ interviewDate: 1 });

    return res.json(interviews);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to fetch interviews" });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const nextStatus = req.body?.status;

    if (!CANDIDATE_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid candidate status" });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("appliedJob");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob, "write");

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    candidate.status = nextStatus;

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: `Status changed to ${nextStatus}`,
      note: req.body?.note || ""
    });

    await candidate.save();

    emitPipelineEvents(req, candidate.appliedJob.createdBy, {
      candidateId: candidate._id,
      type: "status",
      status: candidate.status
    });

    await notifyStudent(
      req,
      candidate,
      `Application update: ${candidate.appliedJob.title} - ${candidate.status}`,
      `Application Update: ${candidate.appliedJob.title}`,
      `
        <div style="font-family:Arial,sans-serif;">
          <h2>Your application has been updated</h2>
          <p><strong>Job:</strong> ${candidate.appliedJob.title}</p>
          <p><strong>New Status:</strong> ${candidate.status}</p>
        </div>
      `,
      { status: candidate.status }
    );

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Status update failed" });
  }
};

export const scheduleInterview = async (req, res) => {
  try {
    const {
      interviewDate,
      interviewMode,
      interviewNotes,
      googleMeetLink,
      zoomLink
    } = req.body;

    if (!interviewDate) {
      return res.status(400).json({ message: "Interview date is required" });
    }

    const parsedDate = new Date(interviewDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid interview date" });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("appliedJob");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob, "write");

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const wasScheduled = Boolean(candidate.interviewDate);

    candidate.interviewDate = parsedDate;
    candidate.interviewMode = interviewMode || "Online";
    candidate.interviewNotes = interviewNotes || "";
    candidate.googleMeetLink = normalizeLink(googleMeetLink);
    let resolvedZoomLink = normalizeLink(zoomLink);

    if (!resolvedZoomLink && candidate.interviewMode === "Online") {
      resolvedZoomLink =
        (await createZoomMeetingIfConfigured({
          topic: `Interview - ${candidate.name}`,
          agenda: candidate.appliedJob?.title || "Interview",
          startTime: parsedDate
        })) || generateFallbackZoomLink();
    }

    candidate.zoomLink = resolvedZoomLink;
    candidate.status = "Interview";
    candidate.reminder24hSentAt = null;
    candidate.reminder1hSentAt = null;

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: wasScheduled ? "Interview Rescheduled" : "Interview Scheduled",
      note: `Mode: ${candidate.interviewMode}${candidate.googleMeetLink ? " | Meet link added" : ""}${candidate.zoomLink ? " | Zoom link added" : ""}`
    });

    await candidate.save();

    emitPipelineEvents(req, candidate.appliedJob.createdBy, {
      candidateId: candidate._id,
      type: wasScheduled ? "interview_rescheduled" : "interview_scheduled",
      status: candidate.status,
      interviewDate: candidate.interviewDate
    });

    await notifyStudent(
      req,
      candidate,
      `Interview scheduled for ${candidate.appliedJob.title}`,
      `Interview Scheduled: ${candidate.appliedJob.title}`,
      `
        <div style="font-family:Arial,sans-serif;">
          <h2>Interview Scheduled</h2>
          <p><strong>Job:</strong> ${candidate.appliedJob.title}</p>
          <p><strong>Date:</strong> ${candidate.interviewDate?.toLocaleString() || "TBD"}</p>
          <p><strong>Mode:</strong> ${candidate.interviewMode || "TBD"}</p>
          <p><strong>Zoom:</strong> Zoom link will be shared 1 hour before interview.</p>
          ${candidate.googleMeetLink ? `<p><strong>Google Meet:</strong> <a href="${candidate.googleMeetLink}" target="_blank">${candidate.googleMeetLink}</a></p>` : ""}
        </div>
      `,
      {
        interviewDate: candidate.interviewDate,
        interviewMode: candidate.interviewMode,
        googleMeetLink: candidate.googleMeetLink || "",
        zoomLink: candidate.zoomLink || ""
      }
    );

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Interview scheduling failed" });
  }
};

export const cancelInterview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("appliedJob");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob, "write");

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!candidate.interviewDate) {
      return res.status(400).json({ message: "No interview scheduled for this candidate" });
    }

    const fallbackStatus =
      CANDIDATE_STATUSES.includes(req.body?.status) && req.body?.status !== "Interview"
        ? req.body.status
        : "Shortlisted";

    candidate.interviewDate = null;
    candidate.interviewMode = "";
    candidate.interviewNotes = "";
    candidate.googleMeetLink = "";
    candidate.zoomLink = "";
    candidate.reminder24hSentAt = null;
    candidate.reminder1hSentAt = null;
    candidate.status = fallbackStatus;

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: "Interview Cancelled",
      note: req.body?.reason || "Interview cancelled by recruiter"
    });

    await candidate.save();

    emitPipelineEvents(req, candidate.appliedJob.createdBy, {
      candidateId: candidate._id,
      type: "interview_cancelled",
      status: candidate.status
    });

    await notifyStudent(
      req,
      candidate,
      `Interview update for ${candidate.appliedJob.title}`,
      `Interview Update: ${candidate.appliedJob.title}`,
      `
        <div style="font-family:Arial,sans-serif;">
          <h2>Interview Update</h2>
          <p>Your interview schedule for <strong>${candidate.appliedJob.title}</strong> was updated.</p>
          <p>Current application status: <strong>${candidate.status}</strong></p>
        </div>
      `,
      { status: candidate.status }
    );

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Interview cancel failed" });
  }
};

export const sendOffer = async (req, res) => {
  try {
    if (!["Founder", "HR Manager", "Hiring Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed to send offers" });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("appliedJob");
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob, "write");
    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (candidate.status !== "Hired") {
      return res.status(400).json({ message: "Offer can be sent only for hired candidates" });
    }

    ensureOfferObject(candidate);

    if (candidate.offer.status === "Accepted") {
      return res.status(400).json({ message: "Offer already accepted by student" });
    }

    const joiningDate = req.body?.joiningDate ? new Date(req.body.joiningDate) : null;
    if (joiningDate && Number.isNaN(joiningDate.getTime())) {
      return res.status(400).json({ message: "Invalid joining date" });
    }

    candidate.offer.status = "Sent";
    candidate.offer.offeredAt = new Date();
    candidate.offer.respondedAt = null;
    candidate.offer.joiningDate = joiningDate || null;
    candidate.offer.salaryOffered = String(req.body?.salaryOffered || "").trim();
    candidate.offer.letterUrl = normalizeLink(req.body?.letterUrl || "");
    candidate.offer.notes = String(req.body?.notes || "").trim();
    candidate.offer.responseNote = "";
    candidate.offer.offeredBy = req.user._id;

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: "Offer Sent",
      note: candidate.offer.joiningDate
        ? `Joining date: ${candidate.offer.joiningDate.toDateString()}`
        : "Joining date to be confirmed"
    });

    await candidate.save();

    emitPipelineEvents(req, candidate.appliedJob.createdBy, {
      candidateId: candidate._id,
      type: "offer_sent",
      offerStatus: candidate.offer.status
    });

    await notifyStudent(
      req,
      candidate,
      `Offer sent for ${candidate.appliedJob.title}`,
      `Offer Letter: ${candidate.appliedJob.title}`,
      `
        <div style="font-family:Arial,sans-serif;">
          <h2>Congratulations! You have received an offer</h2>
          <p><strong>Job:</strong> ${candidate.appliedJob.title}</p>
          ${candidate.offer.salaryOffered ? `<p><strong>Salary:</strong> ${candidate.offer.salaryOffered}</p>` : ""}
          ${candidate.offer.joiningDate ? `<p><strong>Joining Date:</strong> ${candidate.offer.joiningDate.toLocaleDateString()}</p>` : ""}
          ${candidate.offer.letterUrl ? `<p><strong>Offer Letter:</strong> <a href="${candidate.offer.letterUrl}" target="_blank">View Offer Letter</a></p>` : ""}
        </div>
      `,
      {
        status: candidate.status,
        offerStatus: candidate.offer.status,
        joiningDate: candidate.offer.joiningDate,
        letterUrl: candidate.offer.letterUrl
      }
    );

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to send offer" });
  }
};

export const withdrawOffer = async (req, res) => {
  try {
    if (!["Founder", "HR Manager", "Hiring Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed to withdraw offers" });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("appliedJob");
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob, "write");
    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    ensureOfferObject(candidate);

    if (candidate.offer.status !== "Sent") {
      return res.status(400).json({ message: "Only pending offers can be withdrawn" });
    }

    candidate.offer.status = "Withdrawn";
    candidate.offer.respondedAt = new Date();
    candidate.offer.responseNote = String(req.body?.reason || "Offer withdrawn by recruiter").trim();

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: "Offer Withdrawn",
      note: candidate.offer.responseNote
    });

    await candidate.save();

    emitPipelineEvents(req, candidate.appliedJob.createdBy, {
      candidateId: candidate._id,
      type: "offer_withdrawn",
      offerStatus: candidate.offer.status
    });

    await notifyStudent(
      req,
      candidate,
      `Offer update for ${candidate.appliedJob.title}`,
      `Offer Update: ${candidate.appliedJob.title}`,
      `
        <div style="font-family:Arial,sans-serif;">
          <h2>Offer Update</h2>
          <p>Your offer for <strong>${candidate.appliedJob.title}</strong> has been withdrawn.</p>
          <p>${candidate.offer.responseNote}</p>
        </div>
      `,
      {
        status: candidate.status,
        offerStatus: candidate.offer.status
      }
    );

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to withdraw offer" });
  }
};

export const studentApply = async (req, res) => {
  try {
    const { jobId } = req.body;

    const student = await Student.findById(req.user._id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const existing = await Candidate.findOne({
      studentId: student._id,
      appliedJob: job._id
    });

    if (existing) {
      return res.status(400).json({ message: "Already applied" });
    }

    const matchScore = await recommendationEngine.calculateMatchScore(
      student.skills,
      job.requiredSkills,
      job.preferredSkills
    );

    const candidate = await Candidate.create({
      name: student.fullName,
      email: student.email,
      appliedJob: job._id,
      skills: student.skills,
      experience: student.experience,
      resumeUrl: student.resumeUrl,
      resumeText: student.resumeText,
      studentId: student._id,
      matchScore,
      studentProfileSnapshot: {
        fullName: student.fullName,
        skills: student.skills,
        experience: student.experience
      }
    });

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: "Applied via Student Portal"
    });

    await candidate.save();

    job.applicantsCount += 1;
    await job.save();

    emitPipelineEvents(req, job.createdBy, {
      candidateId: candidate._id,
      type: "new_application",
      status: candidate.status
    });

    return res.status(201).json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Application failed" });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    if (req.user.role !== "Founder") {
      return res.status(403).json({
        message: "Only Founder can delete candidates"
      });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findByIdAndDelete(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    return res.json({ message: "Candidate deleted successfully" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Delete failed" });
  }
};

export const addRecruiterNote = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid candidate id" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("appliedJob");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const allowed = checkPermission(req, candidate.appliedJob, "write");

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const text = req.body?.text?.toString().trim();

    if (!text) {
      return res.status(400).json({ message: "Note text is required" });
    }

    if (!Array.isArray(candidate.recruiterNotes)) {
      candidate.recruiterNotes = [];
    }

    candidate.recruiterNotes.push({
      text,
      authorId: req.user._id,
      authorName: req.user.fullName || req.user.email || req.user.role
    });

    if (!Array.isArray(candidate.activityLog)) {
      candidate.activityLog = [];
    }

    candidate.activityLog.push({
      action: "Recruiter note added",
      note: text
    });

    await candidate.save();

    emitPipelineEvents(req, candidate.appliedJob.createdBy, {
      candidateId: candidate._id,
      type: "note_added"
    });

    return res.json(candidate);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to add recruiter note" });
  }
};
