import mongoose from "mongoose";

const hrSchema = new mongoose.Schema(
  {
    /* ================= COMPANY STRUCTURE ================= */

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hr",
      default: null
    },

    role: {
      type: String,
      enum: ["Founder", "HR Manager", "Hiring Manager", "Recruiter", "Viewer"],
      default: "Founder"
    },

    /* ================= COMPANY INFO ================= */

    companyName: {
      type: String,
      required: true,
      trim: true
    },

    industry: String,
    companySize: String,
    website: String,
    city: String,
    country: String,

    /* ================= LEGAL DETAILS ================= */

    gstNumber: {
      type: String,
      trim: true
    },

    companyPan: {
      type: String,
      trim: true
    },

    companyCin: {
      type: String,
      trim: true
    },

    registeredAddress: {
      type: String,
      trim: true
    },

    /* ================= HIRING INFO ================= */

    hiringType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Internship"],
      default: null
    },

    urgency: {
      type: String,
      enum: ["Immediate", "Within 1 Month", "Flexible"],
      default: null
    },

    openPositions: {
      type: Number,
      default: 0
    },

    description: String,

    /* ================= USER INFO ================= */

    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: String,
    linkedin: String,

    password: {
      type: String,
      required: true
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    profileImage: {
      type: String,
      default: ""
    },

    companyLogo: {
      type: String,
      default: ""
    },

    /* ================= ACCESS REQUEST SYSTEM ================= */

    accessRequests: [
      {
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hr"
        },
        type: String,
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending"
        },
        date: {
          type: Date,
          default: Date.now
        }
      }
    ],

    activityLog: [
      {
        action: String,
        date: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Hr", hrSchema);