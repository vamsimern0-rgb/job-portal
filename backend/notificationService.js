import Notification from "./models/Notification.js";
import Hr from "./models/Hr.js";
import { io } from "./server.js";

export const sendNotification = async (companyId, text, roleTarget = "All") => {
  try {
    let users;

    if (roleTarget === "All") {
      users = await Hr.find({
        $or: [{ _id: companyId }, { companyId }]
      });
    } else {
      users = await Hr.find({
        role: roleTarget,
        $or: [{ _id: companyId }, { companyId }]
      });
    }

    for (let user of users) {
      const notification = await Notification.create({
        companyId,
        recipient: user._id,
        recipientType: "HR",
        text,
        roleTarget,
        channel: "InApp"
      });

      io.to(user._id.toString()).emit("newNotification", notification);
    }

  } catch (err) {
    console.error("Notification error:", err.message);
  }
};
