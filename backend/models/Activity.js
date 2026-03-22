import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    hrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hr",
      required: true
    },
    type: {
      type: String,
      required: true
    },
    message: String,
    relatedId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
