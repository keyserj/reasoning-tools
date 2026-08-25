// Turn an example into the views bundle the wireframes paste in.
//
// Refuses to write anything a document's own errors would make meaningless, so a broken example
// can't quietly produce a plausible-looking bundle.

import { readFileSync, writeFileSync } from "node:fs";
import { buildBundle } from "./bundle.ts";
import { findTopic } from "./model.ts";
import { parse } from "./parse.ts";

function main(argv: string[]): number {
  const [source] = argv;
  if (!source) {
    console.error("usage: node scripts/generate.ts <example.txt> [out.json]");
    return 2;
  }
  const out = argv[1] ?? source.replace(/\.txt$/, ".views.json");
  if (out === source) {
    console.error(`${source}: that would overwrite the example - name an output path`);
    return 2;
  }

  let text: string;
  try {
    text = readFileSync(source, "utf8");
  } catch {
    console.error(`${source}: can't be read`);
    return 2;
  }

  const { doc, errors, warnings } = parse(text);
  for (const warning of warnings) console.warn(`${source}:${warning.line}: ${warning.message}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`${source}:${error.line}: ${error.message}`);
    return 1;
  }

  // Legal to parse, but every view is ranked by distance from the topic, so without one the
  // bundle would come out empty rather than wrong - which reads as a bug in the views.
  if (!findTopic(doc)) {
    console.error(`${source}: no #topic concept - nothing to measure the views against`);
    return 1;
  }

  writeFileSync(out, `${JSON.stringify(buildBundle(doc), null, 2)}\n`);
  console.log(`${out}: ${doc.nodes.length} nodes, ${doc.edges.length} edges`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
