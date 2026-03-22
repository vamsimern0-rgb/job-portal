import mongoose from "mongoose";

/*
=========================================================
JOB SKILL VECTOR
- Precomputed job TF-IDF vectors
- Used for cosine similarity matching
=========================================================
*/

const jobSkillVectorSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true
    },

    tokens: {
      type: [String],
      default: []
    },

    vector: {
      type: Map,
      of: Number,
      default: {}
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("JobSkillVector", jobSkillVectorSchema);
