import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFilePath = path.resolve(__dirname, "../../frontend/src/App.jsx");
const appFile = fs.readFileSync(appFilePath, "utf8");

test("frontend HR alias routes exist", () => {
  assert.match(appFile, /path="\/hr"/);
  assert.match(appFile, /path="\/hr\/interviews"/);
  assert.match(appFile, /path="\/hr\/activity"/);
});
