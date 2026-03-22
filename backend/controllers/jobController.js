import mongoose from "mongoose";
import Hr from "../models/Hr.js";
import Job from "../models/Job.js";
import JobSkillVector from "../models/JobSkillVector.js";
import logger from "../utils/logger.js";
import jobBroadcastService from "../services/jobBroadcastService.js";
import skillTokenizer from "../ai/skillTokenizer.js";
import * as tfidfEngine from "../ai/tfidfEngine.js";

const parseSkillList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => item.toString().trim()).filter(Boolean);
  }

  if (!value) return [];

  return value
    .toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseQuestionList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => item.toString().trim()).filter(Boolean);
  }

  if (!value) return [];

  return value
    .toString()
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseIdList = (value) => {
  const list = Array.isArray(value)
    ? value
    : value
    ? value.toString().split(",")
    : [];

  return [...new Set(
    list
      .map((item) => item?.toString().trim())
      .filter(Boolean)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
  )];
};

const toThresholdUnit = (value, fallback = 0.65) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return numeric > 1 ? numeric / 100 : numeric;
};

const getCompanyOwner = (user) => user.companyId || user._id;

const canViewJob = (user, job) => {
  const companyOwner = getCompanyOwner(user).toString();

  if (["Founder", "HR Manager", "Hiring Manager", "Viewer"].includes(user.role)) {
    return job.createdBy.toString() === companyOwner;
  }

  if (user.role === "Recruiter") {
    return (job.assignedRecruiters || []).some(
      (id) => id.toString() === user._id.toString()
    );
  }

  return false;
};

const canManageJobStatus = (user, job) => {
  const companyOwner = getCompanyOwner(user).toString();

  if (["Founder", "HR Manager", "Hiring Manager"].includes(user.role)) {
    return job.createdBy.toString() === companyOwner;
  }

  if (user.role === "Recruiter") {
    return (job.assignedRecruiters || []).some(
      (id) => id.toString() === user._id.toString()
    );
  }

  return false;
};

const resolveAssignableRecruiters = async (req, recruiterIds = []) => {
  if (!recruiterIds.length) return [];

  const companyOwner = getCompanyOwner(req.user);
  const objectIds = recruiterIds.map((id) => new mongoose.Types.ObjectId(id));

  // Assignable roles can actively work on jobs.
  const recruiters = await Hr.find({
    _id: { $in: objectIds },
    $or: [
      { _id: companyOwner },
      { companyId: companyOwner }
    ],
    role: { $in: ["Recruiter", "Hiring Manager", "HR Manager"] }
  }).select("_id");

  if (recruiters.length !== recruiterIds.length) {
    return null;
  }

  return recruiters.map((item) => item._id);
};

const upsertJobVector = async (job) => {
  const combinedText = `
    ${job.title}
    ${job.description}
    ${job.requiredSkills.join(" ")}
    ${job.preferredSkills.join(" ")}
  `;

  const tokens = skillTokenizer.tokenize(combinedText);
  const tfidf = tfidfEngine.buildTfIdfModel([tokens]);
  const vector = tfidfEngine.vectorizeDocument(tfidf, 0);

  await JobSkillVector.findOneAndUpdate(
    { jobId: job._id },
    {
      jobId: job._id,
      tokens,
      vector,
      updatedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/* =========================================
   CREATE JOB
========================================= */
export const createJob = async (req, res) => {
  try {
    if (!["Founder", "HR Manager"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Founder or HR Manager can create jobs"
      });
    }

    const {
      title,
      department,
      employmentType,
      location,
      salaryRange,
      openingsCount,
      description,
      responsibilities,
      requiredSkills,
      preferredSkills,
      experienceRequired,
      educationRequired,
      status,
      remoteType,
      priority,
      autoBroadcastEnabled,
      matchThreshold,
      screeningQuestions,
      assignedRecruiters
    } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description required"
      });
    }

    const companyOwner = getCompanyOwner(req.user);
    const parsedRecruiterIds = parseIdList(assignedRecruiters);
    const resolvedRecruiters = await resolveAssignableRecruiters(req, parsedRecruiterIds);

    if (parsedRecruiterIds.length > 0 && !resolvedRecruiters) {
      return res.status(400).json({
        message: "One or more recruiter assignments are invalid"
      });
    }

    const job = await Job.create({
      title,
      department,
      employmentType,
      location,
      salaryRange,
      openingsCount: Math.max(1, parseInt(openingsCount, 10) || 1),
      description,
      responsibilities,
      requiredSkills: parseSkillList(requiredSkills),
      preferredSkills: parseSkillList(preferredSkills),
      experienceRequired: Math.max(0, parseInt(experienceRequired, 10) || 0),
      educationRequired,
      status: status || "Open",
      remoteType: remoteType || "Onsite",
      priority: priority || "Normal",
      autoBroadcastEnabled:
        autoBroadcastEnabled === undefined
          ? true
          : ![false, "false", 0, "0"].includes(autoBroadcastEnabled),
      matchThreshold: toThresholdUnit(matchThreshold, 0.65),
      screeningQuestions: parseQuestionList(screeningQuestions),
      applicantsCount: 0,
      createdBy: companyOwner,
      assignedRecruiters: resolvedRecruiters || []
    });

    logger.info(`Job created by ${req.user.role} ${req.user._id}`);

    try {
      await upsertJobVector(job);
    } catch (vectorErr) {
      logger.error("Job vector generation failed: " + vectorErr.message);
    }

    try {
      const summary = await jobBroadcastService.processNewJob(job);
      job.broadcastStats = summary;
      await job.save();
    } catch (broadcastErr) {
      logger.error("Broadcast failed: " + broadcastErr.message);
    }

    return res.status(201).json(job);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Job creation failed" });
  }
};

