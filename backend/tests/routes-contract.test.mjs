import test from "node:test";
import assert from "node:assert/strict";
import candidateRoutes from "../routes/candidateRoutes.js";
import studentRoutes from "../routes/studentRoutes.js";

const listRoutes = (router) => {
  const signatures = [];

  for (const layer of router.stack || []) {
    if (!layer.route) continue;

    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods || {})
      .filter((method) => layer.route.methods[method])
      .map((method) => method.toUpperCase());

    methods.forEach((method) => signatures.push(`${method} ${path}`));
  }

  return signatures;
};

test("candidate routes expose offer endpoints", () => {
  const routes = listRoutes(candidateRoutes);

  assert.ok(routes.includes("PUT /:id/send-offer"));
  assert.ok(routes.includes("PUT /:id/withdraw-offer"));
});

test("student routes expose offer response endpoint", () => {
  const routes = listRoutes(studentRoutes);

  assert.ok(routes.includes("PUT /applications/:id/offer-response"));
});
