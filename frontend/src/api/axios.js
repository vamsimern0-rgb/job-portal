import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

const HR_ROUTE_PREFIXES = [
  "/hr",
  "/jobs",
  "/team",
  "/notifications",
  "/candidates",
  "/ats"
];

const STUDENT_ROUTE_PREFIXES = ["/student"];

const startsWithAny = (url, prefixes) =>
  prefixes.some((prefix) => url.startsWith(prefix));

/* ================= REQUEST INTERCEPTOR ================= */

api.interceptors.request.use((config) => {

  const hrToken = localStorage.getItem("hrToken");
  const studentToken = localStorage.getItem("studentToken");
  const requestUrl = config.url || "";
  const isHrRequest = startsWithAny(requestUrl, HR_ROUTE_PREFIXES);
  const isStudentRequest = startsWithAny(requestUrl, STUDENT_ROUTE_PREFIXES);
  config.headers = config.headers || {};

  /* STUDENT APIs */
  if (isStudentRequest && studentToken) {
    config.headers.Authorization = `Bearer ${studentToken}`;
  } else if (isHrRequest && hrToken) {
    /* HR APIs */
    config.headers.Authorization = `Bearer ${hrToken}`;
  }

  return config;

});


/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(

  (response) => response,

  (error) => {

    if (error.response) {

      const status = error.response.status;
      const requestUrl = error.config?.url || "";
      const isHrRequest = startsWithAny(requestUrl, HR_ROUTE_PREFIXES);
      const isStudentRequest = startsWithAny(requestUrl, STUDENT_ROUTE_PREFIXES);
      const isAuthError = status === 401 || status === 403;
      const authHeader =
        error.config?.headers?.Authorization ||
        error.config?.headers?.authorization;
      const hadAuthHeader = Boolean(authHeader);

      /* ================= HR TOKEN EXPIRED OR INVALID ================= */

      if (isAuthError && isHrRequest && hadAuthHeader) {

        localStorage.removeItem("hrToken");

        window.location.href = "/hr/login";

      }

      /* ================= STUDENT TOKEN EXPIRED OR INVALID ================= */

      if (isAuthError && isStudentRequest && hadAuthHeader) {

        localStorage.removeItem("studentToken");

        window.location.href = "/student/login";

      }

    }

    return Promise.reject(error);

  }

);

export default api;