/* =========================================
   GET JOBS
========================================= */
export const getJobs = async (req, res) => {
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

    const companyOwner = getCompanyOwner(req.user);
    let roleFilter;

    if (["Founder", "HR Manager", "Hiring Manager", "Viewer"].includes(req.user.role)) {
      roleFilter = { createdBy: companyOwner };
    } else if (req.user.role === "Recruiter") {
      roleFilter = {
        assignedRecruiters: req.user._id
      };
    } else {
      roleFilter = { createdBy: companyOwner };
    }

    const shouldPaginate =
      page !== undefined ||
      limit !== undefined ||
      Boolean(q) ||
      Boolean(status) ||
      Boolean(remoteType) ||
      Boolean(employmentType) ||
      sort !== "latest";

    const filter = { ...roleFilter };

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
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { department: regex }
      ];
    }

    const sortQuery =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "applicants"
        ? { applicantsCount: -1, createdAt: -1 }
        : sort === "priority"
        ? { priority: -1, createdAt: -1 }
        : { createdAt: -1 };

    if (!shouldPaginate) {
      const jobs = await Job.find(filter).sort(sortQuery);
      return res.json(jobs);
    }

    const numericLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const numericPage = Math.max(Number(page) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort(sortQuery).skip(skip).limit(numericLimit),
      Job.countDocuments(filter)
    ]);

    return res.json({
      items: jobs,
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.max(Math.ceil(total / numericLimit), 1)
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

/* =========================================
   GET JOB BY ID
========================================= */
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canViewJob(req.user, job)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json(job);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Failed to fetch job" });
  }
};

