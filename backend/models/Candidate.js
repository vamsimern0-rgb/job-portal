import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    /* STUDENT LINK */
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    /* BASIC INFO */
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },

    appliedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },

    skills: [String],

    experience: {
      type: Number,
      default: 0
    },

    resumeUrl: String,
    resumeText: String,

    matchScore: {
      type: Number,
      default: 0
    },

    /* PIPELINE STATUS */
    status: {
      type: String,
      enum: ["Applied", "Shortlisted", "Interview", "Hired", "Rejected"],
      default: "Applied"
    },

    interviewDate: {
      type: Date,
      default: null
    },

    interviewMode: {
      type: String,
      enum: ["Online", "Onsite", "Phone", ""],
      default: ""
    },

    interviewNotes: {
      type: String,
      default: ""
    },

    googleMeetLink: {
      type: String,
      default: ""
    },

    zoomLink: {
      type: String,
      default: ""
    },

    screeningAnswers: [
      {
        question: String,
        answer: String
      }
    ],

    recruiterNotes: [
      {
        text: {
          type: String,
          required: true
        },
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hr",
          required: true
        },
        authorName: {
          type: String,
          default: ""
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    studentProfileSnapshot: {
      fullName: String,
      skills: [String],
      experience: Number
    },

    scoreBreakdown: {
      requiredSkillCoverage: {
        type: Number,
        default: 0
      },
      preferredSkillCoverage: {
        type: Number,
        default: 0
      },
      experienceScore: {
        type: Number,
        default: 0
      },
      resumeScore: {
        type: Number,
        default: 0
      }
    },

    offer: {
      status: {
        type: String,
        enum: ["NotSent", "Sent", "Accepted", "Declined", "Withdrawn"],
        default: "NotSent"
      },
      offeredAt: {
        type: Date,
        default: null
      },
      respondedAt: {
        type: Date,
        default: null
      },
      joiningDate: {
        type: Date,
        default: null
      },
      salaryOffered: {
        type: String,
        default: ""
      },
      letterUrl: {
        type: String,
        default: ""
      },
      notes: {
        type: String,
        default: ""
      },
      responseNote: {
        type: String,
        default: ""
      },
      offeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hr",
        default: null
      }
    },

    activityLog: [
      {
        action: String,
        note: {
          type: String,
          default: ""
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],

    reminder24hSentAt: {
      type: Date,
      default: null
    },

    reminder1hSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

candidateSchema.index({ studentId: 1, appliedJob: 1 }, { unique: true });
candidateSchema.index({ studentId: 1, createdAt: -1 });
candidateSchema.index({ studentId: 1, status: 1, createdAt: -1 });
candidateSchema.index({ studentId: 1, interviewDate: 1, interviewMode: 1 });

export default mongoose.model("Candidate", candidateSchema);
