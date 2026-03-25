const hasProtocol = (value = "") => /^https?:\/\//i.test(String(value).trim());

export const toAssetUrl = (baseUrl = "", value = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (hasProtocol(rawValue)) return rawValue;

  const normalizedPath = rawValue
    .replace(/\\/g, "/")
    .replace(/^\.?\/*/, "");

  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  return `${normalizedBase}/${normalizedPath}`;
};
