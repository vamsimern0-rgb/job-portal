import mongoose from "mongoose";

/*
=========================================================
STUDENT SKILL VECTOR
- Precomputed TF-IDF vectors
- Fast similarity comparisons
=========================================================
*/

const studentSkillVectorSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
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
  }
);

export default mongoose.model(
  "StudentSkillVector",
  studentSkillVectorSchema
);
