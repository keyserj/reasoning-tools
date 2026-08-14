---
name: add-ontology
description: Add a reasoning ontology to the playground as a new `src/ontology/<id>/`, or plan one's syntax, model or rendering. Use when asked to implement, port or design an ontology (Kialo, IBIS, an argument map, a causal map, Toulmin, …), or when a change reaches the shared contract in `src/ontology/types.ts` or the plumbing beside it.
---

# Adding an ontology

The expensive mistakes here are mistakes of order: deciding a word after writing code that uses it, or duplicating something you could have shared first. Steps 1-3 produce no code.

## 1. Plan syntax, model and rendering

Read `types.ts`, whatever sits directly in `src/ontology/` as shared plumbing, and then the _same file_ across the existing ontologies for each one you expect to write — all the `model.ts`s together, all the `parse.ts`s together. Write the plan down and agree it before any code.

**Syntax and parsing.** Which markers exist, how a line is read, and what is an error — said explicitly, since an input that "kind of" works and quietly does something else is worse than a rejection. Then: does reaching the model from the text need more than line-and-indent? References, folding, nodes implied rather than written — each is real logic, and belongs in the plan rather than being discovered in `parse.ts`.

**`model.ts`.** The closest modelling of the actual ontology, not a shape chosen because it will be convenient to draw: `RenderGraph` is what serves mermaid, and `toGraph.ts` is where the model gets projected onto it. A model that already looks like a render graph has usually thrown away something the ontology cares about.

**Rendering.** Which types are boxes and which are connectors, and what the legend says. Then the same question in the other direction: does deriving that from the model need real logic? It often does, and it's the interesting part — Kialo folds a claim used in several spots into one neutral box whose connectors carry the scores.

**Examples.** Which ids from `examples.ts` this ontology will ship, and what each will look like.

## 2. Settle the vocabulary

Apply AGENTS.md's vocabulary rule to every concept in the model, and write the result into `ontology.md` before the first line of `model.ts`. Code written against an undecided word drifts into one, and then every file that touched it has to be revised together.

## 3. Hoist before you implement

If something you're about to write already exists in another ontology, consider if it should be extracted and moved into `src/ontology/` first — output unchanged, its own commit — with yours using it. Doing this afterwards means the same extraction plus rewriting the ontology you just finished, and re-recording its snapshots.

## 4. Implement

Follow the file layout of an existing `src/ontology/<id>/`. Outside it, exactly two edits: one line in `registry.ts`, one bullet in the playground README's ontology list — plus `examples.ts` only for a genuinely new shared example. Nothing else needs touching, since `share/url.ts` builds its schema from your tables and `registry.test.ts` runs over every registered ontology. If you find yourself editing a component, stop: the missing piece belongs in the contract.

## 5. Sweep, then review

Adding an ontology changes the existing ones — a third writing of the same idea exposes what the earlier two settled for. Land refactors as their own commits.

Then read your diff against AGENTS.md's comments-and-docs rules, which a new ontology reliably breaks in two ways: a file more heavily commented than its sibling in another ontology, where the extra paragraph is `ontology.md` or `rendering.md` restated in prose; and words retired in step 2 surviving in legend prose, headers and test names.

Verify with the checks AGENTS.md's Workflow lists, plus reading the snapshot diff rather than trusting `vitest -u`, and a browser check of what tests can't reach — a reused node, a document with and without a header.
