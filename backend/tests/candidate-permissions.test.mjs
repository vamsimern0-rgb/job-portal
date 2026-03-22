import test from "node:test";
import assert from "node:assert/strict";
import {
  hasCandidateReadAccess,
  hasCandidateWriteAccess
} from "../controllers/candidateController.js";

const makeObjectIdLike = (value) => ({
  toString() {
    return value;
  }
});

test("viewer can read candidate data but cannot mutate candidates", () => {
  const viewer = {
    role: "Viewer",
    _id: makeObjectIdLike("viewer-1"),
    companyId: makeObjectIdLike("company-1")
  };
  const job = {
    createdBy: makeObjectIdLike("company-1"),
    assignedRecruiters: []
  };

  assert.equal(hasCandidateReadAccess(viewer, job), true);
  assert.equal(hasCandidateWriteAccess(viewer, job), false);
});

test("assigned recruiter retains candidate write access", () => {
  const recruiter = {
    role: "Recruiter",
    _id: makeObjectIdLike("recruiter-1")
  };
  const job = {
    createdBy: makeObjectIdLike("company-1"),
    assignedRecruiters: [makeObjectIdLike("recruiter-1")]
  };

  assert.equal(hasCandidateReadAccess(recruiter, job), true);
  assert.equal(hasCandidateWriteAccess(recruiter, job), true);
});

