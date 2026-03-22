import Job from "../models/Job.js";
import Candidate from "../models/Candidate.js";
import natural from "natural";
import logger from "../utils/logger.js";

const TfIdf = natural.TfIdf;

const hasJobAccess = (user, job) => {
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

export const runATS = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!hasJobAccess(req.user, job)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const candidates = await Candidate.find({ appliedJob: jobId });

    if (candidates.length === 0) {
      return res.json([]);
    }

    const tfidf = new TfIdf();
    const normalizedJobDescription = (job.description || "").toLowerCase();

    tfidf.addDocument(normalizedJobDescription);

    candidates.forEach((candidate) => {
      tfidf.addDocument((candidate.resumeText || "").toLowerCase());
    });

    const rawResumeScores = candidates.map((candidate, index) =>
      tfidf.tfidf(normalizedJobDescription, index + 1)
    );

    const maxResumeScore = Math.max(...rawResumeScores, 1);

    const ranked = candidates.map((candidate, index) => {
      const normalizedResumeScore = Math.max(
        0,
        Math.min(100, (rawResumeScores[index] / maxResumeScore) * 100)
      );

      let requiredSkillMatch = 0;
      let preferredSkillMatch = 0;

      const normalizedCandidateSkills = (candidate.skills || []).map((skill) =>
        skill.toLowerCase().trim()
      );

      if (job.requiredSkills?.length) {
        job.requiredSkills.forEach((skill) => {
          if (normalizedCandidateSkills.includes(skill.toLowerCase().trim())) {
            requiredSkillMatch += 1;
          }
        });
      }

      if (job.preferredSkills?.length) {
        job.preferredSkills.forEach((skill) => {
          if (normalizedCandidateSkills.includes(skill.toLowerCase().trim())) {
            preferredSkillMatch += 1;
          }
        });
      }

      const requiredSkillScore =
        job.requiredSkills?.length > 0
          ? (requiredSkillMatch / job.requiredSkills.length) * 100
          : 100;

      const preferredSkillScore =
        job.preferredSkills?.length > 0
          ? (preferredSkillMatch / job.preferredSkills.length) * 100
          : 100;

      const experienceScore =
        Number(job.experienceRequired || 0) <= 0
          ? 100
          : Math.min(
            100,
            (Number(candidate.experience || 0) / Number(job.experienceRequired || 1)) * 100
          );

      const finalScore = Math.round(
        normalizedResumeScore * 0.35 +
        requiredSkillScore * 0.4 +
        preferredSkillScore * 0.1 +
        experienceScore * 0.15
      );

      return {
        ...candidate._doc,
        matchScore: finalScore,
        scoreBreakdown: {
          resumeScore: Number(normalizedResumeScore.toFixed(2)),
          requiredSkillCoverage: Number((requiredSkillScore / 100).toFixed(2)),
          preferredSkillCoverage: Number((preferredSkillScore / 100).toFixed(2)),
          experienceScore: Number((experienceScore / 100).toFixed(2))
        }
      };
    });

    ranked.sort((a, b) => b.matchScore - a.matchScore);

    logger.info(`ATS executed for job ${jobId}`);

    return res.json(ranked);
  } catch (err) {
    logger.error(`ATS ERROR: ${err.message}`);
    return res.status(500).json({ message: "ATS failed" });
  }
};
