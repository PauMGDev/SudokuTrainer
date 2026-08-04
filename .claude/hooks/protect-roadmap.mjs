#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const { tool_name, tool_input } = JSON.parse(readFileSync(0, "utf8"));
if (!["Edit", "Write", "MultiEdit"].includes(tool_name)) process.exit(0);
const file = tool_input.file_path ?? "";
if (!/ROADMAP\.md$/.test(file)) process.exit(0);

let head = "";
try { head = execSync("git show HEAD:ROADMAP.md", { encoding: "utf8" }); }
catch { process.exit(0); } // sin versión en HEAD, nada que proteger

const checked = (t) => new Set([...t.matchAll(/- \[x\] (\S+)/gi)].map((m) => m[1]));

let proposed;
if (tool_name === "Write") {
  proposed = tool_input.content ?? "";
} else {
  let current = readFileSync(file, "utf8");
  const edits = tool_name === "Edit"
    ? [tool_input]
    : (tool_input.edits ?? []);
  for (const e of edits) {
    current = e.replace_all
      ? current.split(e.old_string).join(e.new_string ?? "")
      : current.replace(e.old_string, e.new_string ?? "");
  }
  proposed = current;
}

const after = checked(proposed);
const lost = [...checked(head)].filter((id) => !after.has(id));
if (lost.length) {
  console.error(
    `BLOQUEADO: esta edición desmarcaría pasos cerrados en HEAD: ${lost.join(", ")}. ` +
    `Los pasos completados no se reabren desde ROADMAP.md. Conserva sus [x] y reintenta la edición.`
  );
  process.exit(2);
}
process.exit(0);