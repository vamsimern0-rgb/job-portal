import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    department: String,

    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time"
    },

    remoteType: {
      type: String,
      enum: ["Onsite", "Hybrid", "Remote"],
      default: "Onsite"
    },

    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Critical"],
      default: "Normal"
    },

    location: String,
    salaryRange: String,

    openingsCount: {
      type: Number,
      default: 1
    },

    description: {
      type: String,
      required: true
    },

    responsibilities: String,

    requiredSkills: {
      type: [String],
      default: []
    },

    preferredSkills: {
      type: [String],
      default: []
    },

    experienceRequired: {
      type: Number,
      default: 0
    },

    educationRequired: String,

    status: {
      type: String,
      enum: ["Open", "Closed", "Draft", "Paused"],
      default: "Open"
    },

    autoBroadcastEnabled: {
      type: Boolean,
      default: true
    },

    matchThreshold: {
      type: Number,
      default: 0.65
    },

    screeningQuestions: {
      type: [String],
      default: []
    },

    applicantsCount: {
      type: Number,
      default: 0
    },

    broadcastStats: {
      matchedStudents: {
        type: Number,
        default: 0
      },
      emailSent: {
        type: Number,
        default: 0
      },
      inAppSent: {
        type: Number,
        default: 0
      },
      lastBroadcastAt: {
        type: Date,
        default: null
      }
    },

    /* ================= ENTERPRISE ================= */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hr",
      required: true
    },

    assignedRecruiters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hr"
      }
    ]

  },
  { timestamps: true }
);

jobSchema.index({ createdBy: 1, createdAt: -1 });
jobSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
jobSchema.index({ assignedRecruiters: 1, createdAt: -1 });
jobSchema.index({ title: "text", description: "text", location: "text", department: "text" });

export default mongoose.model("Job", jobSchema);
