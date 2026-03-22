import Candidate from "../models/Candidate.js";
import Student from "../models/Student.js";
import Hr from "../models/Hr.js";
import Notification from "../models/Notification.js";
import emailQueue from "../queues/emailQueue.js";
import { io } from "../server.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

let schedulerRef = null;

const getIntervalMs = () => {
  const value = Number(process.env.INTERVIEW_REMINDER_INTERVAL_MS);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_INTERVAL_MS;
  }
  return value;
};

const formatInterviewDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

const sendStudentReminder = async (candidate, student, reminderLabel) => {
  const includeMeetLink = reminderLabel === "1 Hour" && Boolean(candidate.googleMeetLink);
  const includeZoomLink = reminderLabel === "1 Hour" && Boolean(candidate.zoomLink);
  const message =
    `${reminderLabel}: Interview for ${candidate.appliedJob.title} ` +
    `is scheduled on ${formatInterviewDate(candidate.interviewDate)}.` +
    (includeMeetLink ? " Google Meet link is included in this reminder email." : "") +
    (includeZoomLink ? " Zoom link is included in this reminder email." : "") +
    (reminderLabel === "24 Hours" ? " Zoom link will be shared 1 hour before the interview." : "");

  const notification = await Notification.create({
    companyId: candidate.appliedJob.createdBy,
    recipientStudent: student._id,
    recipientType: "Student",
    text: message,
    channel: "InApp",
    metadata: {
      candidateId: candidate._id,
      jobId: candidate.appliedJob._id,
      reminderLabel
    }
  });

  io.to(student._id.toString()).emit("studentNotification", notification);

  if (student?.communicationPreferences?.emailJobAlerts !== false && student?.email) {
    emailQueue.add({
      to: student.email,
      subject: `${reminderLabel}: Interview Reminder`,
      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2>${reminderLabel} - Interview Reminder</h2>
          <p><strong>Job:</strong> ${candidate.appliedJob.title}</p>
          <p><strong>Date:</strong> ${formatInterviewDate(candidate.interviewDate)}</p>
          <p><strong>Mode:</strong> ${candidate.interviewMode || "TBD"}</p>
          ${
            includeMeetLink
              ? `<p><strong>Google Meet Link:</strong> <a href="${candidate.googleMeetLink}" target="_blank">${candidate.googleMeetLink}</a></p>`
              : ""
          }
          ${
            includeZoomLink
              ? `<p><strong>Zoom Link:</strong> <a href="${candidate.zoomLink}" target="_blank">${candidate.zoomLink}</a></p>`
              : ""
          }
          ${
            reminderLabel === "1 Hour" && !candidate.googleMeetLink
              ? "<p><em>Google Meet link was not provided by recruiter yet.</em></p>"
              : ""
          }
          ${
            reminderLabel === "24 Hours"
              ? "<p><em>Zoom link will be shared in your 1-hour reminder.</em></p>"
              : ""
          }
        </div>
      `
    });
  }

};

const sendHrReminder = async (candidate, reminderLabel) => {
  const hrUsers = await Hr.find({
    $or: [
      { _id: candidate.appliedJob.createdBy },
      { companyId: candidate.appliedJob.createdBy }
    ]
  }).select("_id email");

  if (hrUsers.length === 0) return;

  const reminderText =
    `${reminderLabel}: ${candidate.name} interview for ` +
    `${candidate.appliedJob.title} at ${formatInterviewDate(candidate.interviewDate)}.`;

  const notifications = await Notification.insertMany(
    hrUsers.map((user) => ({
      companyId: candidate.appliedJob.createdBy,
      recipient: user._id,
      recipientType: "HR",
      text: reminderText,
      roleTarget: "All",
      channel: "System",
      metadata: {
        candidateId: candidate._id,
        jobId: candidate.appliedJob._id,
        reminderLabel
      }
    }))
  );

  notifications.forEach((notification) => {
    io.to(notification.recipient.toString()).emit("newNotification", notification);
  });

  hrUsers.forEach((user) => {
    if (!user.email) return;

    emailQueue.add({
      to: user.email,
      subject: `${reminderLabel}: Candidate Interview Reminder`,
      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2>${reminderLabel} - Interview Reminder</h2>
          <p><strong>Candidate:</strong> ${candidate.name}</p>
          <p><strong>Job:</strong> ${candidate.appliedJob.title}</p>
          <p><strong>Date:</strong> ${formatInterviewDate(candidate.interviewDate)}</p>
          <p><strong>Mode:</strong> ${candidate.interviewMode || "TBD"}</p>
          ${candidate.googleMeetLink ? `<p><strong>Google Meet:</strong> <a href="${candidate.googleMeetLink}" target="_blank">${candidate.googleMeetLink}</a></p>` : ""}
          ${candidate.zoomLink ? `<p><strong>Zoom:</strong> <a href="${candidate.zoomLink}" target="_blank">${candidate.zoomLink}</a></p>` : ""}
        </div>
      `
    });
  });
};

const processReminder = async (candidate, reminderType) => {
  const student = await Student.findById(candidate.studentId).select(
    "email phone communicationPreferences"
  );

  if (!student) return;

  const reminderLabel = reminderType === "1h" ? "1 Hour" : "24 Hours";

  await Promise.all([
    sendStudentReminder(candidate, student, reminderLabel),
    sendHrReminder(candidate, reminderLabel)
  ]);

  if (!Array.isArray(candidate.activityLog)) {
    candidate.activityLog = [];
  }

  candidate.activityLog.push({
    action: `${reminderLabel} interview reminder sent`,
    note: `Reminder sent for ${candidate.appliedJob.title}`
  });

  if (reminderType === "1h") {
    candidate.reminder1hSentAt = new Date();
  } else {
    candidate.reminder24hSentAt = new Date();
  }

  await candidate.save();
};

const runReminderCycle = async () => {
  try {
    const now = new Date();

    const candidates = await Candidate.find({
      status: "Interview",
      interviewDate: { $ne: null, $gt: now }
    }).populate("appliedJob", "title createdBy");

    for (const candidate of candidates) {
      if (!candidate.appliedJob?._id) continue;

      const diffMs = new Date(candidate.interviewDate).getTime() - now.getTime();

      const shouldSend1h =
        !candidate.reminder1hSentAt &&
        diffMs > 0 &&
        diffMs <= HOUR_MS;

      const shouldSend24h =
        !candidate.reminder24hSentAt &&
        diffMs > HOUR_MS &&
        diffMs <= DAY_MS;

      if (shouldSend1h) {
        await processReminder(candidate, "1h");
        continue;
      }

      if (shouldSend24h) {
        await processReminder(candidate, "24h");
      }
    }
  } catch (err) {
    console.error("Interview reminder cycle failed:", err.message);
  }
};

const startInterviewReminderScheduler = () => {
  if (process.env.DISABLE_INTERVIEW_REMINDER_SCHEDULER === "true") {
    return;
  }

  if (schedulerRef) return;

  const intervalMs = getIntervalMs();

  schedulerRef = setInterval(() => {
    runReminderCycle();
  }, intervalMs);

  setTimeout(() => {
    runReminderCycle();
  }, 5000);

  console.log(`Interview reminder scheduler started (${intervalMs}ms interval)`);
};

const stopInterviewReminderScheduler = () => {
  if (!schedulerRef) return;
  clearInterval(schedulerRef);
  schedulerRef = null;
};

export default {
  startInterviewReminderScheduler,
  stopInterviewReminderScheduler
};
