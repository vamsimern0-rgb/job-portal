import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hr",
      default: null
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hr",
      default: null
    },
    recipientStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null
    },
    recipientType: {
      type: String,
      enum: ["HR", "Student"],
      default: "HR"
    },
    text: {
      type: String,
      required: true
    },
    roleTarget: {
      type: String,
      enum: ["Founder", "HR Manager", "Recruiter", "Hiring Manager", "Viewer", "All"],
      default: "All"
    },
    channel: {
      type: String,
      enum: ["InApp", "Email", "System"],
      default: "InApp"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipientStudent: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
