import Student from "../models/Student.js";
import JobVector from "../models/JobVector.js";
import StudentSkillVector from "../models/StudentSkillVector.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js";

import skillTokenizer from "../ai/skillTokenizer.js";
import * as tfidfEngine from "../ai/tfidfEngine.js";
import cosineSimilarity from "../ai/cosineSimilarity.js";

import emailQueue from "../queues/emailQueue.js";

const DEFAULT_MATCH_THRESHOLD = 0.65;

const normalize = (value = "") => value.toString().trim().toLowerCase();

const toScoreUnit = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric > 1) return numeric / 100;
  return numeric;
};

const getCoverage = (studentSkills, jobSkills) => {
  if (!jobSkills.length) return 1;
  const studentSet = new Set(studentSkills.map(normalize));
  const matched = jobSkills.filter((skill) => studentSet.has(normalize(skill)));
  return {
    ratio: matched.length / jobSkills.length,
    matched
  };
};

const buildJobVectors = async (job) => {
  const requiredTokens = skillTokenizer.tokenizeSkills(job.requiredSkills || []);
  const preferredTokens = skillTokenizer.tokenizeSkills(job.preferredSkills || []);
  const tfidf = tfidfEngine.buildTfIdfModel([requiredTokens, preferredTokens]);
  const requiredVector = tfidfEngine.vectorizeDocument(tfidf, 0);
  const preferredVector = tfidfEngine.vectorizeDocument(tfidf, 1);

  await JobVector.findOneAndUpdate(
    { jobId: job._id },
    {
      requiredTokens,
      preferredTokens,
      vector: requiredVector
    },
    { upsert: true, new: true }
  );

  return {
    requiredVector,
    preferredVector
  };
};

const buildEmailTemplate = (job, student, scorePct, matchedSkills) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;">
    <h2>New Job Match Available</h2>
    <p>Hi ${student.fullName || "Candidate"},</p>
    <p>A new role is open and matches your profile.</p>
    <p><strong>${job.title}</strong> (${job.location || "Location Flexible"})</p>
    <p><strong>Match Score:</strong> ${scorePct}%</p>
    <p><strong>Matched Skills:</strong> ${matchedSkills.join(", ") || "Profile match detected by AI"}</p>
    <p>You can apply from your Student portal dashboard.</p>
  </div>
`;

const processNewJob = async (job, options = {}) => {
  const summary = {
    matchedStudents: 0,
    emailSent: 0,
    inAppSent: 0,
    lastBroadcastAt: new Date()
  };

  try {
    const force = Boolean(options.force);

    if (!force && job.status !== "Open") {
      return summary;
    }

    if (!force && job.autoBroadcastEnabled === false) {
      return summary;
    }

    const matchThreshold = toScoreUnit(
      options.matchThreshold ?? job.matchThreshold,
      DEFAULT_MATCH_THRESHOLD
    );

    const { requiredVector, preferredVector } = await buildJobVectors(job);

    const [students, studentVectors] = await Promise.all([
      Student.find({ isActive: { $ne: false } }).select(
        "fullName email phone skills experience resumeScore communicationPreferences jobAlertSettings"
      ),
      StudentSkillVector.find().select("studentId vector")
    ]);

    const vectorMap = new Map(
      studentVectors.map((doc) => [doc.studentId.toString(), doc.vector])
    );

    for (const student of students) {
      const studentSkills = student.skills || [];
      const requiredCoverage = getCoverage(studentSkills, job.requiredSkills || []);
      const preferredCoverage = getCoverage(studentSkills, job.preferredSkills || []);

      const vector = vectorMap.get(student._id.toString()) || {};
      const requiredVectorScore = cosineSimilarity(vector, requiredVector);
      const preferredVectorScore = cosineSimilarity(vector, preferredVector);
      const vectorScore = (requiredVectorScore * 0.7) + (preferredVectorScore * 0.3);

      const experienceRequired = Number(job.experienceRequired || 0);
      const experienceScore =
        experienceRequired <= 0
          ? 1
          : Math.min(1, Number(student.experience || 0) / experienceRequired);

      const resumeScore = Math.min(1, Number(student.resumeScore || 0) / 100);

      const finalScore =
        (requiredCoverage.ratio * 0.45) +
        (preferredCoverage.ratio * 0.15) +
        (experienceScore * 0.15) +
        (resumeScore * 0.1) +
        (vectorScore * 0.15);

      const personalThreshold = toScoreUnit(
        student.jobAlertSettings?.minMatchScore,
        matchThreshold
      );
      const effectiveThreshold = Math.max(matchThreshold, personalThreshold);

      if (finalScore < effectiveThreshold) continue;
      if ((job.requiredSkills || []).length > 0 && requiredCoverage.matched.length === 0) {
        continue;
      }

      const scorePct = Math.round(finalScore * 100);
      const preferences = student.communicationPreferences || {};
      summary.matchedStudents += 1;

      if (preferences.inAppAlerts !== false) {
        const notification = await Notification.create({
          companyId: job.createdBy,
          recipientStudent: student._id,
          recipientType: "Student",
          text: `New opening "${job.title}" matches your skills (${scorePct}% match).`,
          channel: "InApp",
          metadata: {
            jobId: job._id,
            matchScore: scorePct,
            matchedSkills: requiredCoverage.matched
          }
        });

        io.to(student._id.toString()).emit("studentNotification", notification);
        summary.inAppSent += 1;
      }

      if (preferences.emailJobAlerts !== false && student.email) {
        emailQueue.add({
          to: student.email,
          subject: `New Job Match (${scorePct}%): ${job.title}`,
          html: buildEmailTemplate(job, student, scorePct, requiredCoverage.matched)
        });
        summary.emailSent += 1;
      }

    }

    return summary;
  } catch (err) {
    console.error("Job Broadcast Error:", err);
    return summary;
  }
};

export default {
  processNewJob
};
