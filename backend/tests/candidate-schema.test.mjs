import test from "node:test";
import assert from "node:assert/strict";
import Candidate from "../models/Candidate.js";

test("candidate schema includes offer lifecycle fields", () => {
  assert.ok(Candidate.schema.path("offer.status"));
  assert.ok(Candidate.schema.path("offer.offeredAt"));
  assert.ok(Candidate.schema.path("offer.respondedAt"));
  assert.ok(Candidate.schema.path("offer.joiningDate"));
  assert.ok(Candidate.schema.path("offer.salaryOffered"));
  assert.ok(Candidate.schema.path("offer.letterUrl"));
  assert.ok(Candidate.schema.path("offer.notes"));
  assert.ok(Candidate.schema.path("offer.responseNote"));
  assert.ok(Candidate.schema.path("offer.offeredBy"));
});

test("offer status enum keeps expected states", () => {
  const statusPath = Candidate.schema.path("offer.status");
  const enumValues = statusPath?.options?.enum || [];

  assert.deepEqual(enumValues, ["NotSent", "Sent", "Accepted", "Declined", "Withdrawn"]);
});
