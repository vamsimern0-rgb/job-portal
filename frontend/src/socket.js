import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  withCredentials: true,
  auth: (cb) => {
    cb({
      token: localStorage.getItem("hrToken") || localStorage.getItem("studentToken") || ""
    });
  }
});

export default socket;
