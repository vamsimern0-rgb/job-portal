import mongoose from "mongoose";

/*
=========================================================
JOB VECTOR MODEL
- Stores vectorized job skill representation
- Used for broadcast engine
=========================================================
*/

const jobVectorSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true
    },

    requiredTokens: {
      type: [String],
      default: []
    },

    preferredTokens: {
      type: [String],
      default: []
    },

    vector: {
      type: Map,
      of: Number,
      default: {}
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

export default mongoose.model("JobVector", jobVectorSchema);
