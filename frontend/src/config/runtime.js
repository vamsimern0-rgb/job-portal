const getWindowOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const warnMissingRuntimeUrl = (key, fallback) => {
  if (typeof window === "undefined") return;
  if (isLocalHost()) return;

  console.warn(
    `[runtime] Missing ${key}. Falling back to ${fallback}. ` +
      "Set your Vercel environment variables to your deployed backend URL."
  );
};

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

  const fallback = `${getWindowOrigin()}/api`;
  warnMissingRuntimeUrl("VITE_API_BASE_URL", fallback);
  return fallback;
};

export const getSocketUrl = () => {
  const configuredUrl = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (isLocalHost()) {
    return "http://localhost:5000";
  }

  const fallback = getWindowOrigin();
  warnMissingRuntimeUrl("VITE_SOCKET_URL", fallback);
  return fallback;
};

export const getAssetBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_ASSET_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (isLocalHost()) {
    return "http://localhost:5000/";
  }

  const fallback = `${getWindowOrigin()}/`;
  warnMissingRuntimeUrl("VITE_ASSET_BASE_URL", fallback);
  return fallback;
};
