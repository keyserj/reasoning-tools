import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { z } from "zod";
import {
  type FeatureState,
  LAYOUT_DIRECTIONS,
  type Ontology,
  type StyleConfig,
} from "../ontology/types.ts";
import { defaultOntologyId, ontologies } from "../ontology/registry.ts";
import { defaultExample, findExample } from "../ontology/examples.ts";
import { defaultFeatureState, resolveFeatures } from "../ontology/features.ts";

// The whole document lives in the URL hash so sharing needs no backend. We DEFLATE
// the JSON (fflate) then base64url-encode it, mirroring how mermaid.live keeps links short.
//
// A hash is untrusted input that ends up inside generated mermaid source, so it is
// validated on the way in. Every field carries a default, which is what keeps old and
// partial links working: anything missing or malformed degrades to the ontology's
// default rather than rejecting the document.

/** The shared document: the app's state and the thing encoded into the hash are the same. */
export interface ShareState {
  ontologyId: string;
  /** which shared example the source came from; `null` once it's someone's own document */
  exampleId: string | null;
  source: string;
  config: StyleConfig;
  features: FeatureState;
}

/** Exactly what `<input type="color">` produces, which is the only writer of these. */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/**
 * Ontology-independent outer shape; `config` and `features` are checked once the ontology is
 * known. `exampleId` and `features` are absent from links written before they existed, which
 * is why they carry defaults rather than being required.
 */
const envelopeSchema = z.object({
  ontologyId: z.string(),
  exampleId: z.string().nullish().catch(null),
  source: z.string(),
  // `.optional()` because zod treats an `unknown` key as required-but-any: without it, a
  // hash missing the key is rejected outright rather than falling back.
  config: z.unknown().optional(),
  features: z.unknown().optional(),
});

/**
 * Built per ontology, since the valid node-type keys come from its own table. Unknown
 * keys are dropped by zod; known-but-malformed ones fall back to that type's default.
 */
const configSchema = (ontology: Ontology) =>
  z.object({
    direction: z.enum(LAYOUT_DIRECTIONS).catch(ontology.defaultConfig.direction),
    showIcons: z.boolean().catch(ontology.defaultConfig.showIcons),
    typeColors: z
      .object(
        Object.fromEntries(
          ontology.renderedNodeTypes.map((t) => [t.id, hexColor.catch(t.defaultColor)]),
        ),
      )
      .catch(ontology.defaultConfig.typeColors),
  });

/**
 * Same idea as {@link configSchema}, one level deeper: the valid feature ids, option ids and
 * param ids all come from the ontology's own table, so a link naming a feature that has since
 * been renamed or removed degrades to the current defaults instead of reaching a renderer.
 */
const featuresSchema = (ontology: Ontology) =>
  z
    .object(
      Object.fromEntries(
        ontology.features.map((feature) => {
          const optionIds = feature.options.map((o) => o.id) as [string, ...string[]];
          const params = feature.params ?? [];
          return [
            feature.id,
            z
              .object({
                option: z.enum(optionIds).catch(feature.defaultOption),
                params: z
                  .object(
                    Object.fromEntries(
                      params.map((param) => [
                        param.id,
                        z
                          .enum(param.options.map((o) => o.id) as [string, ...string[]])
                          .catch(param.defaultOption),
                      ]),
                    ),
                  )
                  .optional(),
              })
              .catch({ option: feature.defaultOption }),
          ];
        }),
      ),
    )
    .catch({});

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeState(state: ShareState): string {
  const json = JSON.stringify(state);
  const deflated = deflateSync(strToU8(json));
  return bytesToBase64Url(deflated);
}

/**
 * Decode a hash into a valid document, or null if there is nothing decodable there.
 * A link naming an unknown ontology falls back to the default ontology's own first example:
 * reinterpreting one ontology's syntax as another's would only produce a wall of parse errors.
 */
export function decodeState(encoded: string): ShareState | null {
  let raw: unknown;
  try {
    const trimmed = encoded.replace(/^#/, "");
    if (!trimmed) return null;
    raw = JSON.parse(strFromU8(inflateSync(base64UrlToBytes(trimmed))));
  } catch {
    return null;
  }

  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return null;

  const known = ontologies[envelope.data.ontologyId];
  const ontology = known ?? ontologies[defaultOntologyId];
  const fallback = defaultExample(ontology);
  const source = known ? envelope.data.source : fallback.source;

  const config = configSchema(ontology).safeParse(envelope.data.config);
  const features = featuresSchema(ontology).safeParse(envelope.data.features);

  // An id this ontology doesn't ship (a renamed example, one dropped from this ontology but
  // kept in the shared table, or a link written before the examples were shared) reads as
  // "Custom": the source still opens, it just isn't claimed to be a known example. Checking
  // the ontology's own examples rather than the shared table is what keeps the claim honest —
  // an unshipped id has no `<option>` to select, and leaves the document permanently
  // un-dirty, so edits to it would never be stashed as a draft.
  const claimed = envelope.data.exampleId;
  const shipped = typeof claimed === "string" && findExample(ontology, claimed) !== undefined;

  return {
    ontologyId: ontology.id,
    exampleId: known ? (shipped ? claimed : null) : fallback.id,
    source,
    config: config.success ? config.data : structuredClone(ontology.defaultConfig),
    features: features.success
      ? resolveFeatures(ontology, features.data as FeatureState)
      : defaultFeatureState(ontology),
  };
}

export function buildShareUrl(state: ShareState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${encodeState(state)}`;
}
