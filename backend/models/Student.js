import mongoose from "mongoose";

/*
=========================================================
ENTERPRISE STUDENT MODEL
- Authentication fields
- Profile completeness
- Resume storage
- Skills
- Preferences
- Analytics counters
- Activity tracking
=========================================================
*/

const studentSchema = new mongoose.Schema(
  {
    /* ================= AUTH ================= */

    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,     // ✅ unique already creates index
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      default: "Student"
    },

    /* ================= PROFILE ================= */

    phone: String,
    location: String,
    headline: String,
    currentRole: String,
    dateOfBirth: Date,
    profileImage: String,
    linkedin: String,
    github: String,
    portfolio: String,

    bio: String,

    education: [
      {
        institution: String,
        degree: String,
        field: String,
        startYear: Number,
        endYear: Number
      }
    ],

    experience: {
      type: Number,
      default: 0
    },

    skills: {
      type: [String],
      default: []
    },

    resumeUrl: String,
    resumeText: String,

    profileCompletion: {
      type: Number,
      default: 0
    },

    resumeScore: {
      type: Number,
      default: 0
    },

    /* ================= APPLICATION RELATIONS ================= */

    appliedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate"
      }
    ],

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job"
      }
    ],

    /* ================= NOTIFICATIONS ================= */

    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification"
      }
    ],

    communicationPreferences: {
      emailJobAlerts: {
        type: Boolean,
        default: true
      },
      inAppAlerts: {
        type: Boolean,
        default: true
      }
    },

    jobAlertSettings: {
      minMatchScore: {
        type: Number,
        default: 60
      },
      preferredLocations: {
        type: [String],
        default: []
      },
      preferredEmploymentTypes: {
        type: [String],
        default: []
      }
    },

    /* ================= ANALYTICS ================= */

    totalApplications: {
      type: Number,
      default: 0
    },

    shortlistedCount: {
      type: Number,
      default: 0
    },

    interviewCount: {
      type: Number,
      default: 0
    },

    offerCount: {
      type: Number,
      default: 0
    },

    /* ================= ACTIVITY ================= */

    lastLogin: Date,

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */
/* DO NOT add email index again (already unique:true) */
studentSchema.index({ skills: 1 });

export default mongoose.model("Student", studentSchema);
