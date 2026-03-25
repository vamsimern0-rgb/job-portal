import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";

import hrAuthRoutes from "./routes/hrAuthRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import atsRoutes from "./routes/atsRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import studentRoutes from "./routes/studentRoutes.js";
import interviewReminderScheduler from "./services/interviewReminderScheduler.js";
import Hr from "./models/Hr.js";
import Student from "./models/Student.js";
import { getUploadsDir } from "./utils/uploadPaths.js";

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://*.vercel.app"
];

const parseAllowedOrigins = () => {
  const rawOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGINS
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const configuredOrigins = rawOrigins.length > 0 ? rawOrigins : DEFAULT_DEV_ORIGINS;

  return configuredOrigins.map((origin) => {
    if (origin.includes("*")) {
      const escapedOrigin = origin
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");

      return new RegExp(`^${escapedOrigin}$`);
    }

    return origin;
  });
};

const allowedOrigins = parseAllowedOrigins();

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }

    return allowedOrigin === origin;
  });
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true
};


const app = express();
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */

export const io = new Server(server, {
  cors: corsOptions
});
app.set("io", io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return next();

    if (decoded.role === "HR") {
      const hr = await Hr.findById(decoded.id).select("_id companyId");
      if (hr) {
        socket.data.userType = "HR";
        socket.data.userId = hr._id;
        socket.data.companyId = hr.companyId || hr._id;
      }
    } else if (decoded.role === "Student") {
      const student = await Student.findById(decoded.id).select("_id");
      if (student) {
        socket.data.userType = "Student";
        socket.data.userId = student._id;
      }
    }

    return next();
  } catch (err) {
    return next();
  }
});

/* ================= MIDDLEWARE ================= */

// ✅ FIXED CORS HERE
app.use(
  cors(corsOptions)
);

app.use(express.json());
app.use("/uploads", express.static(getUploadsDir()));

/* ================= ROUTES ================= */

app.use("/api/hr", hrAuthRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/ats", atsRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/student", studentRoutes);


/* ================= DATABASE ================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

/* ================= SOCKET CONNECTION ================= */

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  socket.on("joinUser", (userId) => {
    if (userId) {
      const requestedUserId = userId.toString();
      const authUserId = socket.data?.userId?.toString();

      if (authUserId && authUserId !== requestedUserId) {
        return;
      }

      socket.join(requestedUserId);
      console.log(`User joined room: ${requestedUserId}`);
    }
  });

  socket.on("joinCompany", (companyId) => {
    if (companyId) {
      const requestedCompanyId = companyId.toString();
      const authCompanyId = socket.data?.companyId?.toString();

      if (authCompanyId && authCompanyId !== requestedCompanyId) {
        return;
      }

      socket.join(requestedCompanyId);
      console.log(`Company room joined: ${requestedCompanyId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket Disconnected:", socket.id);
  });
});

/* ================= SERVER START ================= */

const PORT = process.env.PORT || 5000;

interviewReminderScheduler.startInterviewReminderScheduler();

server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
