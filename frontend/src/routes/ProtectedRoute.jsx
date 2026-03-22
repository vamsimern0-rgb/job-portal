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

function ProtectedRoute({ children }) {
  const hrToken = localStorage.getItem("hrToken");

  if (!hrToken || hasExpiredToken(hrToken)) {
    localStorage.removeItem("hrToken");
    return <Navigate to="/hr/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