/* =========================================
   ASSIGN SINGLE RECRUITER
========================================= */
export const assignRecruiter = async (req, res) => {
  try {
    if (!["Founder", "HR Manager"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Founder or HR Manager can assign recruiters"
      });
    }

    const { recruiterId } = req.body || {};
    if (!recruiterId) {
      return res.status(400).json({ message: "Recruiter id is required" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const companyOwner = getCompanyOwner(req.user).toString();
    if (job.createdBy.toString() !== companyOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const resolved = await resolveAssignableRecruiters(req, parseIdList([recruiterId]));
    if (!resolved || resolved.length === 0) {
      return res.status(400).json({ message: "Invalid recruiter assignment" });
    }

    if (!Array.isArray(job.assignedRecruiters)) {
      job.assignedRecruiters = [];
    }

    const alreadyAssigned = job.assignedRecruiters.some(
      (id) => id.toString() === resolved[0].toString()
    );

    if (!alreadyAssigned) {
      job.assignedRecruiters.push(resolved[0]);
      await job.save();
    }

    return res.json({ message: "Recruiter assigned successfully", job });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Assignment failed" });
  }
};

/* =========================================
   UPDATE JOB DETAILS
========================================= */
export const updateJob = async (req, res) => {
  try {
    if (!["Founder", "HR Manager"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Founder or HR Manager can update jobs"
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const companyOwner = getCompanyOwner(req.user).toString();
    if (job.createdBy.toString() !== companyOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const {
      title,
      department,
      employmentType,
      remoteType,
      priority,
      location,
      salaryRange,
      openingsCount,
      description,
      responsibilities,
      requiredSkills,
      preferredSkills,
      experienceRequired,
      educationRequired,
      status,
      autoBroadcastEnabled,
      matchThreshold,
      screeningQuestions,
      assignedRecruiters
    } = req.body || {};

    const previousStatus = job.status;

    if (title !== undefined) job.title = String(title || "").trim();
    if (department !== undefined) job.department = department;
    if (employmentType !== undefined) job.employmentType = employmentType;
    if (remoteType !== undefined) job.remoteType = remoteType;
    if (priority !== undefined) job.priority = priority;
    if (location !== undefined) job.location = location;
    if (salaryRange !== undefined) job.salaryRange = salaryRange;
    if (description !== undefined) job.description = String(description || "");
    if (responsibilities !== undefined) job.responsibilities = responsibilities;
    if (educationRequired !== undefined) job.educationRequired = educationRequired;
    if (status !== undefined) job.status = status;

    if (openingsCount !== undefined) {
      job.openingsCount = Math.max(1, parseInt(openingsCount, 10) || 1);
    }
    if (experienceRequired !== undefined) {
      job.experienceRequired = Math.max(0, parseInt(experienceRequired, 10) || 0);
    }
    if (requiredSkills !== undefined) {
      job.requiredSkills = parseSkillList(requiredSkills);
    }
    if (preferredSkills !== undefined) {
      job.preferredSkills = parseSkillList(preferredSkills);
    }
    if (screeningQuestions !== undefined) {
      job.screeningQuestions = parseQuestionList(screeningQuestions);
    }

    if (autoBroadcastEnabled !== undefined) {
      job.autoBroadcastEnabled = ![false, "false", 0, "0"].includes(autoBroadcastEnabled);
    }
    if (matchThreshold !== undefined) {
      job.matchThreshold = toThresholdUnit(matchThreshold, job.matchThreshold || 0.65);
    }

    if (assignedRecruiters !== undefined) {
      const parsedRecruiterIds = parseIdList(assignedRecruiters);
      const resolvedRecruiters = await resolveAssignableRecruiters(req, parsedRecruiterIds);
      if (parsedRecruiterIds.length > 0 && !resolvedRecruiters) {
        return res.status(400).json({ message: "One or more recruiter assignments are invalid" });
      }
      job.assignedRecruiters = resolvedRecruiters || [];
    }

    if (!job.title || !job.description) {
      return res.status(400).json({ message: "Title and description required" });
    }

    await job.save();

    try {
      await upsertJobVector(job);
    } catch (vectorErr) {
      logger.error("Job vector update failed: " + vectorErr.message);
    }

    if (previousStatus !== "Open" && job.status === "Open") {
      try {
        const summary = await jobBroadcastService.processNewJob(job);
        job.broadcastStats = summary;
        await job.save();
      } catch (broadcastErr) {
        logger.error("Reopen broadcast failed: " + broadcastErr.message);
      }
    }

    return res.json(job);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Job update failed" });
  }
};

/* =========================================
   UPDATE STATUS
========================================= */
export const updateJobStatus = async (req, res) => {
  try {
    if (!["Founder", "HR Manager", "Hiring Manager", "Recruiter"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed to update status" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canManageJobStatus(req.user, job)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const nextStatus = req.body?.status;
    const allowedStatuses = ["Open", "Closed", "Paused", "Draft"];
    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid job status" });
    }

    const previousStatus = job.status;
    job.status = nextStatus;
    await job.save();

    if (previousStatus !== "Open" && job.status === "Open") {
      try {
        const summary = await jobBroadcastService.processNewJob(job);
        job.broadcastStats = summary;
        await job.save();
      } catch (broadcastErr) {
        logger.error("Reopen broadcast failed: " + broadcastErr.message);
      }
    }

    return res.json(job);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Status update failed" });
  }
};

/* =========================================
   REBROADCAST MATCH ALERTS
========================================= */
export const rebroadcastJobMatches = async (req, res) => {
  try {
    if (!["Founder", "HR Manager"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Founder or HR Manager can rebroadcast job alerts"
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const companyOwner = getCompanyOwner(req.user).toString();
    if (job.createdBy.toString() !== companyOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const summary = await jobBroadcastService.processNewJob(job, {
      force: true
    });

    job.broadcastStats = summary;
    await job.save();

    return res.json({
      message: "Job alerts rebroadcast successfully",
      broadcastStats: summary
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Rebroadcast failed" });
  }
};

/* =========================================
   DELETE JOB
========================================= */
export const deleteJob = async (req, res) => {
  try {
    if (req.user.role !== "Founder") {
      return res.status(403).json({
        message: "Only Founder can delete jobs"
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Job.findByIdAndDelete(req.params.id);

    return res.json({ message: "Job deleted successfully" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: "Delete failed" });
  }
};
