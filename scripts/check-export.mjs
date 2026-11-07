import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const basePath = "/chuhai-station/";
const html = readFileSync("out/index.html", "utf8");
const tags = html.match(/<(?:script|link)\b[^>]*>/g) ?? [];
const resources = new Set(tags.flatMap(tag => {
  const match = tag.match(/(?:src|href)="([^"]+)"/);
  return match ? [match[1].replaceAll("&amp;", "&")] : [];
}));
assert(resources.size > 0, "No resources found in out/index.html");
for (const resource of resources) {
  assert(resource.startsWith(basePath), `Missing basePath: ${resource}`);
  const asset = path.join("out", decodeURIComponent(resource.split("?")[0].slice(basePath.length)));
  assert(existsSync(asset), `Missing exported file: ${asset}`);
}
console.log(`PASS: ${resources.size} HTML resources use ${basePath} and exist in out/.`);
