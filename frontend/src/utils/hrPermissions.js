export const getStoredHrRole = () =>
  localStorage.getItem("hrRole") || localStorage.getItem("role") || "";

export const canMutateCandidates = (role = "") =>
  ["Founder", "HR Manager", "Hiring Manager", "Recruiter"].includes(role);

export const canManageCandidateOffers = (role = "") =>
  ["Founder", "HR Manager", "Hiring Manager"].includes(role);

