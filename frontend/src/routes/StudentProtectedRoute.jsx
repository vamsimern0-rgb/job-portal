import { Navigate } from "react-router-dom";

const hasExpiredToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= new Date().getTime();
  } catch {
    return true;
  }
};

function StudentProtectedRoute({ children }) {
  const studentToken = localStorage.getItem("studentToken");

  if (!studentToken || hasExpiredToken(studentToken)) {
    localStorage.removeItem("studentToken");
    return <Navigate to="/student/login" replace />;
  }

  return children;
}

export default StudentProtectedRoute;
