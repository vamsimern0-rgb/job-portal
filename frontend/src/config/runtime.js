const getWindowOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const isLocalHost = () => {
  if (typeof window === "undefined") return false;

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
};

export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (isLocalHost()) {
    return "http://localhost:5000/api";
  }

  return `${getWindowOrigin()}/api`;
};

export const getSocketUrl = () => {
  const configuredUrl = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (isLocalHost()) {
    return "http://localhost:5000";
  }

  return getWindowOrigin();
};

export const getAssetBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_ASSET_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (isLocalHost()) {
    return "http://localhost:5000/";
  }

  return `${getWindowOrigin()}/`;
};
