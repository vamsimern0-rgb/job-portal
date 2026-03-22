import Activity from "../models/Activity.js";

/*
=========================================================
UNIVERSAL ACTIVITY LOGGER
- Supports HR
- Supports Student
=========================================================
*/

export const logActivity = async ({
  userId,
  role,
  type,
  message,
  relatedId = null
}) => {
  try {
    await Activity.create({
      userId,
      role,
      type,
      message,
      relatedId
    });
  } catch (err) {
    console.log("Activity log error:", err);
  }
};