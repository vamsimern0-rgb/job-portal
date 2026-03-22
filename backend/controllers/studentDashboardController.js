import Candidate from "../models/Candidate.js";
import Student from "../models/Student.js";
import Notification from "../models/Notification.js";

/*
=========================================================
STUDENT DASHBOARD CONTROLLER
- Application stats
- Interview stats
- Offer stats
=========================================================
*/

export const getDashboardData = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    const applications = await Candidate.find({
      studentId: student._id
    })
      .populate("appliedJob", "title location remoteType employmentType")
      .sort({ createdAt: -1 });

    const stats = {
      total: applications.length,
      shortlisted: applications.filter(a => a.status === "Shortlisted").length,
      interviews: applications.filter(a => a.status === "Interview").length,
      hired: applications.filter(a => a.status === "Hired").length,
      rejected: applications.filter(a => a.status === "Rejected").length,
      strongMatches: applications.filter(a => (a.matchScore || 0) >= 75).length,
      savedJobs: (student.savedJobs || []).length,
      upcomingInterviews: applications.filter(
        a => a.status === "Interview" && a.interviewDate && new Date(a.interviewDate) > new Date()
      ).length
    };

    const unreadNotifications = await Notification.countDocuments({
      recipientStudent: student._id,
      recipientType: "Student",
      read: false
    });

    const nowTs = Date.now();

    const upcomingInterviewList = applications
      .filter(
        (application) =>
          application.status === "Interview" &&
          application.interviewDate &&
          new Date(application.interviewDate) > new Date()
      )
      .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate))
      .slice(0, 5)
      .map((application) => {
        const interviewTime = application.interviewDate
          ? new Date(application.interviewDate).getTime()
          : null;
        const isWithinOneHour =
          interviewTime !== null
            ? interviewTime - nowTs <= 60 * 60 * 1000
            : false;
        const lockedZoom =
          Boolean(application.zoomLink) && !isWithinOneHour;

        return {
          candidateId: application._id,
          jobTitle: application.appliedJob?.title || "Job",
          location: application.appliedJob?.location || "N/A",
          interviewDate: application.interviewDate,
          interviewMode: application.interviewMode || "Online",
          googleMeetLink: application.googleMeetLink || "",
          zoomLink: lockedZoom ? "" : (application.zoomLink || ""),
          zoomLinkLocked: lockedZoom,
          zoomLinkMessage: lockedZoom
            ? "Zoom link will be shared before 1 hour of interview."
            : ""
        };
      });

    const recentApplications = applications.slice(0, 5).map((application) => ({
      candidateId: application._id,
      jobTitle: application.appliedJob?.title || "Job",
      status: application.status,
      matchScore: application.matchScore || 0,
      createdAt: application.createdAt
    }));

    res.json({
      student,
      stats,
      unreadNotifications,
      upcomingInterviewList,
      recentApplications
    });

  } catch (err) {
    res.status(500).json({ message: "Dashboard load failed" });
  }
};
