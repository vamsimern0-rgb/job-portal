import Candidate from "../models/Candidate.js";

/*
=========================================================
STUDENT ANALYTICS CONTROLLER
- Match score distribution
- Status breakdown
=========================================================
*/

export const getStudentAnalytics = async (req, res) => {
  try {
    const applications = await Candidate.find({
      studentId: req.user.id
    });

    const avgMatchScore =
      applications.reduce((sum, a) => sum + (a.matchScore || 0), 0) /
      (applications.length || 1);

    const statusBreakdown = {
      Applied: applications.filter((a) => a.status === "Applied").length,
      Shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
      Interview: applications.filter((a) => a.status === "Interview").length,
      Hired: applications.filter((a) => a.status === "Hired").length,
      Rejected: applications.filter((a) => a.status === "Rejected").length
    };

    const totalApplications = applications.length;
    const shortlisted = statusBreakdown.Shortlisted || 0;
    const interviews = statusBreakdown.Interview || 0;
    const hired = statusBreakdown.Hired || 0;

    const conversion = {
      shortlistRate: totalApplications ? Number(((shortlisted / totalApplications) * 100).toFixed(2)) : 0,
      interviewRate: totalApplications ? Number(((interviews / totalApplications) * 100).toFixed(2)) : 0,
      offerRate: totalApplications ? Number(((hired / totalApplications) * 100).toFixed(2)) : 0
    };

    const statusPercentages = Object.fromEntries(
      Object.entries(statusBreakdown).map(([key, value]) => [
        key,
        totalApplications ? Number(((value / totalApplications) * 100).toFixed(2)) : 0
      ])
    );

    const now = new Date();
    const monthBuckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthBuckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label,
        applications: 0
      });
    }

    applications.forEach((application) => {
      const createdAt = new Date(application.createdAt);
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const target = monthBuckets.find((bucket) => bucket.key === key);
      if (target) target.applications += 1;
    });

    res.json({
      averageMatchScore: avgMatchScore.toFixed(2),
      totalApplications,
      statusBreakdown,
      statusPercentages,
      conversion,
      monthlyApplications: monthBuckets.map(({ label, applications: count }) => ({
        label,
        applications: count
      }))
    });

  } catch (err) {
    res.status(500).json({ message: "Analytics failed" });
  }
};
