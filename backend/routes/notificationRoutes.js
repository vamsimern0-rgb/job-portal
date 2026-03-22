import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* GET USER NOTIFICATIONS */
router.get("/", protect, async (req, res) => {
  try {
    const {
      page,
      limit,
      unreadOnly = "false"
    } = req.query;

    const filter = {
      recipient: req.user._id,
      $or: [
        { recipientType: "HR" },
        { recipientType: { $exists: false } }
      ]
    };

    if (unreadOnly === "true") {
      filter.read = false;
    }

    const shouldPaginate = page !== undefined || limit !== undefined;
    const numericLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const numericPage = Math.max(Number(page) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    let query = Notification.find(filter).sort({ createdAt: -1 });
    if (shouldPaginate) {
      query = query.skip(skip).limit(numericLimit);
    }

    const notifications = await query;

    if (shouldPaginate) {
      const [total, unreadCount] = await Promise.all([
        Notification.countDocuments(filter),
        Notification.countDocuments({
          recipient: req.user._id,
          $or: [
            { recipientType: "HR" },
            { recipientType: { $exists: false } }
          ],
          read: false
        })
      ]);

      return res.json({
        items: notifications,
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.max(Math.ceil(total / numericLimit), 1),
        unreadCount
      });
    }

    return res.json(notifications);
  } catch (err) {
    console.error("HR notifications fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/* MARK AS READ */
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: "Not found" });
    }

    notification.read = true;
    await notification.save();

    return res.json(notification);
  } catch (err) {
    console.error("HR notification read update error:", err);
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

/* MARK ALL AS READ */
router.put("/read-all", protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        $or: [
          { recipientType: "HR" },
          { recipientType: { $exists: false } }
        ],
        read: false
      },
      { $set: { read: true } }
    );

    return res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount || 0
    });
  } catch (err) {
    console.error("HR read-all notifications error:", err);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

export default router;
