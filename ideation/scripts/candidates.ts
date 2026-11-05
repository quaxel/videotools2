// CLI for the /ideate skill. Works with or without the dev server running (SQLite WAL).
//   npx tsx scripts/candidates.ts catalog            -> JSON: channel scope, rubric, made videos, all ideas
//   npx tsx scripts/candidates.ts add <file.json> [--scores <scores.json>]
//        -> insert candidates, print scores / duplicates / errors. With --scores, the scorer's entries
//           ({titleEn, rubric, dupes, rubricSummary}) are merged into the drafts by titleEn first.
//   npx tsx scripts/candidates.ts pending            -> the triage queue, best first
import { readFileSync } from "node:fs";
import { Store } from "../server/store.ts";
import { catalog, addCandidates, mergeScores } from "../server/factory.ts";

const [cmd, arg, flag, scoresFile] = process.argv.slice(2);
const store = new Store();
try {
  if (cmd === "catalog") {
    console.log(JSON.stringify(catalog(store), null, 2));
  } else if (cmd === "add" && arg) {
    let items = JSON.parse(readFileSync(arg, "utf8"));
    if (flag === "--scores" && scoresFile)
      items = mergeScores(items, JSON.parse(readFileSync(scoresFile, "utf8")));
    const r = addCandidates(store, items);
    for (const a of r.added)
      console.log(
        `${String(a.score).padStart(3)}  ${a.eligible ? "   " : "GATE"}  ${a.dupes ? "DUP" : "   "}  ${a.title}`,
      );
    for (const e of r.errors) console.log(`ERROR #${e.index} ${e.title}: ${e.error}`);
    console.log(`batch ${r.batch}: ${r.added.length} added, ${r.errors.length} errors`);
    if (r.errors.length) process.exitCode = 1;
  } else if (cmd === "pending") {
    const list = store
      .getIdeas()
      .filter((i) => i.triage === "pending" && !i.deleted)
      .sort((a, b) => (b.rubricScore ?? 0) - (a.rubricScore ?? 0));
    for (const i of list)
      console.log(
        `${String(i.rubricScore ?? "-").padStart(3)}  ${i.dupes.length ? "DUP" : "   "}  ${i.title}  (${i.titleEn})`,
      );
  } else {
    console.error("usage: candidates.ts catalog | add <file.json> | pending");
    process.exitCode = 2;
  }
} finally {
  store.close();
}
