import { io } from "socket.io-client";
import { getSocketUrl } from "./config/runtime";

const SOCKET_URL = getSocketUrl();

const socket = io(SOCKET_URL, {
  withCredentials: true,
  auth: (cb) => {
    cb({
      token: localStorage.getItem("hrToken") || localStorage.getItem("studentToken") || ""
    });
  }
});

export default socket;
