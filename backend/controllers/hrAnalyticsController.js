import Job from "../models/Job.js";
import Candidate from "../models/Candidate.js";
import Hr from "../models/Hr.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/*
=========================================================
HR ANALYTICS CONTROLLER
Enterprise-Level Summary
=========================================================
*/

export const getHrAnalytics = async (req, res) => {
  try {

    const companyOwner = req.user.companyId || req.user._id;
    const teamFilter = {
      $or: [{ _id: companyOwner }, { companyId: companyOwner }]
    };

    const [totalHr, totalRecruiters, totalHrManagers] = await Promise.all([
      Hr.countDocuments(teamFilter),
      Hr.countDocuments({ ...teamFilter, role: "Recruiter" }),
      Hr.countDocuments({ ...teamFilter, role: "HR Manager" })
    ]);

    /* ===== TOTAL JOBS ===== */
    const totalJobs = await Job.countDocuments({
      createdBy: companyOwner
    });

    const activeJobs = await Job.countDocuments({
      createdBy: companyOwner,
      status: "Open"
    });

    /* ===== GET ALL COMPANY JOB IDS ===== */
    const jobs = await Job.find({
      createdBy: companyOwner
    }).select("_id");

    const jobIds = jobs.map(j => j._id);

    /* ===== TOTAL CANDIDATES ===== */
    const totalCandidates = await Candidate.countDocuments({
      appliedJob: { $in: jobIds }
    });

    /* ===== HIRED ===== */
    const hired = await Candidate.countDocuments({
      appliedJob: { $in: jobIds },
      status: "Hired"
    });

    /* ===== INTERVIEW ===== */
    const interviews = await Candidate.countDocuments({
      appliedJob: { $in: jobIds },
      status: "Interview"
    });

    const now = new Date();
    const nowMs = now.getTime();
    const sentWindowStart = new Date(nowMs - DAY_MS);

    const interviewCandidates = await Candidate.find({
      appliedJob: { $in: jobIds },
      status: "Interview",
      interviewDate: { $ne: null, $gt: now }
    })
      .populate("appliedJob", "title")
      .select(
        "name interviewDate reminder24hSentAt reminder1hSentAt appliedJob"
      );

    const jobOutreach = await Job.find({
      createdBy: companyOwner
    }).select("broadcastStats");

    const outreach = jobOutreach.reduce(
      (acc, job) => {
        acc.matchedStudents += job.broadcastStats?.matchedStudents || 0;
        acc.emailSent += job.broadcastStats?.emailSent || 0;
        acc.inAppSent += job.broadcastStats?.inAppSent || 0;
        return acc;
      },
      {
        matchedStudents: 0,
        emailSent: 0,
        inAppSent: 0
      }
    );

    const nextDue = [];
    let sentLast24h = 0;
    let totalSent = 0;

    interviewCandidates.forEach((candidate) => {
      if (candidate.reminder24hSentAt) {
        totalSent += 1;
        if (candidate.reminder24hSentAt >= sentWindowStart) {
          sentLast24h += 1;
        }
      }

      if (candidate.reminder1hSentAt) {
        totalSent += 1;
        if (candidate.reminder1hSentAt >= sentWindowStart) {
          sentLast24h += 1;
        }
      }

      const interviewMs = new Date(candidate.interviewDate).getTime();

      if (!candidate.reminder24hSentAt) {
        const dueAt = new Date(interviewMs - DAY_MS);
        if (dueAt > now) {
          nextDue.push({
            candidateId: candidate._id,
            candidateName: candidate.name,
            jobTitle: candidate.appliedJob?.title || "Job",
            type: "24h",
            dueAt,
            interviewDate: candidate.interviewDate
          });
        }
      }

      if (!candidate.reminder1hSentAt) {
        const dueAt = new Date(interviewMs - HOUR_MS);
        if (dueAt > now) {
          nextDue.push({
            candidateId: candidate._id,
            candidateName: candidate.name,
            jobTitle: candidate.appliedJob?.title || "Job",
            type: "1h",
            dueAt,
            interviewDate: candidate.interviewDate
          });
        }
      }
    });

    nextDue.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    const reminders = {
      sentLast24h,
      totalSent,
      pendingCount: nextDue.length,
      nextDue: nextDue.slice(0, 5)
    };

    res.json({
      totalJobs,
      activeJobs,
      totalCandidates,
      totalHr,
      totalTeamMembers: totalHr,
      totalRecruiters,
      totalHrManagers,
      hired,
      hires: hired,
      interviews,
      outreach,
      reminders
    });

  } catch (error) {
    console.error("HR Analytics Error:", error);
    res.status(500).json({
      message: "HR analytics failed"
    });
  }
};
