import Hr from "../models/Hr.js";

export const getProfile = async (req, res) => {
  const hr = await Hr.findById(req.user.id).select("-password");
  res.json(hr);
};

export const updateProfile = async (req, res) => {
  const hr = await Hr.findByIdAndUpdate(
    req.user.id,
    req.body,
    { new: true }
  ).select("-password");

  res.json(hr);
};
