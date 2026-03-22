import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainFilePath = path.resolve(__dirname, "../../frontend/src/main.jsx");
const landingFilePath = path.resolve(__dirname, "../../frontend/src/pages/Landing.jsx");
const appCssPath = path.resolve(__dirname, "../../frontend/src/App.css");

const mainFile = fs.readFileSync(mainFilePath, "utf8");
const landingFile = fs.readFileSync(landingFilePath, "utf8");

test("frontend uses Tailwind entry css without legacy App.css import", () => {
  assert.match(mainFile, /import '\.\/index\.css'/);
  assert.doesNotMatch(mainFile, /App\.css/);
  assert.equal(fs.existsSync(appCssPath), false);
});

test("landing page no longer injects component-level style tags", () => {
  assert.doesNotMatch(landingFile, /<style>/);
});

