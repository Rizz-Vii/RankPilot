import { classifyTask } from "../../scripts/brain/core/classification";
import type { Task } from "../../types/brain";

function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const t1: Task = {
  id: "1",
  title: "Update Firestore events",
  raw: "",
  domain: "",
  status: "TODO",
};
const t2: Task = {
  id: "2",
  title: "Add Observability doc",
  raw: "docs",
  domain: "",
  status: "TODO",
};
const t3: Task = {
  id: "3",
  title: "Nav React component",
  raw: "page.tsx",
  domain: "",
  status: "TODO",
};

expect(classifyTask(t1) === "backend", "t1 should be backend");
expect(classifyTask(t2) === "docs", "t2 should be docs");
expect(classifyTask(t3) === "frontend", "t3 should be frontend");

console.log("classification tests: PASS");
