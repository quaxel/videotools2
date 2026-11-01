import { Store } from "../server/store.ts";
import { importResearch } from "../server/importer.ts";
const store = new Store();
try {
  console.log(importResearch(store));
} finally {
  store.close();
}
