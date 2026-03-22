import Hr from "../models/Hr.js";

const ALLOWED_TEAM_ROLES = ["HR Manager", "Recruiter", "Hiring Manager", "Viewer"];

/* =========================================
   GET COMPANY TEAM
========================================= */
export const getTeamMembers = async (req, res) => {
  try {

    const companyOwner =
      req.user.role === "Founder"
        ? req.user._id
        : req.user.companyId;

    if (!companyOwner) {
      return res.status(400).json({ message: "Company not found" });
    }

    const members = await Hr.find({
      $or: [
        { _id: companyOwner }, // include founder
        { companyId: companyOwner }
      ]
    }).select("-password");

    res.json(members);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* =========================================
   CHANGE MEMBER ROLE (Founder Only)
========================================= */
export const changeMemberRole = async (req, res) => {
  try {

    if (req.user.role !== "Founder") {
      return res.status(403).json({
        message: "Only Founder can change roles"
      });
    }

    const { role } = req.body;
    if (!ALLOWED_TEAM_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (req.params.id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const member = await Hr.findOne({
      _id: req.params.id,
      companyId: req.user._id
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (member.role === "Founder") {
      return res.status(400).json({ message: "Founder role cannot be modified" });
    }

    member.role = role;
    await member.save();

    res.json({
      message: "Role updated successfully",
      member
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* =========================================
   REMOVE TEAM MEMBER (Founder Only)
========================================= */
export const removeTeamMember = async (req, res) => {
  try {

    if (req.user.role !== "Founder") {
      return res.status(403).json({
        message: "Only Founder can remove members"
      });
    }

    if (req.params.id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot remove your own account" });
    }

    const existingMember = await Hr.findById(req.params.id).select("role companyId");
    if (!existingMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (existingMember.role === "Founder") {
      return res.status(400).json({ message: "Founder account cannot be removed" });
    }

    const member = await Hr.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user._id
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({
      message: "Team member removed successfully"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
